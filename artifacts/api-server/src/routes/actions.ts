import { Router } from "express";
import { db, actionsTable, futureSelfTable, usersTable, lifeMapTable, userChaptersTable, chaptersTable } from "@workspace/db";
import { eq, sql, count, sum } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { getActionImpact, clampScore, calcOverallScore, type ActionType } from "../lib/scores";
import { localDateStr, localYesterdayStr, pgTimezone } from "../lib/dateUtils";

const router = Router();

// GET /api/actions
router.get("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const limit = Number(req.query.limit) || 50;
  const date = req.query.date as string;

  let query = db.select().from(actionsTable).where(eq(actionsTable.userId, user.id));
  const actions = await db.select().from(actionsTable).where(
    date
      ? sql`${actionsTable.userId} = ${user.id} AND DATE(${actionsTable.completedAt}) = ${date}`
      : eq(actionsTable.userId, user.id)
  ).limit(limit).orderBy(sql`${actionsTable.completedAt} DESC`);

  res.json(actions.map(a => ({ ...a, completedAt: a.completedAt.toISOString() })));
});

// POST /api/actions
router.post("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { type, notes } = req.body;
  const impact = getActionImpact(type as ActionType);

  const [action] = await db.insert(actionsTable).values({
    userId: user.id,
    type,
    notes,
    healthImpact: impact.healthDelta,
    wealthImpact: impact.wealthDelta,
    disciplineImpact: impact.disciplineDelta,
    confidenceImpact: impact.confidenceDelta,
    knowledgeImpact: impact.knowledgeDelta,
  }).returning();

  // Update current future self scores
  const [current] = await db.select().from(futureSelfTable).where(
    sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'current'`
  );

  let newScores = current;
  if (current) {
    const h = clampScore(current.healthScore + impact.healthDelta);
    const w = clampScore(current.wealthScore + impact.wealthDelta);
    const d = clampScore(current.disciplineScore + impact.disciplineDelta);
    const c = clampScore(current.confidenceScore + impact.confidenceDelta);
    const k = clampScore(current.knowledgeScore + impact.knowledgeDelta);
    const overall = calcOverallScore({ healthScore: h, wealthScore: w, disciplineScore: d, confidenceScore: c, knowledgeScore: k });

    const [updated] = await db.update(futureSelfTable).set({
      healthScore: h, wealthScore: w, disciplineScore: d,
      confidenceScore: c, knowledgeScore: k, overallScore: overall,
      updatedAt: new Date(),
    }).where(eq(futureSelfTable.id, current.id)).returning();
    newScores = updated;

    // Update 1yr and 5yr projections proportionally
    const [oneYear] = await db.select().from(futureSelfTable).where(
      sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'one_year'`
    );
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

  // Update life map areas
  const areaMap: Record<string, keyof typeof impact> = {
    health: "healthDelta", wealth: "wealthDelta",
    discipline: "disciplineDelta", career: "wealthDelta", knowledge: "knowledgeDelta",
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

  // Update streak — use the user's local timezone so midnight is correct for their clock,
  // not UTC (which would break streaks for US users logging after ~5–7 PM local time).
  const todayStr = localDateStr(user.timezone);
  if (user.lastActiveDate !== todayStr) {
    const yesterday = localYesterdayStr(user.timezone);
    const newStreak = user.lastActiveDate === yesterday ? user.streakDays + 1 : 1;
    await db.update(usersTable).set({ streakDays: newStreak, lastActiveDate: todayStr, updatedAt: new Date() })
      .where(eq(usersTable.id, user.id));
  }

  // Check chapter unlock
  const [totalActions] = await db.select({ count: count() }).from(actionsTable).where(eq(actionsTable.userId, user.id));
  const chapters = await db.select().from(chaptersTable).orderBy(chaptersTable.number);
  for (const chapter of chapters) {
    const [uc] = await db.select().from(userChaptersTable).where(
      sql`${userChaptersTable.userId} = ${user.id} AND ${userChaptersTable.chapterNumber} = ${chapter.number}`
    );
    if (!uc && totalActions.count >= chapter.requiredActions) {
      await db.insert(userChaptersTable).values({ userId: user.id, chapterNumber: chapter.number, unlocked: true });
      await db.update(usersTable).set({ currentChapter: chapter.number, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
    }
  }

  res.status(201).json({
    action: { ...action, completedAt: action.completedAt.toISOString() },
    scoreImpact: {
      healthDelta: impact.healthDelta,
      wealthDelta: impact.wealthDelta,
      disciplineDelta: impact.disciplineDelta,
      confidenceDelta: impact.confidenceDelta,
      knowledgeDelta: impact.knowledgeDelta,
      message: impact.message,
    },
    newScores: newScores ? { ...newScores, createdAt: newScores.createdAt.toISOString(), updatedAt: newScores.updatedAt.toISOString() } : null,
  });
});

// GET /api/actions/today
router.get("/today", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  // Evaluate the action timestamp in the user's local timezone so actions logged
  // after UTC midnight (but before local midnight) still count as "today".
  const tz = pgTimezone(user.timezone);
  const todayStr = localDateStr(user.timezone);
  const actions = await db.select().from(actionsTable).where(
    sql`${actionsTable.userId} = ${user.id} AND DATE(${actionsTable.completedAt} AT TIME ZONE ${tz}) = ${todayStr}`
  );
  const completedTypes = new Set(actions.map(a => a.type)).size;
  res.json({
    date: todayStr, // local date in user's timezone
    actions: actions.map(a => ({ ...a, completedAt: a.completedAt.toISOString() })),
    completedTypes,
    totalPossibleTypes: 9,
    completionPercentage: Math.round((completedTypes / 9) * 100),
  });
});

// GET /api/actions/impact
router.get("/impact", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const impacts = await db.select({
    actionType: actionsTable.type,
    count: count(),
    totalHealthImpact: sum(actionsTable.healthImpact),
    totalWealthImpact: sum(actionsTable.wealthImpact),
    totalDisciplineImpact: sum(actionsTable.disciplineImpact),
    totalConfidenceImpact: sum(actionsTable.confidenceImpact),
    totalKnowledgeImpact: sum(actionsTable.knowledgeImpact),
  }).from(actionsTable).where(eq(actionsTable.userId, user.id)).groupBy(actionsTable.type);

  res.json(impacts.map(i => ({
    actionType: i.actionType,
    count: i.count,
    totalHealthImpact: Number(i.totalHealthImpact) || 0,
    totalWealthImpact: Number(i.totalWealthImpact) || 0,
    totalDisciplineImpact: Number(i.totalDisciplineImpact) || 0,
    totalConfidenceImpact: Number(i.totalConfidenceImpact) || 0,
    totalKnowledgeImpact: Number(i.totalKnowledgeImpact) || 0,
  })));
});

export default router;
