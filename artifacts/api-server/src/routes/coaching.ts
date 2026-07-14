import { Router } from "express";
import { db, coachingMessagesTable, coachingInsightsTable, missionsTable, actionsTable, futureSelfTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { generateCoachResponse } from "../lib/ai";

const router = Router();

// ─── Build a rich, real-time context string for the AI ───────────────────────
// Fetches today's missions + completion flags, today's logged actions, and
// current life-area scores in parallel so the coach knows exactly where the
// user stands RIGHT NOW — not just their static profile.
async function buildUserContext(userId: number, user: any): Promise<string> {
  const todayStr = new Date().toISOString().split("T")[0];

  const [todaysMissions, todaysActions, currentScores] = await Promise.all([
    db
      .select()
      .from(missionsTable)
      .where(sql`${missionsTable.userId} = ${userId} AND ${missionsTable.date} = ${todayStr}`)
      .then((rows) => rows[0] ?? null),

    db
      .select({ type: actionsTable.type })
      .from(actionsTable)
      .where(sql`${actionsTable.userId} = ${userId} AND DATE(${actionsTable.completedAt}) = ${todayStr}`),

    db
      .select()
      .from(futureSelfTable)
      .where(sql`${futureSelfTable.userId} = ${userId} AND ${futureSelfTable.timeframe} = 'current'`)
      .then((rows) => rows[0] ?? null),
  ]);

  // ── Profile + streak ──────────────────────────────────────────────────────
  const base = `Name: ${user.name}, Career: ${user.career || "not specified"}, Goals: ${user.mainGoals || "not specified"}, Struggles: ${user.biggestStruggles || "not specified"}, Streak: ${user.streakDays} days`;

  // ── Today's actions ───────────────────────────────────────────────────────
  const actionTypes = todaysActions.map((a) => a.type);
  const actionLine =
    actionTypes.length > 0
      ? `Actions logged today (${actionTypes.length}): ${actionTypes.map((t) => t.replace(/_/g, " ")).join(", ")}`
      : "No actions logged today yet — the day is still open";

  // ── Life-area scores ──────────────────────────────────────────────────────
  const scoreLine = currentScores
    ? `Life scores — Health: ${Math.round(currentScores.healthScore)}, Discipline: ${Math.round(currentScores.disciplineScore)}, Wealth: ${Math.round(currentScores.wealthScore)}, Knowledge: ${Math.round(currentScores.knowledgeScore)}, Confidence: ${Math.round(currentScores.confidenceScore)}`
    : "";

  // ── Today's missions with real-time completion status ─────────────────────
  let missionLines = "";
  if (todaysMissions) {
    const done = "✓ done";
    const open = "○ not yet";
    missionLines = [
      `\nTODAY'S MISSIONS:`,
      `  Critical [${todaysMissions.criticalCompleted ? done : open}]: ${todaysMissions.criticalMission}`,
      `  Secondary 1 [${todaysMissions.secondary1Completed ? done : open}]: ${todaysMissions.secondaryMission1}`,
      `  Secondary 2 [${todaysMissions.secondary2Completed ? done : open}]: ${todaysMissions.secondaryMission2}`,
      `  Secondary 3 [${todaysMissions.secondary3Completed ? done : open}]: ${todaysMissions.secondaryMission3}`,
      `  Courage Challenge [${todaysMissions.courageCompleted ? done : open}]: ${todaysMissions.courageChallenge}`,
    ].join("\n");
  } else {
    missionLines = "\nNo missions generated yet today.";
  }

  return [base, actionLine, scoreLine, missionLines].filter(Boolean).join(". ");
}

// GET /api/coaching/messages
router.get("/messages", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const messages = await db.select().from(coachingMessagesTable).where(eq(coachingMessagesTable.userId, user.id)).orderBy(coachingMessagesTable.createdAt);
  res.json(messages.map(m => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

// POST /api/coaching/messages
router.post("/messages", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { content } = req.body;

  // Save user message
  await db.insert(coachingMessagesTable).values({ userId: user.id, role: "user", content });

  // Fetch conversation history and rich live context in parallel
  const [history, userContext] = await Promise.all([
    db
      .select()
      .from(coachingMessagesTable)
      .where(eq(coachingMessagesTable.userId, user.id))
      .orderBy(desc(coachingMessagesTable.createdAt))
      .limit(10)
      .then((rows) => rows.reverse().map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))),
    buildUserContext(user.id, user),
  ]);

  const conversationHistory = history.slice(0, -1); // exclude the message we just saved
  const aiResponse = await generateCoachResponse(content, conversationHistory, userContext);

  const [assistantMsg] = await db.insert(coachingMessagesTable).values({
    userId: user.id, role: "assistant", content: aiResponse,
  }).returning();

  res.status(201).json({ ...assistantMsg, createdAt: assistantMsg.createdAt.toISOString() });
});

// GET /api/coaching/insights
router.get("/insights", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  let insights = await db.select().from(coachingInsightsTable).where(eq(coachingInsightsTable.userId, user.id)).orderBy(coachingInsightsTable.priority);

  // Seed default insights if none exist
  if (insights.length === 0) {
    const defaults = [
      { type: "strength", content: `Your commitment to showing up is your greatest asset, ${user.name}. Consistency compounds.`, priority: 1 },
      { type: "recommendation", content: user.mainGoals ? `Focus on: ${user.mainGoals}. Break it into daily 30-minute sessions.` : "Start with one non-negotiable daily habit. Let it anchor your identity.", priority: 2 },
      { type: "warning", content: user.biggestStruggles ? `Watch out for: ${user.biggestStruggles}. This is your biggest saboteur.` : "Avoid the trap of all-or-nothing thinking. Progress beats perfection.", priority: 3 },
    ];
    const created = await db.insert(coachingInsightsTable).values(defaults.map(d => ({ ...d, userId: user.id }))).returning();
    insights = created;
  }

  res.json(insights.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })));
});

export default router;
