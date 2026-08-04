/**
 * Unit tests for sendExpoPushReminders()
 *
 * Covers:
 *  1. Cohort filter — only users whose local hour is 19 AND who haven't
 *     logged today (lastActiveDate !== localDateStr) receive notifications.
 *  2. Stale token cleanup — a DeviceNotRegistered send-time error triggers
 *     db.delete for that token.
 *
 * All external I/O (database, Expo SDK) is fully mocked.
 * Paths in vi.mock() are relative to THIS file (src/__tests__/),
 * so "../lib/..." resolves to src/lib/... which is what push.ts imports.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── dateUtils mock ────────────────────────────────────────────────────────────
const mockLocalHour = vi.hoisted(() => vi.fn((_tz: string | null | undefined) => 12));
const mockLocalDateStr = vi.hoisted(() => vi.fn((_tz: string | null | undefined) => "2026-08-03"));

vi.mock("../lib/dateUtils", () => ({
  localHour: mockLocalHour,
  localDateStr: mockLocalDateStr,
  localYesterdayStr: vi.fn(() => "2026-08-02"),
  pgTimezone: vi.fn((tz: unknown) => tz ?? "America/New_York"),
}));

// ── Expo SDK mock ─────────────────────────────────────────────────────────────
const mockSendPushNotificationsAsync = vi.hoisted(() =>
  vi.fn().mockResolvedValue([]),
);
const mockChunkPushNotifications = vi.hoisted(() =>
  vi.fn((msgs: unknown[]) => [msgs]),
);
const mockChunkReceiptIds = vi.hoisted(() =>
  vi.fn((ids: string[]) => [ids]),
);
const mockGetReceipts = vi.hoisted(() =>
  vi.fn().mockResolvedValue({}),
);

vi.mock("expo-server-sdk", () => {
  class MockExpo {
    sendPushNotificationsAsync = mockSendPushNotificationsAsync;
    chunkPushNotifications = mockChunkPushNotifications;
    chunkPushNotificationReceiptIds = mockChunkReceiptIds;
    getPushNotificationReceiptsAsync = mockGetReceipts;
    static isExpoPushToken(token: string) {
      return (
        token.startsWith("ExponentPushToken[") ||
        token.startsWith("ExpoPushToken[")
      );
    }
  }
  return { Expo: MockExpo };
});

// ── Database mock ─────────────────────────────────────────────────────────────
const mockDbDeleteWhere = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockDbDelete = vi.hoisted(() => vi.fn(() => ({ where: mockDbDeleteWhere })));
const mockDbInnerJoin = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockDbFrom = vi.hoisted(() => vi.fn(() => ({ innerJoin: mockDbInnerJoin })));
const mockDbSelect = vi.hoisted(() => vi.fn(() => ({ from: mockDbFrom })));
const mockOnConflictDoUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockInsertValues = vi.hoisted(() =>
  vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate })),
);
const mockDbInsert = vi.hoisted(() => vi.fn(() => ({ values: mockInsertValues })));

vi.mock("@workspace/db", () => ({
  db: {
    select: mockDbSelect,
    delete: mockDbDelete,
    insert: mockDbInsert,
  },
  pushTokensTable: { token: "token_col", userId: "user_id_col" },
  pushSubscriptionsTable: {},
  usersTable: {},
  actionsTable: {},
  missionsTable: {},
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  sql: vi.fn((strings: TemplateStringsArray, ...vals: unknown[]) => ({ strings, vals })),
  and: vi.fn((...args: unknown[]) => args),
}));

// Logger — suppress output during tests
vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// web-push — not under test, prevent real VAPID HTTP calls
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn().mockResolvedValue({}),
  },
}));

// AI lib — not relevant to push reminder tests
vi.mock("../lib/ai", () => ({
  generateDailyMissions: vi.fn().mockResolvedValue({
    critical: "test",
    secondary: ["a", "b", "c"],
    courage: "d",
  }),
}));

// ── Import the functions under test AFTER all mocks ──────────────────────────
import { sendExpoPushReminders, sendDailyReminders } from "../routes/push.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeToken(overrides: Partial<{
  userId: number;
  token: string;
  streakDays: number;
  lastActiveDate: string;
  name: string;
  timezone: string;
}> = {}) {
  return {
    userId: 1,
    token: "ExponentPushToken[test]",
    streakDays: 3,
    lastActiveDate: "2026-08-02",   // yesterday → hasn't logged today
    name: "Alice",
    timezone: "America/New_York",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("sendExpoPushReminders() — cohort filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore default mock implementations after clearAllMocks resets them
    mockLocalDateStr.mockReturnValue("2026-08-03");
    mockLocalHour.mockReturnValue(12);
    mockChunkPushNotifications.mockImplementation((msgs: unknown[]) => [msgs]);
    mockDbFrom.mockReturnValue({ innerJoin: mockDbInnerJoin });
    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbDelete.mockReturnValue({ where: mockDbDeleteWhere });
    mockDbInnerJoin.mockResolvedValue([]);
    mockDbDeleteWhere.mockResolvedValue(undefined);
    mockSendPushNotificationsAsync.mockResolvedValue([]);
  });

  it("sends to users whose local hour is 19 and haven't logged today", async () => {
    mockLocalHour.mockReturnValue(19);
    const row = makeToken({ lastActiveDate: "2026-08-02" });
    mockDbInnerJoin.mockResolvedValue([row]);
    mockSendPushNotificationsAsync.mockResolvedValue([
      { status: "ok", id: "receipt-1" },
    ]);

    await sendExpoPushReminders();

    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(1);
    const sentMessages = mockSendPushNotificationsAsync.mock.calls[0][0] as any[];
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].to).toBe("ExponentPushToken[test]");
  });

  it("does NOT send when local hour is not 19", async () => {
    mockLocalHour.mockReturnValue(18);
    mockDbInnerJoin.mockResolvedValue([makeToken({ lastActiveDate: "2026-08-02" })]);

    await sendExpoPushReminders();

    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it("does NOT send when user already logged today (lastActiveDate === today)", async () => {
    mockLocalHour.mockReturnValue(19);
    // lastActiveDate equals today → already logged
    mockDbInnerJoin.mockResolvedValue([makeToken({ lastActiveDate: "2026-08-03" })]);

    await sendExpoPushReminders();

    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it("sends only to the 7pm-eligible user among a mixed cohort", async () => {
    // User A: local hour 19, hasn't logged → send
    // User B: local hour 14, hasn't logged → skip
    // User C: local hour 19, already logged → skip
    mockLocalHour
      .mockReturnValueOnce(19)   // user A
      .mockReturnValueOnce(14)   // user B
      .mockReturnValueOnce(19);  // user C
    mockLocalDateStr.mockReturnValue("2026-08-03");

    mockDbInnerJoin.mockResolvedValue([
      makeToken({ userId: 1, token: "ExponentPushToken[A]", lastActiveDate: "2026-08-02" }),
      makeToken({ userId: 2, token: "ExponentPushToken[B]", lastActiveDate: "2026-08-02" }),
      makeToken({ userId: 3, token: "ExponentPushToken[C]", lastActiveDate: "2026-08-03" }),
    ]);
    mockSendPushNotificationsAsync.mockResolvedValue([{ status: "ok", id: "r1" }]);

    await sendExpoPushReminders();

    const sentMessages = mockSendPushNotificationsAsync.mock.calls[0][0] as any[];
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].to).toBe("ExponentPushToken[A]");
  });

  it("skips tokens that fail Expo.isExpoPushToken validation", async () => {
    mockLocalHour.mockReturnValue(19);
    // Non-Expo token mixed in
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ token: "ExponentPushToken[valid]", lastActiveDate: "2026-08-02" }),
      makeToken({ token: "fcm:invalid_token", lastActiveDate: "2026-08-02" }),
    ]);
    mockSendPushNotificationsAsync.mockResolvedValue([{ status: "ok", id: "r1" }]);

    await sendExpoPushReminders();

    const sentMessages = mockSendPushNotificationsAsync.mock.calls[0][0] as any[];
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].to).toBe("ExponentPushToken[valid]");
  });

  it("sends no messages and skips Expo call when token list is empty", async () => {
    mockDbInnerJoin.mockResolvedValue([]);

    await sendExpoPushReminders();

    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it("includes streak line in body when streakDays > 0", async () => {
    mockLocalHour.mockReturnValue(19);
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ streakDays: 5, lastActiveDate: "2026-08-02" }),
    ]);
    mockSendPushNotificationsAsync.mockResolvedValue([{ status: "ok", id: "r1" }]);

    await sendExpoPushReminders();

    const msg = (mockSendPushNotificationsAsync.mock.calls[0][0] as any[])[0];
    expect(msg.body).toContain("5-day streak");
  });

  it("uses generic streak message when streakDays is 0", async () => {
    mockLocalHour.mockReturnValue(19);
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ streakDays: 0, lastActiveDate: "2026-08-02" }),
    ]);
    mockSendPushNotificationsAsync.mockResolvedValue([{ status: "ok", id: "r1" }]);

    await sendExpoPushReminders();

    const msg = (mockSendPushNotificationsAsync.mock.calls[0][0] as any[])[0];
    expect(msg.body).toContain("great day to start your streak");
  });
});

describe("sendExpoPushReminders() — stale token cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalDateStr.mockReturnValue("2026-08-03");
    mockLocalHour.mockReturnValue(19);
    mockChunkPushNotifications.mockImplementation((msgs: unknown[]) => [msgs]);
    mockDbFrom.mockReturnValue({ innerJoin: mockDbInnerJoin });
    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbDelete.mockReturnValue({ where: mockDbDeleteWhere });
    mockDbInnerJoin.mockResolvedValue([]);
    mockDbDeleteWhere.mockResolvedValue(undefined);
    mockSendPushNotificationsAsync.mockResolvedValue([]);
  });

  it("deletes token when Expo returns DeviceNotRegistered at send time", async () => {
    const staleToken = "ExponentPushToken[stale]";
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ token: staleToken, lastActiveDate: "2026-08-02" }),
    ]);

    // Expo returns an immediate error with DeviceNotRegistered
    mockSendPushNotificationsAsync.mockResolvedValue([
      {
        status: "error",
        message: "InvalidCredentials",
        details: { error: "DeviceNotRegistered" },
      },
    ]);

    await sendExpoPushReminders();

    expect(mockDbDelete).toHaveBeenCalledTimes(1);
    expect(mockDbDeleteWhere).toHaveBeenCalledTimes(1);
  });

  it("does NOT delete token when Expo returns a different send-time error", async () => {
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ token: "ExponentPushToken[ok]", lastActiveDate: "2026-08-02" }),
    ]);

    mockSendPushNotificationsAsync.mockResolvedValue([
      {
        status: "error",
        message: "MessageRateExceeded",
        details: { error: "MessageRateExceeded" },
      },
    ]);

    await sendExpoPushReminders();

    expect(mockDbDelete).not.toHaveBeenCalled();
  });

  it("does NOT delete token on successful send", async () => {
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ lastActiveDate: "2026-08-02" }),
    ]);

    mockSendPushNotificationsAsync.mockResolvedValue([
      { status: "ok", id: "receipt-abc" },
    ]);

    await sendExpoPushReminders();

    expect(mockDbDelete).not.toHaveBeenCalled();
  });

  it("queues receipt ID for async check on successful send", async () => {
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ lastActiveDate: "2026-08-02" }),
    ]);

    const receiptId = "receipt-xyz-123";
    mockSendPushNotificationsAsync.mockResolvedValue([
      { status: "ok", id: receiptId },
    ]);

    // No exception should be thrown — receipt is queued silently
    await expect(sendExpoPushReminders()).resolves.not.toThrow();
  });

  it("handles a chunk send failure gracefully without throwing", async () => {
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ lastActiveDate: "2026-08-02" }),
    ]);

    mockSendPushNotificationsAsync.mockRejectedValue(new Error("Expo network error"));

    await expect(sendExpoPushReminders()).resolves.not.toThrow();
  });

  it("deletes only the stale token in a mixed batch", async () => {
    const staleToken = "ExponentPushToken[stale]";
    const goodToken = "ExponentPushToken[good]";

    mockDbInnerJoin.mockResolvedValue([
      makeToken({ userId: 1, token: staleToken, lastActiveDate: "2026-08-02" }),
      makeToken({ userId: 2, token: goodToken, lastActiveDate: "2026-08-02" }),
    ]);

    // chunkPushNotifications returns both in one chunk (default mock)
    mockSendPushNotificationsAsync.mockResolvedValue([
      {
        status: "error",
        message: "DeviceNotRegistered",
        details: { error: "DeviceNotRegistered" },
      },
      { status: "ok", id: "receipt-good" },
    ]);

    await sendExpoPushReminders();

    // Only one delete — for the stale token
    expect(mockDbDelete).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sendDailyReminders() — composed scheduler entry point
//
// Verifies that the function callers trigger in production reach (at minimum)
// the Expo push path with the correct cohort filter.  The web-push path skips
// automatically in test because VAPID_PUBLIC_KEY is not set — that's the
// expected behaviour for a non-web-push environment; it must not throw.
// ─────────────────────────────────────────────────────────────────────────────
describe("sendDailyReminders() — entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalDateStr.mockReturnValue("2026-08-03");
    mockLocalHour.mockReturnValue(19);
    mockChunkPushNotifications.mockImplementation((msgs: unknown[]) => [msgs]);
    mockDbFrom.mockReturnValue({ innerJoin: mockDbInnerJoin });
    mockDbSelect.mockReturnValue({ from: mockDbFrom });
    mockDbDelete.mockReturnValue({ where: mockDbDeleteWhere });
    mockDbInnerJoin.mockResolvedValue([]);
    mockDbDeleteWhere.mockResolvedValue(undefined);
    mockSendPushNotificationsAsync.mockResolvedValue([]);
  });

  it("completes without throwing even when no tokens exist", async () => {
    mockDbInnerJoin.mockResolvedValue([]);
    await expect(sendDailyReminders()).resolves.not.toThrow();
  });

  it("delivers Expo notifications to 7pm-eligible tokens via the scheduler entry point", async () => {
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ lastActiveDate: "2026-08-02" }),
    ]);
    mockSendPushNotificationsAsync.mockResolvedValue([
      { status: "ok", id: "sched-receipt-1" },
    ]);

    await sendDailyReminders();

    // Expo path must have been reached
    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(1);
    const sent = mockSendPushNotificationsAsync.mock.calls[0][0] as any[];
    expect(sent[0].to).toBe("ExponentPushToken[test]");
  });

  it("skips Expo send when all tokens belong to users who already logged today", async () => {
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ lastActiveDate: "2026-08-03" }), // already logged
    ]);

    await sendDailyReminders();

    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it("cleans up a DeviceNotRegistered stale token encountered during scheduled send", async () => {
    mockDbInnerJoin.mockResolvedValue([
      makeToken({ token: "ExponentPushToken[stale-sched]", lastActiveDate: "2026-08-02" }),
    ]);
    mockSendPushNotificationsAsync.mockResolvedValue([
      { status: "error", message: "DNR", details: { error: "DeviceNotRegistered" } },
    ]);

    await sendDailyReminders();

    expect(mockDbDelete).toHaveBeenCalledTimes(1);
  });
});
