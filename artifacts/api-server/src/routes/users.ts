import { Router } from "express";
import { db, usersTable, futureSelfTable, actionsTable, lifeMapTable, chaptersTable, userChaptersTable } from "@workspace/db";
import { eq, count, sql, gte, and } from "drizzle-orm";
import { requireAuth, requireAuthWithUser } from "../lib/auth";
import { clampScore, calcOverallScore } from "../lib/scores";
import { localDateStr, localYesterdayStr } from "../lib/dateUtils";
import { createClerkClient } from "@clerk/express";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router = Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) { res.status(404).json({ error: "User not found" }); return; }
  res.json({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
});

// PATCH /api/users/me
router.patch("/me", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { name, career, mainGoals, biggestStruggles, tomorrowPromise, timezone } = req.body;
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(name && { name }),
      ...(career && { career }),
      ...(mainGoals && { mainGoals }),
      ...(biggestStruggles && { biggestStruggles }),
      // Allow explicit null/empty to clear the promise, or a new string to set it
      ...(tomorrowPromise !== undefined && { tomorrowPromise: tomorrowPromise || null }),
      // Timezone stored as IANA string (e.g. "America/New_York") — set once, never overwritten with null
      ...(timezone && { timezone }),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// POST /api/users/onboard
router.post("/onboard", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkId;
  const { name, email, avatarUrl, age, gender, height, weight, fitnessLevel, incomeRange, career, mainGoals, biggestStruggles, dailyHabits, timezone } = req.body;

  // Upsert user
  let user;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (existing) {
    const [updated] = await db.update(usersTable).set({
      name, email: email || existing.email, avatarUrl, age, gender, height, weight, fitnessLevel, incomeRange,
      career, mainGoals, biggestStruggles, dailyHabits, onboarded: true, updatedAt: new Date(),
      ...(timezone && { timezone }),
    }).where(eq(usersTable.id, existing.id)).returning();
    user = updated;
  } else {
    const [created] = await db.insert(usersTable).values({
      clerkId, name, email: email || `${clerkId}@astra.app`, avatarUrl, age, gender, height, weight,
      fitnessLevel, incomeRange, career, mainGoals, biggestStruggles, dailyHabits, onboarded: true,
      ...(timezone && { timezone }),
    }).returning();
    user = created;
  }

  // Create initial future self profiles
  const timeframes = ["current", "one_year", "five_years"];
  const baseScore = 45 + Math.floor(Math.random() * 15);
  for (const timeframe of timeframes) {
    const multiplier = timeframe === "current" ? 1 : timeframe === "one_year" ? 1.2 : 1.5;
    const existing = await db.select().from(futureSelfTable).where(
      sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = ${timeframe}`
    );
    if (existing.length === 0) {
      const h = clampScore(baseScore * multiplier);
      const w = clampScore((baseScore - 5) * multiplier);
      const d = clampScore(baseScore * multiplier);
      const c = clampScore((baseScore - 3) * multiplier);
      const k = clampScore((baseScore + 2) * multiplier);
      await db.insert(futureSelfTable).values({
        userId: user.id, timeframe,
        healthScore: h, wealthScore: w, disciplineScore: d,
        confidenceScore: c, knowledgeScore: k,
        trajectoryScore: clampScore(baseScore * multiplier * 1.05),
        overallScore: calcOverallScore({ healthScore: h, wealthScore: w, disciplineScore: d, confidenceScore: c, knowledgeScore: k }),
      });
    }
  }

  // Create life map areas
  const areas = ["health", "wealth", "career", "relationships", "discipline", "knowledge"];
  for (const area of areas) {
    const existingArea = await db.select().from(lifeMapTable).where(
      sql`${lifeMapTable.userId} = ${user.id} AND ${lifeMapTable.area} = ${area}`
    );
    if (existingArea.length === 0) {
      await db.insert(lifeMapTable).values({ userId: user.id, area, score: baseScore + Math.floor(Math.random() * 10 - 5), trend: Math.random() * 4 - 1 });
    }
  }

  // Unlock first chapter
  const [chapter1] = await db.select().from(chaptersTable).where(eq(chaptersTable.number, 1));
  if (chapter1) {
    const existingUC = await db.select().from(userChaptersTable).where(
      sql`${userChaptersTable.userId} = ${user.id} AND ${userChaptersTable.chapterNumber} = 1`
    );
    if (existingUC.length === 0) {
      await db.insert(userChaptersTable).values({ userId: user.id, chapterNumber: 1, unlocked: true });
    }
  }

  res.status(201).json({ ...user, createdAt: user.createdAt.toISOString(), updatedAt: user.updatedAt.toISOString() });
});

// POST /api/users/me/streak-freeze
// Protects the user's streak after a missed day — sets lastActiveDate to yesterday
// so their next action extends the streak instead of resetting it to 1.
// Limited to once per 30 days per user.
router.post("/me/streak-freeze", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;

  // Check for a recent freeze (any streak_freeze action in the last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [recentFreeze] = await db
    .select()
    .from(actionsTable)
    .where(
      and(
        eq(actionsTable.userId, user.id),
        eq(actionsTable.type, "streak_freeze"),
        gte(actionsTable.completedAt, thirtyDaysAgo)
      )
    )
    .limit(1);

  if (recentFreeze) {
    res.status(400).json({ error: "Streak freeze already used this month" }); return;
  }

  // Use the user's local timezone so "today" and "yesterday" are correct for
  // their clock — not UTC (which can be a full day ahead for US users at night).
  const todayStr = localDateStr(user.timezone);
  if (user.lastActiveDate === todayStr) {
    res.status(400).json({ error: "You already logged today — no freeze needed" }); return;
  }

  // DST-safe: derive yesterday from the local calendar date, not by subtracting ms.
  const yesterdayStr = localYesterdayStr(user.timezone);

  // Insert a streak_freeze record (tracks usage + shows in Evidence Vault).
  // completedAt uses noon UTC yesterday — close enough for display purposes;
  // streak logic only cares about the date string.
  const yesterdayNoon = new Date(Date.now() - 86400000);
  yesterdayNoon.setUTCHours(12, 0, 0, 0);
  await db.insert(actionsTable).values({
    userId: user.id,
    type: "streak_freeze",
    completedAt: yesterdayNoon,
  });

  // Patch user so next action today sees lastActiveDate = yesterday → streak extends
  await db
    .update(usersTable)
    .set({ lastActiveDate: yesterdayStr, updatedAt: new Date() })
    .where(eq(usersTable.id, user.id));

  res.json({
    success: true,
    message: "Streak freeze applied. Log an action today to extend your streak.",
    streakDays: user.streakDays,
  });
});

// GET /api/users/stats
router.get("/stats", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [actionCount] = await db.select({ count: count() }).from(actionsTable).where(eq(actionsTable.userId, user.id));
  const [weekActions] = await db.select({ count: count() }).from(actionsTable).where(
    sql`${actionsTable.userId} = ${user.id} AND ${actionsTable.completedAt} >= ${weekAgo}`
  );
  const [currentSelf] = await db.select().from(futureSelfTable).where(
    sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'current'`
  );

  const joinedDaysAgo = Math.floor((today.getTime() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  res.json({
    streakDays: user.streakDays,
    totalActions: actionCount.count,
    currentChapter: user.currentChapter,
    overallScore: currentSelf?.overallScore ?? 50,
    joinedDaysAgo,
    actionsThisWeek: weekActions.count,
  });
});

// ── Helpers shared by the delete endpoint and the drain worker ────────────────

// Subscription statuses that can and must be cancelled before deleting a customer.
const CANCELLABLE_STATUSES = new Set(["active", "trialing", "past_due", "paused"]);

/** Return true if a Stripe error indicates the resource is already gone. */
function stripeResourceGone(err: any): boolean {
  return (
    err?.statusCode === 404 ||
    err?.code === "resource_missing" ||
    String(err?.message ?? "").toLowerCase().includes("no such customer") ||
    String(err?.message ?? "").toLowerCase().includes("no such subscription")
  );
}

/**
 * Cancel all cancellable Stripe subscriptions and delete the Stripe customer.
 * Also removes the synced stripe.* rows from the local DB immediately.
 *
 * Idempotent: "resource not found" responses from Stripe are treated as
 * already purged so retries succeed without re-fetching a nonexistent customer.
 *
 * No-op if stripeCustomerId is null/undefined.
 * THROWS on unexpected Stripe API errors — the caller must not proceed with
 * account deletion so the user can retry once Stripe is reachable again.
 */
export async function purgeStripeData(stripeCustomerId: string | null | undefined): Promise<void> {
  if (!stripeCustomerId) return;

  const stripe = await getUncachableStripeClient();

  // Enumerate ALL subscriptions (paginated) to catch every cancellable state:
  // active, trialing, past_due, paused — not just "active".
  // If the customer is already gone, treat it as already purged.
  let toCancel: string[] = [];
  try {
    let lastId: string | undefined;
    do {
      const page = await stripe.subscriptions.list({
        customer: stripeCustomerId,
        status: "all",
        limit: 100,
        ...(lastId ? { starting_after: lastId } : {}),
      });
      for (const sub of page.data) {
        if (CANCELLABLE_STATUSES.has(sub.status)) toCancel.push(sub.id);
      }
      lastId = page.has_more ? page.data[page.data.length - 1].id : undefined;
    } while (lastId);
  } catch (listErr: any) {
    if (stripeResourceGone(listErr)) {
      // Customer already deleted from Stripe — clean up local rows and return.
      await db.execute(sql`DELETE FROM stripe.subscriptions WHERE customer = ${stripeCustomerId}`);
      await db.execute(sql`DELETE FROM stripe.customers WHERE id = ${stripeCustomerId}`);
      return;
    }
    throw listErr;
  }

  // Cancel each subscription — treat already-cancelled/missing as success.
  await Promise.all(
    toCancel.map((id) =>
      stripe.subscriptions.cancel(id).catch((err: any) => {
        if (!stripeResourceGone(err)) throw err;
        // Already cancelled — idempotent, continue.
      })
    )
  );

  // Delete the Stripe customer — sends lifecycle webhooks and removes
  // associated payment methods / invoices from Stripe's systems.
  // Treat already-deleted as success.
  await stripe.customers.del(stripeCustomerId).catch((err: any) => {
    if (!stripeResourceGone(err)) throw err;
  });

  // Remove synced rows from the local stripe.* schema immediately so PII
  // is not retained while waiting for webhook delivery.
  await db.execute(sql`DELETE FROM stripe.subscriptions WHERE customer = ${stripeCustomerId}`);
  await db.execute(sql`DELETE FROM stripe.customers WHERE id = ${stripeCustomerId}`);
}

/**
 * Atomically delete all DB rows owned by a user.
 * Idempotent — calling it when the user no longer exists is a no-op.
 *
 * user_chapters has no cascade FK from users and must be deleted explicitly.
 * All other user-owned tables declare ON DELETE CASCADE from users(id).
 * The pending_deletions row also cascades away when users(id) is deleted,
 * so no separate clearPendingDeletion call is needed after this succeeds.
 *
 * Stripe cleanup is NOT included here because stripeCustomerId must be read
 * before the user row is deleted. Call purgeStripeData() first.
 */
export async function purgeUserDbData(userId: number): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(userChaptersTable).where(eq(userChaptersTable.userId, userId));
    await tx.delete(usersTable).where(eq(usersTable.id, userId));
  });
}

