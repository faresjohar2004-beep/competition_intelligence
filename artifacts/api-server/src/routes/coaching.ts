import { Router } from "express";
import { db, coachingMessagesTable, coachingInsightsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { generateCoachResponse } from "../lib/ai";

const router = Router();

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

  // Get history for context
  const history = await db.select().from(coachingMessagesTable).where(eq(coachingMessagesTable.userId, user.id)).orderBy(desc(coachingMessagesTable.createdAt)).limit(10);
  const conversationHistory = history.reverse().map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  const userContext = `Name: ${user.name}, Career: ${user.career || "not specified"}, Goals: ${user.mainGoals || "not specified"}, Struggles: ${user.biggestStruggles || "not specified"}, Streak: ${user.streakDays} days`;

  const aiResponse = await generateCoachResponse(content, conversationHistory.slice(0, -1), userContext);

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
