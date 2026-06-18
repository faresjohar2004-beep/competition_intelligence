import { Router } from "express";
import webpush from "web-push";
import { db, pushSubscriptionsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { logger } from "../lib/logger";

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

// ─── Cron-callable: send 8pm reminders to users who haven't logged today ─────
export async function sendDailyReminders() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn("VAPID keys not configured — skipping push reminders");
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];

  const subs = await db
    .select({
      userId: pushSubscriptionsTable.userId,
      endpoint: pushSubscriptionsTable.endpoint,
      p256dh: pushSubscriptionsTable.p256dh,
      auth: pushSubscriptionsTable.auth,
      streakDays: usersTable.streakDays,
      lastActiveDate: usersTable.lastActiveDate,
      name: usersTable.name,
    })
    .from(pushSubscriptionsTable)
    .innerJoin(usersTable, eq(pushSubscriptionsTable.userId, usersTable.id));

  const inactive = subs.filter((s) => s.lastActiveDate !== todayStr);
  logger.info({ count: inactive.length }, "Sending push reminders");

  for (const sub of inactive) {
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

export default router;
