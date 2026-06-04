import { Router } from "express";
import { db, usersTable, futureSelfTable, actionsTable, lifeMapTable, chaptersTable, userChaptersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import { requireAuth, requireAuthWithUser } from "../lib/auth";
import { clampScore, calcOverallScore } from "../lib/scores";

const router = Router();

// GET /api/users/me
router.get("/me", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkId;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({
    ...user,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  });
});

// PATCH /api/users/me
router.patch("/me", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { name, career, mainGoals, biggestStruggles } = req.body;
  const [updated] = await db
    .update(usersTable)
    .set({
      ...(name && { name }),
      ...(career && { career }),
      ...(mainGoals && { mainGoals }),
      ...(biggestStruggles && { biggestStruggles }),
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
});

// POST /api/users/onboard
router.post("/onboard", requireAuth, async (req, res) => {
  const clerkId = (req as any).clerkId;
  const { name, email, avatarUrl, age, gender, height, weight, fitnessLevel, incomeRange, career, mainGoals, biggestStruggles, dailyHabits } = req.body;

  // Upsert user
  let user;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.clerkId, clerkId));
  if (existing) {
    const [updated] = await db.update(usersTable).set({
      name, email: email || existing.email, avatarUrl, age, gender, height, weight, fitnessLevel, incomeRange,
      career, mainGoals, biggestStruggles, dailyHabits, onboarded: true, updatedAt: new Date(),
    }).where(eq(usersTable.id, existing.id)).returning();
    user = updated;
  } else {
    const [created] = await db.insert(usersTable).values({
      clerkId, name, email: email || `${clerkId}@astra.app`, avatarUrl, age, gender, height, weight,
      fitnessLevel, incomeRange, career, mainGoals, biggestStruggles, dailyHabits, onboarded: true,
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

export default router;
