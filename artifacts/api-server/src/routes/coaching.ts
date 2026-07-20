import { Router } from "express";
import { db, coachingMessagesTable, coachingInsightsTable, coachMemoryTable, missionsTable, actionsTable, futureSelfTable } from "@workspace/db";
import { eq, desc, sql, count } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { generateCoachResponse, generateCoachMemorySummary, generateCoachInsights } from "../lib/ai";

const router = Router();

// ─── Build a rich, real-time context string for the AI ───────────────────────
// Fetches today's missions + completion flags, today's logged actions, and
// current life-area scores in parallel so the coach knows exactly where the
// user stands RIGHT NOW — not just their static profile.
async function buildUserContext(userId: number, user: any): Promise<string> {
  const todayStr = new Date().toISOString().split("T")[0];

  const [todaysMissions, todaysActions, currentScores, coachMemory] = await Promise.all([
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

    // Fetch the pre-computed memory digest of older sessions (if any)
    db
      .select()
      .from(coachMemoryTable)
      .where(eq(coachMemoryTable.userId, userId))
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

  const ctx = [base, actionLine, scoreLine].filter(Boolean).join(". ");
  // Append previous-session memory so the coach never forgets older context
  const memorySection = coachMemory?.summary
    ? `\n\nPREVIOUS SESSION MEMORY: ${coachMemory.summary}`
    : "";
  return ctx + missionLines + memorySection;
}

// ─── Background insights refresh ─────────────────────────────────────────────
// Regenerates the 3 insight cards from real user data (scores, actions, memory).
// Called fire-and-forget — never blocks a response.
async function refreshCoachInsights(userId: number, user: any): Promise<void> {
  try {
    const [currentScores, recentActions, coachMemory] = await Promise.all([
      db
        .select()
        .from(futureSelfTable)
        .where(sql`${futureSelfTable.userId} = ${userId} AND ${futureSelfTable.timeframe} = 'current'`)
        .then((rows) => rows[0] ?? null),
      db
        .select({ type: actionsTable.type })
        .from(actionsTable)
        .where(sql`${actionsTable.userId} = ${userId} AND ${actionsTable.completedAt} >= NOW() - INTERVAL '14 days'`)
        .then((rows) => rows.map((r) => r.type)),
      db
        .select()
        .from(coachMemoryTable)
        .where(eq(coachMemoryTable.userId, userId))
        .then((rows) => rows[0] ?? null),
    ]);

    const lifeScores = currentScores
      ? {
          health: currentScores.healthScore,
          discipline: currentScores.disciplineScore,
          wealth: currentScores.wealthScore,
          knowledge: currentScores.knowledgeScore,
          confidence: currentScores.confidenceScore,
        }
      : null;

    const newInsights = await generateCoachInsights(
      user.name,
      lifeScores,
      recentActions,
      user.streakDays ?? 0,
      user.mainGoals ?? null,
      user.biggestStruggles ?? null,
      coachMemory?.summary ?? null,
    );

    if (!newInsights || newInsights.length < 3) return;

    await db.delete(coachingInsightsTable).where(eq(coachingInsightsTable.userId, userId));
    await db
      .insert(coachingInsightsTable)
      .values(newInsights.map((ins) => ({ userId, type: ins.type, content: ins.content, priority: ins.priority })));
  } catch {
    // non-critical — never surfaces to user
  }
}

// ─── Background memory refresh ────────────────────────────────────────────────
// Summarises all messages outside the live 10-message window and upserts the
// digest. Called fire-and-forget — never blocks a chat response.
async function refreshCoachMemory(userId: number): Promise<void> {
  const allMessages = await db
    .select({ role: coachingMessagesTable.role, content: coachingMessagesTable.content })
    .from(coachingMessagesTable)
    .where(eq(coachingMessagesTable.userId, userId))
    .orderBy(coachingMessagesTable.createdAt);

  // Only summarise the portion outside the live 10-message window
  const toSummarise = allMessages.slice(0, -10);
  if (toSummarise.length < 5) return;

  const summary = await generateCoachMemorySummary(toSummarise);
  if (!summary) return;

  await db
    .insert(coachMemoryTable)
    .values({ userId, summary, messageCount: toSummarise.length, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: coachMemoryTable.userId,
      set: { summary, messageCount: toSummarise.length, updatedAt: new Date() },
    });
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

  // Fire-and-forget background refreshes — never blocks the response.
  // Memory: at 15, 25, 35 … (every 10 after first 15) — summarise older turns.
  // Insights: at 10, 20, 30 … (every 10 from first 10) — regenerate AI insight cards.
  try {
    const [{ value: totalCount }] = await db
      .select({ value: count() })
      .from(coachingMessagesTable)
      .where(eq(coachingMessagesTable.userId, user.id));
    const n = Number(totalCount);
    if (n >= 15 && (n - 15) % 10 === 0) {
      refreshCoachMemory(user.id).catch(() => { /* silent — non-critical */ });
    }
    if (n >= 10 && n % 10 === 0) {
      refreshCoachInsights(user.id, user).catch(() => { /* silent — non-critical */ });
    }
  } catch {
    // non-critical — don't let this break anything
  }
});

// GET /api/coaching/insights
router.get("/insights", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  let insights = await db.select().from(coachingInsightsTable).where(eq(coachingInsightsTable.userId, user.id)).orderBy(coachingInsightsTable.priority);

  // Seed default insights if none exist yet
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

  // Lazy staleness refresh — if insights are older than 7 days and the user has
  // enough coaching history, regenerate them in the background so returning
  // users always see fresh, data-driven cards without waiting.
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oldest = insights[0];
    if (oldest && oldest.createdAt < sevenDaysAgo) {
      const [{ value: msgCount }] = await db
        .select({ value: count() })
        .from(coachingMessagesTable)
        .where(eq(coachingMessagesTable.userId, user.id));
      if (Number(msgCount) >= 10) {
        refreshCoachInsights(user.id, user).catch(() => { /* silent */ });
      }
    }
  } catch {
    // non-critical
  }
});

export default router;
