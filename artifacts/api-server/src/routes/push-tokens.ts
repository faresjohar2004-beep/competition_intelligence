import { Router } from "express";
import { db, pushTokensTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { logger } from "../lib/logger";

const router = Router();

// POST /api/push-tokens
// Register (or refresh) an Expo push token for the authenticated user.
// Safe to call on every app launch — uses upsert to avoid duplicates.
router.post("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { token } = req.body;

  if (!token || typeof token !== "string") {
    res.status(400).json({ error: "token is required" });
    return;
  }

  // Validate it looks like an Expo push token
  if (!token.startsWith("ExponentPushToken[") && !token.startsWith("ExpoPushToken[")) {
    res.status(400).json({ error: "token must be a valid Expo push token" });
    return;
  }

  await db
    .insert(pushTokensTable)
    .values({ userId: user.id, token })
    .onConflictDoUpdate({
      target: pushTokensTable.token,
      set: { userId: user.id, updatedAt: new Date() },
    });

  logger.info({ userId: user.id }, "Expo push token registered");
  res.json({ ok: true });
});

// DELETE /api/push-tokens
// Unregister an Expo push token (e.g. on sign-out).
router.delete("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { token } = req.body;

  if (token) {
    await db
      .delete(pushTokensTable)
      .where(and(eq(pushTokensTable.token, token), eq(pushTokensTable.userId, user.id)));
  }

  res.json({ ok: true });
});

export default router;
