/**
 * Integration tests for POST /api/push-tokens
 *
 * Covers: happy path, missing token, invalid token format, upsert behaviour.
 * The database and Clerk auth middleware are fully mocked so these run without
 * a live DB or Clerk tenant.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ── db mock helpers ───────────────────────────────────────────────────────────
const mockOnConflictDoUpdate = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockInsertValues = vi.hoisted(() => vi.fn(() => ({ onConflictDoUpdate: mockOnConflictDoUpdate })));
const mockDbInsert = vi.hoisted(() => vi.fn(() => ({ values: mockInsertValues })));
const mockDeleteWhere = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockDbDelete = vi.hoisted(() => vi.fn(() => ({ where: mockDeleteWhere })));

vi.mock("@workspace/db", () => ({
  db: {
    insert: mockDbInsert,
    delete: mockDbDelete,
  },
  pushTokensTable: { token: "token_col" },
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => args),
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
}));

// Auth middleware — inject a fake user so route handlers see req.user.
// Path is relative to THIS file (src/__tests__/), so ../lib/auth → src/lib/auth.
vi.mock("../lib/auth", () => ({
  requireAuthWithUser: (req: any, _res: any, next: any) => {
    req.user = { id: 42, clerkId: "user_clerk_test" };
    next();
  },
}));

vi.mock("../lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// ── Test app setup ────────────────────────────────────────────────────────────
import pushTokensRouter from "../routes/push-tokens.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/push-tokens", pushTokensRouter);
  return app;
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("POST /api/push-tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("happy path — stores an ExponentPushToken and returns ok:true", async () => {
    const app = buildApp();
    const token = "ExponentPushToken[xxxxxx]";

    const res = await request(app)
      .post("/api/push-tokens")
      .send({ token });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });

    // db.insert should have been called with the right payload
    expect(mockDbInsert).toHaveBeenCalledTimes(1);
    expect(mockInsertValues).toHaveBeenCalledWith({ userId: 42, token });
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
  });

  it("happy path — also accepts ExpoPushToken[ prefix", async () => {
    const app = buildApp();
    const token = "ExpoPushToken[yyyyyy]";

    const res = await request(app)
      .post("/api/push-tokens")
      .send({ token });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(mockDbInsert).toHaveBeenCalledTimes(1);
  });

  it("missing token body — returns 400", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/api/push-tokens")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token is required/i);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it("null token — returns 400", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/api/push-tokens")
      .send({ token: null });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token is required/i);
  });

  it("invalid token format — returns 400", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/api/push-tokens")
      .send({ token: "fcm:APA91b..." });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid Expo push token/i);
    expect(mockDbInsert).not.toHaveBeenCalled();
  });

  it("upsert behaviour — onConflictDoUpdate carries userId + updatedAt", async () => {
    const app = buildApp();
    const token = "ExponentPushToken[xxxxxx]";

    await request(app).post("/api/push-tokens").send({ token });

    const upsertArg = mockOnConflictDoUpdate.mock.calls[0][0] as {
      target: unknown;
      set: { userId: number; updatedAt: Date };
    };

    expect(upsertArg.set.userId).toBe(42);
    expect(upsertArg.set.updatedAt).toBeInstanceOf(Date);
  });

  it("second registration with same token updates existing row (upsert called)", async () => {
    const app = buildApp();
    const token = "ExponentPushToken[xxxxxx]";

    // Simulate two calls from the same device
    await request(app).post("/api/push-tokens").send({ token });
    await request(app).post("/api/push-tokens").send({ token });

    // Both requests must reach onConflictDoUpdate — the DB handles dedup
    expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(2);
  });
});
