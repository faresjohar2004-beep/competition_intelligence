/**
 * Tests for cron job registration wiring (src/lib/cronJobs.ts).
 *
 * Verifies that scheduleCronJobs() registers all three production jobs with
 * the correct cron expressions. All push functions are mocked so no real DB
 * or Expo SDK calls happen.
 *
 * Expressions under test:
 *   "0 * * * *"   — every hour at :00  (hourly push reminders)
 *   "30 * * * *"  — every hour at :30  (Expo receipt check)
 *   "0 20 * * *"  — daily at 8PM UTC   (mission pre-generation)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock push functions so no real I/O happens ────────────────────────────────
vi.mock("../routes/push.js", () => ({
  sendDailyReminders: vi.fn().mockResolvedValue(undefined),
  checkExpoPushReceipts: vi.fn().mockResolvedValue(undefined),
  preGenerateTomorrowMissions: vi.fn().mockResolvedValue(undefined),
  sendExpoPushReminders: vi.fn().mockResolvedValue(undefined),
}));

// The cronJobs module also transitively imports db + dateUtils via push.ts;
// mock those so the import chain doesn't try to connect to Postgres.
vi.mock("@workspace/db", () => ({
  db: { select: vi.fn(), insert: vi.fn(), delete: vi.fn() },
  pushTokensTable: {},
  pushSubscriptionsTable: {},
  usersTable: {},
  actionsTable: {},
  missionsTable: {},
  pool: { query: vi.fn() },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn(),
  sql: vi.fn(),
  and: vi.fn(),
}));

vi.mock("../lib/dateUtils", () => ({
  localHour: vi.fn(() => 12),
  localDateStr: vi.fn(() => "2026-08-03"),
  localYesterdayStr: vi.fn(() => "2026-08-02"),
  pgTimezone: vi.fn((tz: unknown) => tz ?? "America/New_York"),
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("web-push", () => ({
  default: { setVapidDetails: vi.fn(), sendNotification: vi.fn() },
}));

vi.mock("../lib/ai", () => ({
  generateDailyMissions: vi.fn(),
}));

vi.mock("expo-server-sdk", () => ({
  Expo: class {
    static isExpoPushToken = vi.fn(() => true);
    sendPushNotificationsAsync = vi.fn().mockResolvedValue([]);
    chunkPushNotifications = vi.fn((m: unknown[]) => [m]);
    chunkPushNotificationReceiptIds = vi.fn((ids: string[]) => [ids]);
    getPushNotificationReceiptsAsync = vi.fn().mockResolvedValue({});
  },
}));

// ── Import function under test ────────────────────────────────────────────────
import { scheduleCronJobs, type CronLike } from "../lib/cronJobs.js";
import {
  sendDailyReminders,
  checkExpoPushReceipts,
  preGenerateTomorrowMissions,
} from "../routes/push.js";

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("scheduleCronJobs() — wiring", () => {
  let registeredJobs: Map<string, () => void>;
  let mockCron: CronLike;

  beforeEach(() => {
    vi.clearAllMocks();
    registeredJobs = new Map();
    // Cast through unknown so vi.fn()'s wide Mock type satisfies CronLike['schedule'].
    mockCron = {
      schedule: vi.fn((expression: string, fn: () => void) => {
        registeredJobs.set(expression, fn);
      }) as unknown as CronLike["schedule"],
    };
  });

  it("registers exactly three cron expressions", () => {
    scheduleCronJobs(mockCron);
    expect(mockCron.schedule).toHaveBeenCalledTimes(3);
  });

  it("registers the hourly push-reminder job at '0 * * * *'", () => {
    scheduleCronJobs(mockCron);
    expect(registeredJobs.has("0 * * * *")).toBe(true);
  });

  it("registers the receipt-check job at '30 * * * *'", () => {
    scheduleCronJobs(mockCron);
    expect(registeredJobs.has("30 * * * *")).toBe(true);
  });

  it("registers the nightly mission pre-generation job at '0 20 * * *'", () => {
    scheduleCronJobs(mockCron);
    expect(registeredJobs.has("0 20 * * *")).toBe(true);
  });

  it("hourly job calls sendDailyReminders() when fired", async () => {
    scheduleCronJobs(mockCron);
    const hourlyJob = registeredJobs.get("0 * * * *")!;

    hourlyJob();
    // Let promise microtasks settle
    await new Promise((r) => setTimeout(r, 0));

    expect(sendDailyReminders).toHaveBeenCalledTimes(1);
  });

  it("receipt-check job calls checkExpoPushReceipts() when fired", async () => {
    scheduleCronJobs(mockCron);
    const receiptJob = registeredJobs.get("30 * * * *")!;

    receiptJob();
    await new Promise((r) => setTimeout(r, 0));

    expect(checkExpoPushReceipts).toHaveBeenCalledTimes(1);
  });

  it("nightly job calls preGenerateTomorrowMissions() when fired", async () => {
    scheduleCronJobs(mockCron);
    const nightlyJob = registeredJobs.get("0 20 * * *")!;

    nightlyJob();
    await new Promise((r) => setTimeout(r, 0));

    expect(preGenerateTomorrowMissions).toHaveBeenCalledTimes(1);
  });

  it("hourly job does not throw when sendDailyReminders rejects", async () => {
    (sendDailyReminders as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Network error"),
    );
    scheduleCronJobs(mockCron);
    const hourlyJob = registeredJobs.get("0 * * * *")!;

    // Should not propagate the rejection
    await expect(
      new Promise<void>((resolve) => {
        hourlyJob();
        setTimeout(resolve, 0);
      }),
    ).resolves.not.toThrow();
  });
});
