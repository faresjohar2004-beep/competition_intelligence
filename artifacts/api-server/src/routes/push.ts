import { Router } from "express";
import webpush from "web-push";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { db, pushSubscriptionsTable, pushTokensTable, usersTable, actionsTable, missionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { logger } from "../lib/logger";
import { generateDailyMissions } from "../lib/ai";
import { localHour, localDateStr } from "../lib/dateUtils";

const expo = new Expo();

const router = Router();

// In-memory queue of pending Expo receipt IDs → token mapping.
// Populated by sendExpoPushReminders(); drained by checkExpoPushReceipts().
// Best-effort: restarting the server drops unprocessed IDs, which is acceptable
// since the tokens will be caught on the next send cycle.
const pendingReceiptIds = new Map<string, string>(); // receiptId → push token

const VAPID_PUBLIC_KEY  = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_SUBJECT     = process.env.VAPID_SUBJECT ?? "mailto:hello@astraos.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// POST /api/push/subscribe
router.post("/subscribe", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { endpoint, p256dh, auth } = req.body;
  if (!endpoint || !p256dh || !auth) {
    res.status(400).json({ error: "Missing subscription fields" });
    return;
  }
  await db
    .insert(pushSubscriptionsTable)
    .values({ userId: user.id, endpoint, p256dh, auth })
    .onConflictDoUpdate({
      target: pushSubscriptionsTable.endpoint,
      set: { p256dh, auth },
    });
  res.json({ ok: true });
});

// DELETE /api/push/unsubscribe
router.delete("/unsubscribe", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { endpoint } = req.body;
  if (endpoint) {
    await db
      .delete(pushSubscriptionsTable)
      .where(
        sql`${pushSubscriptionsTable.userId} = ${user.id} AND ${pushSubscriptionsTable.endpoint} = ${endpoint}`,
      );
  }
  res.json({ ok: true });
});

// ─── Cron-callable: send 7pm LOCAL-TIME reminders ────────────────────────────
// Called every hour. Each run only sends to users whose local clock reads 7PM
// and who haven't logged an action yet today (in their local timezone).
// Sends both web-push (VAPID) and Expo push (mobile) notifications.
export async function sendDailyReminders() {
  await Promise.all([
    sendWebPushReminders(),
    sendExpoPushReminders(),
  ]);
}

async function sendWebPushReminders() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn("VAPID keys not configured — skipping web push reminders");
    return;
  }

  const subs = await db
    .select({
      userId: pushSubscriptionsTable.userId,
      endpoint: pushSubscriptionsTable.endpoint,
      p256dh: pushSubscriptionsTable.p256dh,
      auth: pushSubscriptionsTable.auth,
      streakDays: usersTable.streakDays,
      lastActiveDate: usersTable.lastActiveDate,
      name: usersTable.name,
      timezone: usersTable.timezone,
    })
    .from(pushSubscriptionsTable)
    .innerJoin(usersTable, eq(pushSubscriptionsTable.userId, usersTable.id));

  // Only send to users whose local time is 7PM (hour 19) and who haven't logged today
  const targets = subs.filter((s) => {
    const hour = localHour(s.timezone);
    const todayLocal = localDateStr(s.timezone);
    return hour === 19 && s.lastActiveDate !== todayLocal;
  });

  logger.info({ total: subs.length, sending: targets.length }, "Timezone-aware web push: 7pm local cohort");

  for (const sub of targets) {
    const firstName = sub.name?.split(" ")[0] ?? "Hey";
    const streakLine =
      sub.streakDays > 0
        ? `Your ${sub.streakDays}-day streak ends at midnight.`
        : "Today is a great day to start your streak.";

    const payload = JSON.stringify({
      title: `${firstName} — one action left today`,
      body: `${streakLine} Log one action now to keep building.`,
      url: "/dashboard",
    });

    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
    } catch (err: any) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        // Subscription expired — clean up
        await db
          .delete(pushSubscriptionsTable)
          .where(eq(pushSubscriptionsTable.endpoint, sub.endpoint));
      } else {
        logger.error({ err, endpoint: sub.endpoint }, "Web push send failed");
      }
    }
  }
}

