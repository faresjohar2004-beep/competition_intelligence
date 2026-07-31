import { Router } from "express";
import webpush from "web-push";
import { db, pushSubscriptionsTable, usersTable, actionsTable, missionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { logger } from "../lib/logger";
import { generateDailyMissions } from "../lib/ai";

const router = Router();

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Return the user's current local hour (0-23) given an IANA timezone string.
 *  Falls back to "America/New_York" for existing users without a stored timezone. */
function localHour(timezone: string | null): number {
  const tz = timezone || "America/New_York";
  try {
    return parseInt(
      new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()),
      10,
    );
  } catch {
    // Unknown timezone string — fall back to UTC
    return new Date().getUTCHours();
  }
}

/** Return today's date string (YYYY-MM-DD) in the user's local timezone. */
function localDateStr(timezone: string | null): string {
  const tz = timezone || "America/New_York";
  try {
    // toLocaleDateString with "en-CA" locale returns YYYY-MM-DD
    return new Date().toLocaleDateString("en-CA", { timeZone: tz });
  } catch {
    return new Date().toISOString().split("T")[0];
  }
}

// ─── Cron-callable: send 7pm LOCAL-TIME reminders ────────────────────────────
// Called every hour. Each run only sends to users whose local clock reads 7PM
// and who haven't logged an action yet today (in their local timezone).
export async function sendDailyReminders() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn("VAPID keys not configured — skipping push reminders");
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

  logger.info({ total: subs.length, sending: targets.length }, "Timezone-aware push: 7pm local cohort");

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
        logger.error({ err, endpoint: sub.endpoint }, "Push send failed");
      }
    }
  }
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
