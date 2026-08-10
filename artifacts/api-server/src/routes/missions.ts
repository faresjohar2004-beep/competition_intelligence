import { Router } from "express";
import { db, usersTable, actionsTable, missionsTable, milestonesTable, futureSelfTable, lifeMapTable, userChaptersTable, chaptersTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { generateDailyMissions } from "../lib/ai";
import { getActionImpact, clampScore, calcOverallScore } from "../lib/scores";
import { localDateStr, localYesterdayStr } from "../lib/dateUtils";
import { computePromiseStreak } from "../lib/promiseStreak";

const router = Router();

// GET /api/missions — get today's missions (generate if needed)
router.get("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  const [existing] = await db
    .select()
    .from(missionsTable)
    .where(sql`${missionsTable.userId} = ${user.id} AND ${missionsTable.date} = ${todayStr}`);

  if (existing) {
    res.json(existing);
    return;
  }

  // Gather context for AI generation
  const recentActions = await db
    .select({ type: actionsTable.type })
    .from(actionsTable)
    .where(sql`${actionsTable.userId} = ${user.id} AND ${actionsTable.completedAt} > NOW() - INTERVAL '7 days'`)
    .limit(20);

  const actionTypes = recentActions.map((a) => a.type);
  const missions = await generateDailyMissions(user.name, actionTypes, user.streakDays);

  const [created] = await db
    .insert(missionsTable)
    .values({
      userId: user.id,
      date: todayStr,
      criticalMission: missions.critical,
      secondaryMission1: missions.secondary[0],
      secondaryMission2: missions.secondary[1],
      secondaryMission3: missions.secondary[2],
      courageChallenge: missions.courage,
    })
    .returning();

  res.json(created);
});