async function sendExpoPushReminders() {
  const tokens = await db
    .select({
      userId: pushTokensTable.userId,
      token: pushTokensTable.token,
      streakDays: usersTable.streakDays,
      lastActiveDate: usersTable.lastActiveDate,
      name: usersTable.name,
      timezone: usersTable.timezone,
    })
    .from(pushTokensTable)
    .innerJoin(usersTable, eq(pushTokensTable.userId, usersTable.id));

  // Only send to users whose local time is 7PM (hour 19) and who haven't logged today
  const targets = tokens.filter((t) => {
    const hour = localHour(t.timezone);
    const todayLocal = localDateStr(t.timezone);
    return hour === 19 && t.lastActiveDate !== todayLocal;
  });

  logger.info({ total: tokens.length, sending: targets.length }, "Timezone-aware Expo push: 7pm local cohort");

  if (targets.length === 0) return;

  const messages: ExpoPushMessage[] = targets
    .filter((t) => Expo.isExpoPushToken(t.token))
    .map((t) => {
      const firstName = t.name?.split(" ")[0] ?? "Hey";
      const streakLine =
        t.streakDays > 0
          ? `Your ${t.streakDays}-day streak ends at midnight.`
          : "Today is a great day to start your streak.";

      return {
        to: t.token,
        sound: "default" as const,
        title: `${firstName} — one action left today`,
        body: streakLine,
        data: { url: "/dashboard" },
      };
    });

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    try {
      const tickets = await expo.sendPushNotificationsAsync(chunk);

      for (let i = 0; i < tickets.length; i++) {
        const ticket = tickets[i];
        const token = chunk[i].to as string;

        if (ticket.status === "error") {
          // Immediate send-time error (e.g. malformed token)
          logger.warn({ token, details: ticket.details }, "Expo push ticket error (send-time)");

          if (ticket.details?.error === "DeviceNotRegistered") {
            await db
              .delete(pushTokensTable)
              .where(eq(pushTokensTable.token, token));
            logger.info({ token }, "Deleted stale Expo token (send-time DeviceNotRegistered)");
          }
        } else if (ticket.id) {
          // Queue the receipt ID for the async receipt check
          pendingReceiptIds.set(ticket.id, token);
        }
      }
    } catch (err) {
      logger.error({ err }, "Expo push chunk send failed");
    }
  }

  logger.info({ queued: pendingReceiptIds.size }, "Expo push tickets queued for receipt check");
}

// ─── Cron-callable: fetch Expo push receipts and prune stale tokens ───────────
// Expo's receipt API is asynchronous — tickets from sendPushNotificationsAsync
// must be exchanged for receipts via getPushNotificationReceiptsAsync ~30 min
// after the initial send. This is where DeviceNotRegistered reliably appears.
export async function checkExpoPushReceipts() {
  if (pendingReceiptIds.size === 0) {
    logger.info("No pending Expo receipt IDs to check");
    return;
  }

  const ids = Array.from(pendingReceiptIds.keys());
  logger.info({ count: ids.length }, "Checking Expo push receipts");

  const receiptIdChunks = expo.chunkPushNotificationReceiptIds(ids);

  for (const chunk of receiptIdChunks) {
    try {
      const receipts = await expo.getPushNotificationReceiptsAsync(chunk);

      for (const [receiptId, receipt] of Object.entries(receipts)) {
        const token = pendingReceiptIds.get(receiptId);

        // Always remove from the queue regardless of outcome
        pendingReceiptIds.delete(receiptId);

        if (!token) continue;

        if (receipt.status === "error") {
          logger.warn({ token, receiptId, details: receipt.details }, "Expo push receipt error (async)");

          if (receipt.details?.error === "DeviceNotRegistered") {
            await db
              .delete(pushTokensTable)
              .where(eq(pushTokensTable.token, token));
            logger.info({ token }, "Deleted stale Expo token (async DeviceNotRegistered)");
          }
        }
      }

      // Any receipt IDs in the chunk that Expo didn't return a receipt for yet
      // stay in pendingReceiptIds for the next check cycle.
    } catch (err) {
      logger.error({ err }, "Expo push receipt fetch failed");
    }
  }

  logger.info({ remaining: pendingReceiptIds.size }, "Expo receipt check complete");
}

// ─── Cron-callable: pre-generate tomorrow's missions for active users ─────────
// Runs at 8pm UTC so missions are ready before midnight — eliminates cold-start
export async function preGenerateTomorrowMissions() {
  const tomorrowStr = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString().split("T")[0];

  const activeUsers = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      streakDays: usersTable.streakDays,
    })
    .from(usersTable)
    .where(sql`${usersTable.lastActiveDate} >= ${threeDaysAgo}`);

  logger.info({ count: activeUsers.length, date: tomorrowStr }, "Pre-generating tomorrow's missions");

  for (const user of activeUsers) {
    // Skip if already generated
    const [existing] = await db
      .select({ id: missionsTable.id })
      .from(missionsTable)
      .where(sql`${missionsTable.userId} = ${user.id} AND ${missionsTable.date} = ${tomorrowStr}`);

    if (existing) continue;

    // Gather recent action context
    const recentActions = await db
      .select({ type: actionsTable.type })
      .from(actionsTable)
      .where(sql`${actionsTable.userId} = ${user.id} AND ${actionsTable.completedAt} > NOW() - INTERVAL '7 days'`)
      .limit(20);

    const actionTypes = recentActions.map((a) => a.type);

    try {
      const missions = await generateDailyMissions(user.name, actionTypes, user.streakDays);

      await db.insert(missionsTable).values({
        userId: user.id,
        date: tomorrowStr,
        criticalMission: missions.critical,
        secondaryMission1: missions.secondary[0],
        secondaryMission2: missions.secondary[1],
        secondaryMission3: missions.secondary[2],
        courageChallenge: missions.courage,
      });

      logger.info({ userId: user.id }, "Pre-generated tomorrow's missions");
    } catch (err) {
      logger.error({ err, userId: user.id }, "Failed to pre-generate missions for user");
    }

    // Stagger requests to avoid OpenAI rate limits
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

export default router;
