/**
 * Cron job registration — extracted so the schedule wiring can be tested
 * independently of the full server startup (index.ts).
 *
 * Pass in a node-cron–compatible object so tests can inject a mock without
 * importing the live cron library (which would start real timers).
 */
import { logger } from "./logger";
import {
  sendDailyReminders,
  checkExpoPushReceipts,
  preGenerateTomorrowMissions,
} from "../routes/push";
import { pool } from "@workspace/db";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { purgeUserDbData, purgeStripeData } from "../routes/users";
import { createClerkClient } from "@clerk/express";

/**
 * Drain the pending_deletions queue: retry DB cleanup for accounts whose
 * Clerk identity was deleted but whose DB transaction subsequently failed.
 *
 * Two cases are handled:
 *   clerk_deleted_at SET   → Clerk identity confirmed gone; safe to purge DB.
 *   clerk_deleted_at NULL  → Stamp may have failed after Clerk deletion; the
 *                            worker calls the Clerk API to verify. If the
 *                            Clerk user is gone (404) it stamps the row and
 *                            purges. If the Clerk user still exists the row
 *                            is skipped (Clerk deletion failed; user can retry).
 *
 * The pending_deletions.user_id FK references users(id) ON DELETE CASCADE,
 * so a row can only exist while the user row also exists. When purgeUserDbData
 * commits, the FK cascade removes the pending row automatically — no explicit
 * cleanup call needed.
 */
export async function drainPendingDeletions(): Promise<void> {
  const { rows } = await pool.query<{
    user_id: number;
    clerk_id: string;
    clerk_deleted_at: Date | null;
  }>(
    "SELECT user_id, clerk_id, clerk_deleted_at FROM pending_deletions ORDER BY created_at ASC LIMIT 50"
  );

  if (rows.length === 0) return;

  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

  for (const row of rows) {
    try {
      let clerkConfirmedDeleted = row.clerk_deleted_at !== null;

      if (!clerkConfirmedDeleted) {
        // Stamp is missing — verify via Clerk API before touching the DB.
        try {
          await clerk.users.getUser(row.clerk_id);
          // Clerk user still exists: Clerk deletion failed. Skip and let the
          // user retry the endpoint (their session is still valid).
          logger.info({ userId: row.user_id }, "Pending deletion: Clerk user still active — skipping");
          continue;
        } catch (clerkErr: any) {
          const isGone =
            clerkErr?.status === 404 ||
            String(clerkErr?.message ?? "").toLowerCase().includes("not found");
          if (isGone) {
            // Clerk user is confirmed gone — stamp the row and proceed.
            await pool.query(
              "UPDATE pending_deletions SET clerk_deleted_at = NOW() WHERE user_id = $1",
              [row.user_id]
            );
            clerkConfirmedDeleted = true;
          } else {
            logger.error({ err: clerkErr, userId: row.user_id }, "Pending deletion: Clerk status check failed — will retry next cycle");
            continue;
          }
        }
      }

      if (clerkConfirmedDeleted) {
        // Purge Stripe data first (needs stripeCustomerId from user row, which still exists).
        const [userRow] = await db.select({ stripeCustomerId: usersTable.stripeCustomerId })
          .from(usersTable).where(eq(usersTable.id, row.user_id));
        await purgeStripeData(userRow?.stripeCustomerId);
        // Purge user DB data atomically. The FK CASCADE removes the pending row.
        await purgeUserDbData(row.user_id);
        logger.info({ userId: row.user_id, clerkId: row.clerk_id }, "Pending deletion drained successfully");
      }
    } catch (err) {
      logger.error({ err, userId: row.user_id }, "Failed to drain pending deletion — will retry next cycle");
    }
  }
}

/** Minimal interface for the node-cron scheduler — narrow enough to be useful,
 *  loose enough that vi.fn() mocks satisfy it in tests without a cast. */
export interface CronLike {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schedule(expression: string, func: (...args: any[]) => void, options?: unknown): unknown;
}

/**
 * Register all production cron jobs against the supplied scheduler.
 * Called once during server startup (index.ts) with the real node-cron module.
 */
export function scheduleCronJobs(cron: CronLike): void {
  // Push reminders: every hour at :00.
  // sendDailyReminders() itself is timezone-aware and only fires for users
  // whose local clock reads 7PM — so each user gets reminded at the right time.
  cron.schedule("0 * * * *", () => {
    logger.info("Running hourly push reminder check (timezone-aware 7PM local)");
    sendDailyReminders().catch((err) =>
      logger.error({ err }, "Push reminder job failed"),
    );
  });

  // Receipt check: :30 — 30 min after the send — fetches async Expo receipts
  // and deletes tokens that came back as DeviceNotRegistered.
  cron.schedule("30 * * * *", () => {
    logger.info("Running Expo push receipt check (stale token cleanup)");
    checkExpoPushReceipts().catch((err) =>
      logger.error({ err }, "Expo receipt check job failed"),
    );
  });

  // Pre-generate tomorrow's missions once daily at 8PM UTC for active users.
  cron.schedule("0 20 * * *", () => {
    logger.info("Running nightly mission pre-generation (8pm UTC)");
    preGenerateTomorrowMissions().catch((err) =>
      logger.error({ err }, "Mission pre-generation failed"),
    );
  });

  // Pending deletion drain: retry any account deletions where Clerk removal
  // succeeded but the DB transaction failed. Runs every 10 minutes.
  cron.schedule("*/10 * * * *", () => {
    drainPendingDeletions().catch((err) =>
      logger.error({ err }, "Pending deletion drain failed"),
    );
  });
}