// POST /api/missions/complete — mark a mission slot as completed
// Also logs an action to actionsTable so the streak is protected and evidence is built.
router.post("/complete", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { slot } = req.body as { slot: "critical" | "secondary1" | "secondary2" | "secondary3" | "courage" };
  const todayStr = new Date().toISOString().split("T")[0];

  const fieldMap: Record<string, any> = {
    critical: { criticalCompleted: true },
    secondary1: { secondary1Completed: true },
    secondary2: { secondary2Completed: true },
    secondary3: { secondary3Completed: true },
    courage: { courageCompleted: true },
  };

  if (!fieldMap[slot]) {
    res.status(400).json({ error: "Invalid slot" });
    return;
  }

  // Read the current missions row to check idempotency before any side-effects.
  // This must happen BEFORE the UPDATE so we know whether to apply side-effects.
  const [existing] = await db
    .select()
    .from(missionsTable)
    .where(sql`${missionsTable.userId} = ${user.id} AND ${missionsTable.date} = ${todayStr}`);

  if (!existing) {
    res.status(404).json({ error: "No missions found for today" });
    return;
  }

  // Map slot → the boolean field that records its completion.
  const alreadyCompleted =
    slot === "critical"   ? existing.criticalCompleted   :
    slot === "secondary1" ? existing.secondary1Completed :
    slot === "secondary2" ? existing.secondary2Completed :
    slot === "secondary3" ? existing.secondary3Completed :
    slot === "courage"    ? existing.courageCompleted     : false;

  // Idempotency guard: if the slot is already completed, return the current row
  // without re-applying score / streak / action side-effects.
  if (alreadyCompleted) {
    res.json(existing);
    return;
  }

  // 1. Mark the mission slot complete
  const [updated] = await db
    .update(missionsTable)
    .set(fieldMap[slot])
    .where(sql`${missionsTable.userId} = ${user.id} AND ${missionsTable.date} = ${todayStr}`)
    .returning();

  // 2. Log a "promise" action — completing a mission = keeping a promise.
  //    This protects the streak, adds to the Evidence Vault, and updates life scores.
  const impact = getActionImpact("promise");

  await db.insert(actionsTable).values({
    userId: user.id,
    type: "promise",
    notes: `Mission complete: ${slot}`,
    healthImpact: impact.healthDelta,
    wealthImpact: impact.wealthDelta,
    disciplineImpact: impact.disciplineDelta,
    confidenceImpact: impact.confidenceDelta,
    knowledgeImpact: impact.knowledgeDelta,
  });

  // 3. Update future self scores
  const [current] = await db
    .select()
    .from(futureSelfTable)
    .where(sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'current'`);

  if (current) {
    const h = clampScore(current.healthScore + impact.healthDelta);
    const w = clampScore(current.wealthScore + impact.wealthDelta);
    const d = clampScore(current.disciplineScore + impact.disciplineDelta);
    const c = clampScore(current.confidenceScore + impact.confidenceDelta);
    const k = clampScore(current.knowledgeScore + impact.knowledgeDelta);
    const overall = calcOverallScore({ healthScore: h, wealthScore: w, disciplineScore: d, confidenceScore: c, knowledgeScore: k });

    await db.update(futureSelfTable).set({
      healthScore: h, wealthScore: w, disciplineScore: d,
      confidenceScore: c, knowledgeScore: k, overallScore: overall,
      updatedAt: new Date(),
    }).where(eq(futureSelfTable.id, current.id));

    // Also update 1yr projection proportionally
    const [oneYear] = await db
      .select()
      .from(futureSelfTable)
      .where(sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'one_year'`);

    if (oneYear) {
      await db.update(futureSelfTable).set({
        healthScore: clampScore(oneYear.healthScore + impact.healthDelta * 1.2),
        wealthScore: clampScore(oneYear.wealthScore + impact.wealthDelta * 1.2),
        disciplineScore: clampScore(oneYear.disciplineScore + impact.disciplineDelta * 1.2),
        confidenceScore: clampScore(oneYear.confidenceScore + impact.confidenceDelta * 1.2),
        knowledgeScore: clampScore(oneYear.knowledgeScore + impact.knowledgeDelta * 1.2),
        updatedAt: new Date(),
      }).where(eq(futureSelfTable.id, oneYear.id));
    }
  }

  // 4. Update life map areas
  const areaMap: Record<string, keyof typeof impact> = {
    discipline: "disciplineDelta",
    career: "wealthDelta",
  };
  for (const [area, impactKey] of Object.entries(areaMap)) {
    const delta = impact[impactKey] as number;
    if (delta > 0) {
      await db.update(lifeMapTable).set({
        score: sql`LEAST(100, ${lifeMapTable.score} + ${delta})`,
        trend: delta,
        updatedAt: new Date(),
      }).where(sql`${lifeMapTable.userId} = ${user.id} AND ${lifeMapTable.area} = ${area}`);
    }
  }

  // 5. Protect the streak + update promise streak — use the user's local timezone
  //    so midnight actions are credited to the correct local day, not the UTC day.
  const localToday = localDateStr(user.timezone);
  const yesterdayStr = localYesterdayStr(user.timezone);

  // Action streak update
  const newStreak = user.lastActiveDate !== localToday
    ? (user.lastActiveDate === yesterdayStr ? user.streakDays + 1 : 1)
    : user.streakDays;

  // Promise streak — only credit when there was an outstanding tomorrowPromise.
  // computePromiseStreak also enforces idempotency (same day = no double-credit).
  const { credit: promiseKeptToday, newPromiseStreak } = computePromiseStreak({
    tomorrowPromise: user.tomorrowPromise,
    lastPromiseDate: (user as any).lastPromiseDate as string | null,
    promiseStreak: (user as any).promiseStreak ?? 0,
    localToday,
    localYesterday: yesterdayStr,
  });

  await db.update(usersTable).set({
    ...(user.lastActiveDate !== localToday && { streakDays: newStreak, lastActiveDate: localToday }),
    // Clear tomorrowPromise atomically so the same commitment cannot qualify
    // another day. Write lastPromiseDate only when actually crediting.
    ...(promiseKeptToday && {
      promiseStreak: newPromiseStreak,
      lastPromiseDate: localToday,
      tomorrowPromise: null,
    }),
    updatedAt: new Date(),
  }).where(eq(usersTable.id, user.id));

  // 6. Check chapter unlocks
  const [totalActions] = await db
    .select({ count: count() })
    .from(actionsTable)
    .where(eq(actionsTable.userId, user.id));

  const chapters = await db.select().from(chaptersTable).orderBy(chaptersTable.number);
  for (const chapter of chapters) {
    const [uc] = await db.select().from(userChaptersTable).where(
      sql`${userChaptersTable.userId} = ${user.id} AND ${userChaptersTable.chapterNumber} = ${chapter.number}`
    );
    if (!uc && totalActions.count >= chapter.requiredActions) {
      await db.insert(userChaptersTable).values({ userId: user.id, chapterNumber: chapter.number, unlocked: true });
      await db.update(usersTable).set({ currentChapter: chapter.number, updatedAt: new Date() })
        .where(eq(usersTable.id, user.id));
    }
  }

  res.json(updated);
});