// DELETE /api/users/me
//
// Deletion order — every step is retryable until committed:
//   1. Stripe   — cancel subscriptions + delete customer. Blocking: if this
//                 throws, return 500 and the user can retry (Clerk session intact).
//   2. pending  — insert intent row (clerk_deleted_at = NULL).
//   3. Clerk    — delete identity. Blocking on non-404 failure.
//   4. stamp    — set clerk_deleted_at = NOW() (best-effort; drain recovers).
//   5. DB purge — user_chapters + users (cascade + FK removes pending row).
//                 Blocking: if fails, drain worker retries automatically.
router.delete("/me", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const clerkId = user.clerkId as string;

  // Step 1 — Stripe cleanup (blocking; all subsequent steps are irreversible).
  // Must run first so stripeCustomerId is still on the user row, and so the
  // user can retry with their Clerk session if Stripe is temporarily unavailable.
  // After success, immediately null out stripeCustomerId in the DB so any
  // retry skips Stripe cleanup entirely (the idempotency checkpoint).
  try {
    await purgeStripeData(user.stripeCustomerId);
    if (user.stripeCustomerId) {
      await db.execute(
        sql`UPDATE users SET stripe_customer_id = NULL WHERE id = ${user.id}`
      );
    }
  } catch (stripeErr: any) {
    console.error(`Account deletion: Stripe cleanup failed for userId=${user.id}:`, stripeErr?.message ?? stripeErr);
    res.status(500).json({
      error: "Could not cancel your subscription. Please try again, or contact support if the problem persists.",
    });
    return;
  }

  // Step 2 — record deletion intent (clerk_deleted_at = NULL).
  await db.execute(
    sql`INSERT INTO pending_deletions (user_id, clerk_id, clerk_deleted_at)
        VALUES (${user.id}, ${clerkId}, NULL)
        ON CONFLICT (user_id) DO NOTHING`
  );

  // Step 3 — delete the Clerk identity (blocking on non-404 failures).
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    await clerk.users.deleteUser(clerkId);
  } catch (err: any) {
    const isNotFound =
      err?.status === 404 ||
      String(err?.message ?? "").toLowerCase().includes("not found");
    if (!isNotFound) {
      console.error(`Account deletion: Clerk removal failed for userId=${user.id}:`, err?.message ?? err);
      res.status(500).json({ error: "Could not remove authentication credentials. Please try again." });
      return;
    }
    // 404 = already deleted — treat as confirmed.
  }

  // Step 4 — stamp clerk_deleted_at (best-effort; drain worker recovers via Clerk API).
  try {
    await db.execute(
      sql`UPDATE pending_deletions SET clerk_deleted_at = NOW() WHERE user_id = ${user.id}`
    );
  } catch (stampErr: any) {
    console.error(
      `Account deletion: failed to stamp clerk_deleted_at for userId=${user.id}. ` +
      `Drain worker will verify via Clerk API. Error: ${stampErr?.message ?? stampErr}`
    );
  }

  // Step 5 — atomically delete all user DB data.
  // On success the FK cascade removes the pending row automatically.
  // On failure the pending row stays and the drain worker retries.
  try {
    await purgeUserDbData(user.id);
  } catch (dbErr: any) {
    console.error(
      `Account deletion: DB cleanup failed for userId=${user.id} (drain worker will retry). ` +
      `Error: ${dbErr?.message ?? dbErr}`
    );
    res.status(500).json({ error: "Account data could not be fully removed. Please contact support." });
    return;
  }

  res.status(204).end();
});

export default router;
