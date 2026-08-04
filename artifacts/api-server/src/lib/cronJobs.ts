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
}
