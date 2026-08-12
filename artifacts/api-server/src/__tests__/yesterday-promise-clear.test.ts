/**
 * Integration tests for the "Yesterday's Promise" clearing behaviour.
 *
 * The bug-class under test:
 *   A user sets tomorrowPromise on day N.  When they log their first action
 *   on day N+1 the server MUST atomically clear tomorrowPromise (→ null) so
 *   the card never reappears on subsequent mornings.
 *
 * Coverage:
 *  1. First action of the new day, promise is set
 *       → DB update for usersTable includes tomorrowPromise: null
 *  2. Second action on the same day (not first action)
 *       → tomorrowPromise is NOT touched (isFirstActionToday is false)
 *  3. First action of a new day, but tomorrowPromise was already empty/null
 *       → tomorrowPromise is NOT written (no outstanding promise → no credit)
 *  4. Empty-string tomorrowPromise is not credited (only a non-empty string counts)
 *  5. Response body never echoes back the old promise text
 *  6. PATCH /api/users/me with tomorrowPromise: "" explicitly clears the
 *       field (used by the mobile handleLog fallback path)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ── Hoisted constants — safe to reference inside vi.mock factories ─────────────
const TODAY = "2026-08-06";
const YESTERDAY = "2026-08-05";

// Mutable store for the injected user — set per-test via makeUser()
const currentUser = vi.hoisted(() => ({ value: null as Record<string, any> | null }));

// Capture every payload passed to db.update(usersTable).set({...})
const capturedUpdates = vi.hoisted(() => ({ list: [] as Record<string, any>[] }));

// ── Flexible thenable chain helper ────────────────────────────────────────────
// Drizzle query builders are both awaitable and have chainable methods.
// This shim satisfies both without a real DB connection.
function chain(value: any = undefined): any {
  return {
    then: (res: any, rej?: any) => Promise.resolve(value).then(res, rej),
    catch: (rej: any) => Promise.resolve(value).catch(rej),
    finally: (fn: any) => Promise.resolve(value).finally(fn),
    where: () => chain(value),
    from: () => chain(value),
    orderBy: () => chain(value),
    innerJoin: () => chain(value),
    limit: () => chain(value),
    returning: () => Promise.resolve(Array.isArray(value) ? value : [value]),
  };
}

// ── dateUtils mock ────────────────────────────────────────────────────────────
vi.mock("../lib/dateUtils", () => ({
  localDateStr: vi.fn(() => TODAY),
  localYesterdayStr: vi.fn(() => YESTERDAY),
  pgTimezone: vi.fn((tz: unknown) => tz ?? "America/New_York"),
}));

// ── promiseStreak mock ────────────────────────────────────────────────────────
// The streak lib is tested independently in promise-streak.test.ts.
// Here we only care whether tomorrowPromise is truthy (→ credit).
vi.mock("../lib/promiseStreak", () => ({
  computePromiseStreak: vi.fn(({ tomorrowPromise, promiseStreak }: any) => ({
    credit: !!tomorrowPromise,
    newPromiseStreak: tomorrowPromise ? (promiseStreak ?? 0) + 1 : (promiseStreak ?? 0),
  })),
}));

// ── scores mock ───────────────────────────────────────────────────────────────
vi.mock("../lib/scores", () => ({
  getActionImpact: vi.fn(() => ({
    healthDelta: 2, wealthDelta: 0, disciplineDelta: 2,
    confidenceDelta: 0, knowledgeDelta: 0,
    message: "Great!",
  })),
  clampScore: vi.fn((n: number) => Math.min(100, Math.max(0, n))),
  calcOverallScore: vi.fn(() => 60),
}));

// ── logger mock ───────────────────────────────────────────────────────────────
vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── auth mock ─────────────────────────────────────────────────────────────────
// requireAuthWithUser injects req.user from the per-test currentUser holder.
vi.mock("../lib/auth", () => ({
  requireAuth: vi.fn((_req: any, _res: any, next: any) => next()),
  requireAuthWithUser: vi.fn((req: any, _res: any, next: any) => {
    req.user = currentUser.value;
    next();
  }),
}));

// ── Database mock ─────────────────────────────────────────────────────────────
// Fake data returned by select queries
const fakeAction = {
  id: 42, userId: 1, type: "workout", notes: null,
  healthImpact: 2, wealthImpact: 0, disciplineImpact: 2,
  confidenceImpact: 0, knowledgeImpact: 0,
  completedAt: new Date("2026-08-06T10:00:00Z"),
};

const fakeCurrentSelf = {
  id: 1, userId: 1, timeframe: "current",
  healthScore: 50, wealthScore: 50, disciplineScore: 50,
  confidenceScore: 50, knowledgeScore: 50, overallScore: 50,
  createdAt: new Date(), updatedAt: new Date(),
};

vi.mock("@workspace/db", () => {
  // Table sentinels — compared by reference inside update() to route captures
  const usersTable = { _tag: "usersTable" };
  const actionsTable = { _tag: "actionsTable" };
  const futureSelfTable = { _tag: "futureSelfTable" };
  const lifeMapTable = { _tag: "lifeMapTable" };
  const chaptersTable = { _tag: "chaptersTable" };
  const userChaptersTable = { _tag: "userChaptersTable" };

  // insert — always resolves with fakeAction
  const insertMock = vi.fn(() => ({
    values: vi.fn(() => ({
      returning: vi.fn().mockResolvedValue([fakeAction]),
    })),
  }));

  // select — returns context-appropriate rows based on which table is queried
  const selectMock = vi.fn(() => ({
    from: vi.fn((table: any) => {
      if (table?._tag === "futureSelfTable") {
        return { where: vi.fn().mockResolvedValue([fakeCurrentSelf]) };
      }
      if (table?._tag === "actionsTable") {
        return { where: vi.fn().mockResolvedValue([{ count: 5 }]) };
      }
      if (table?._tag === "chaptersTable") {
        // No chapters → chapter-unlock loop is a no-op
        return { orderBy: vi.fn().mockResolvedValue([]) };
      }
      // userChaptersTable and any others
      return { where: vi.fn().mockResolvedValue([]) };
    }),
  }));

  // update — captures set() payload for usersTable; chains for all others
  const updateMock = vi.fn((table: any) => ({
    set: (data: any) => {
      if (table?._tag === "usersTable") {
        // Record for post-request assertions
        capturedUpdates.list.push({ ...data });
        return chain(undefined);
      }
      if (table?._tag === "futureSelfTable") {
        // futureSelf update uses .where().returning()
        return {
          where: () => ({
            returning: vi.fn().mockResolvedValue([{ ...fakeCurrentSelf }]),
          }),
        };
      }
      // lifeMapTable, userChaptersTable — just needs to be awaitable
      return chain(undefined);
    },
  }));

  return {
    db: { select: selectMock, insert: insertMock, update: updateMock },
    usersTable,
    actionsTable,
    futureSelfTable,
    lifeMapTable,
    chaptersTable,
    userChaptersTable,
  };
});

// ── drizzle-orm mock ──────────────────────────────────────────────────────────
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((col: any, val: any) => ({ col, val })),
  sql: vi.fn((strings: TemplateStringsArray, ...vals: any[]) => ({ strings, vals })),
  and: vi.fn((...args: any[]) => args),
  count: vi.fn(() => ({})),
  sum: vi.fn(() => ({})),
}));

// ── Import routers under test AFTER all mocks ─────────────────────────────────
import actionsRouter from "../routes/actions.js";
import usersRouter from "../routes/users.js";

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/actions", actionsRouter);
  app.use("/api/users", usersRouter);
  return app;
}

function makeUser(overrides: Partial<{
  id: number;
  clerkId: string;
  timezone: string;
  tomorrowPromise: string | null;
  lastActiveDate: string | null;
  streakDays: number;
  promiseStreak: number;
  lastPromiseDate: string | null;
}> = {}) {
  return {
    id: 1,
    clerkId: "clerk_test",
    timezone: "America/New_York",
    tomorrowPromise: null,
    lastActiveDate: YESTERDAY,   // default: hasn't logged today yet
    streakDays: 3,
    promiseStreak: 2,
    lastPromiseDate: YESTERDAY,
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("Yesterday's Promise — clearing on first action of new day", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    capturedUpdates.list.length = 0;   // reset per test
    vi.clearAllMocks();
    app = makeApp();
  });

  // ── 1. Happy path: first action of N+1, promise was set ──────────────────
  it("clears tomorrowPromise (→ null) on the first action of the new day when a promise was set", async () => {
    currentUser.value = makeUser({
      tomorrowPromise: "I will train for 30 minutes",
      lastActiveDate: YESTERDAY,   // hasn't logged today yet → isFirstActionToday
    });

    const res = await request(app)
      .post("/api/actions")
      .send({ type: "workout" });

    expect(res.status).toBe(201);

    // The DB update for the users table MUST include tomorrowPromise: null
    const clearUpdate = capturedUpdates.list.find(u => "tomorrowPromise" in u);
    expect(clearUpdate).toBeDefined();
    expect(clearUpdate?.tomorrowPromise).toBeNull();
  });

  // ── 2. Not first action today — promise must not be re-cleared ─────────
  it("does NOT clear tomorrowPromise when the user already logged today (not first action)", async () => {
    currentUser.value = makeUser({
      tomorrowPromise: "I will train for 30 minutes",
      lastActiveDate: TODAY,   // already logged today → isFirstActionToday = false
    });

    const res = await request(app)
      .post("/api/actions")
      .send({ type: "workout" });

    expect(res.status).toBe(201);

    // No user-table update should touch tomorrowPromise at all
    const promiseUpdate = capturedUpdates.list.find(u => "tomorrowPromise" in u);
    expect(promiseUpdate).toBeUndefined();
  });

  // ── 3. No outstanding promise — nothing to clear ──────────────────────
  it("does NOT write tomorrowPromise when no promise was set (null)", async () => {
    currentUser.value = makeUser({
      tomorrowPromise: null,
      lastActiveDate: YESTERDAY,   // first action of the day
    });

    const res = await request(app)
      .post("/api/actions")
      .send({ type: "deep_work" });

    expect(res.status).toBe(201);

    const promiseUpdate = capturedUpdates.list.find(u => "tomorrowPromise" in u);
    expect(promiseUpdate).toBeUndefined();
  });

  // ── 4. Empty-string promise is not credited ───────────────────────────
  it("does NOT credit an empty-string tomorrowPromise (empty is not a kept promise)", async () => {
    currentUser.value = makeUser({
      tomorrowPromise: "",   // empty — computePromiseStreak should not credit
      lastActiveDate: YESTERDAY,
    });

    const res = await request(app)
      .post("/api/actions")
      .send({ type: "workout" });

    expect(res.status).toBe(201);

    // The promise-credit path (which also clears tomorrowPromise) must not fire
    const promiseUpdate = capturedUpdates.list.find(u => "tomorrowPromise" in u);
    expect(promiseUpdate).toBeUndefined();
  });

  // ── 5. Response body never exposes the old promise ─────────────────────
  it("POST /api/actions response body does not echo back the old tomorrowPromise value", async () => {
    currentUser.value = makeUser({
      tomorrowPromise: "I will do 100 push-ups",
      lastActiveDate: YESTERDAY,
    });

    const res = await request(app)
      .post("/api/actions")
      .send({ type: "workout" });

    expect(res.status).toBe(201);
    // Response only contains action + scoreImpact + newScores — never user fields
    expect(res.body).not.toHaveProperty("tomorrowPromise");
    expect(res.body.action).toBeDefined();
    expect(res.body.scoreImpact).toBeDefined();
  });
});

// ── PATCH /api/users/me — explicit clear (mobile handleLog fallback) ──────────
describe("Yesterday's Promise — PATCH /api/users/me explicit clear", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(() => {
    capturedUpdates.list.length = 0;
    vi.clearAllMocks();
    app = makeApp();
  });

  // ── 6. Mobile handleLog fallback: PATCH with tomorrowPromise: "" ────────
  it("stores tomorrowPromise as null when PATCH sends empty string ('' → null coercion)", async () => {
    // The mobile handleLog calls updateMe({ tomorrowPromise: '' }) after the first action.
    // The PATCH handler coerces empty-string to null so DB is always null, never ''.
    currentUser.value = makeUser({ tomorrowPromise: "I will run 5k" });

    await request(app)
      .patch("/api/users/me")
      .send({ tomorrowPromise: "" });

    const promiseClear = capturedUpdates.list.find(u => "tomorrowPromise" in u);
    expect(promiseClear).toBeDefined();
    // Empty string → null (route: tomorrowPromise || null)
    expect(promiseClear?.tomorrowPromise).toBeNull();
  });

  it("stores a non-empty promise string as-is via PATCH", async () => {
    currentUser.value = makeUser({ tomorrowPromise: null });

    await request(app)
      .patch("/api/users/me")
      .send({ tomorrowPromise: "Run a mile at dawn" });

    const promiseSet = capturedUpdates.list.find(u => "tomorrowPromise" in u);
    expect(promiseSet).toBeDefined();
    expect(promiseSet?.tomorrowPromise).toBe("Run a mile at dawn");
  });
});