// GET /api/missions/alignment — alignment score + top action
router.get("/alignment", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  // Get today's actions
  const todayActions = await db
    .select()
    .from(actionsTable)
    .where(sql`${actionsTable.userId} = ${user.id} AND DATE(${actionsTable.completedAt}) = ${todayStr}`);

  // Get total actions for milestone checks
  const [totalResult] = await db
    .select({ count: count() })
    .from(actionsTable)
    .where(eq(actionsTable.userId, user.id));

  const totalActions = Number(totalResult?.count || 0);
  const todayCount = todayActions.length;

  // Compute alignment score (0-100) from streak + today actions + overall score
  const streakBonus = Math.min(30, user.streakDays * 2);
  const todayBonus = Math.min(30, todayCount * 6);
  const baseScore = 20 + streakBonus + todayBonus;
  const alignmentScore = Math.min(99, Math.round(baseScore));

  // Determine top action recommendation
  const completedTypes = new Set(todayActions.map((a) => a.type));
  const allTypes = ["workout", "deep_work", "reading", "meditation", "saving", "learning", "content_creation", "sleep", "water"];
  const missing = allTypes.filter((t) => !completedTypes.has(t));
  const topAction = missing[0] ?? "Reflect on your progress and set tomorrow's intention";

  // Check and award milestones
  const earned: string[] = [];

  const milestoneChecks = [
    { key: "first_action", title: "First Step", description: "Logged your first action", icon: "🌱", category: "actions", threshold: 1 },
    { key: "10_actions", title: "Building Momentum", description: "Logged 10 actions", icon: "⚡", category: "actions", threshold: 10 },
    { key: "50_actions", title: "Half Century", description: "Logged 50 actions", icon: "🔥", category: "actions", threshold: 50 },
    { key: "100_actions", title: "Century Club", description: "Logged 100 actions", icon: "💯", category: "actions", threshold: 100 },
    { key: "7_streak", title: "Week Warrior", description: "7-day streak", icon: "🗡️", category: "streak", threshold: 7 },
    { key: "30_streak", title: "Month Master", description: "30-day streak", icon: "🏆", category: "streak", threshold: 30 },
    { key: "90_streak", title: "90-Day Legend", description: "90-day streak", icon: "👑", category: "streak", threshold: 90 },
  ];

  for (const m of milestoneChecks) {
    const [existing] = await db
      .select()
      .from(milestonesTable)
      .where(sql`${milestonesTable.userId} = ${user.id} AND ${milestonesTable.key} = ${m.key}`);

    if (!existing) {
      const value = m.category === "streak" ? user.streakDays : totalActions;
      if (value >= m.threshold) {
        await db.insert(milestonesTable).values({
          userId: user.id,
          key: m.key,
          title: m.title,
          description: m.description,
          icon: m.icon,
          category: m.category,
        });
        earned.push(m.key);
      }
    }
  }

  res.json({
    alignmentScore,
    topAction,
    todayActionsCount: todayCount,
    totalActions,
    newMilestonesEarned: earned,
  });
});

// GET /api/missions/milestones — Hall of Legends
router.get("/milestones", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const milestones = await db
    .select()
    .from(milestonesTable)
    .where(eq(milestonesTable.userId, user.id))
    .orderBy(sql`${milestonesTable.earnedAt} DESC`);

  res.json(milestones.map((m) => ({ ...m, earnedAt: m.earnedAt.toISOString() })));
});

// GET /api/missions/regret — Hall of Regret (computed missed opportunities)
router.get("/regret", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;

  // Look at last 30 days to find gaps
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
  const actions = await db
    .select({ type: actionsTable.type, completedAt: actionsTable.completedAt })
    .from(actionsTable)
    .where(sql`${actionsTable.userId} = ${user.id} AND DATE(${actionsTable.completedAt}) >= ${thirtyDaysAgo}`)
    .orderBy(sql`${actionsTable.completedAt} DESC`);

  // Count by type
  const typeCounts: Record<string, number> = {};
  for (const a of actions) {
    typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
  }

  // Total possible = 30 per type
  const allTypes = [
    { type: "workout", label: "Workouts", impact: "fitness" },
    { type: "deep_work", label: "Deep Work Sessions", impact: "productivity" },
    { type: "reading", label: "Reading Sessions", impact: "knowledge" },
    { type: "meditation", label: "Meditation Sessions", impact: "mental clarity" },
    { type: "saving", label: "Saving Habits", impact: "wealth" },
  ];

  const regrets = allTypes
    .map((t) => {
      const done = typeCounts[t.type] || 0;
      const missed = 30 - done;
      const missedPct = Math.round((missed / 30) * 100);
      const potentialGain = Math.round(missed * 1.8);
      return {
        type: t.type,
        label: t.label,
        impact: t.impact,
        doneCount: done,
        missedCount: missed,
        missedPercentage: missedPct,
        potentialScoreGain: potentialGain,
        message: `If you had completed ${missed} more ${t.label.toLowerCase()} in the last 30 days, your ${t.impact} score could be ${potentialGain}% higher.`,
      };
    })
    .filter((r) => r.missedCount > 0)
    .sort((a, b) => b.potentialScoreGain - a.potentialScoreGain)
    .slice(0, 4);

  res.json(regrets);
});

export default router;
