import { Router } from "express";
import { db, futureSelfTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { generateProjection } from "../lib/ai";

const router = Router();

// GET /api/future-self
router.get("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const profiles = await db.select().from(futureSelfTable).where(eq(futureSelfTable.userId, user.id));
  res.json(profiles.map(p => ({
    ...p,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  })));
});

// GET /api/future-self/projection
router.get("/projection", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const [current] = await db.select().from(futureSelfTable).where(
    sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'current'`
  );
  if (!current) return res.json({ fitnessProjection: "", wealthProjection: "", disciplineProjection: "", overallNarrative: "", topRecommendation: "" });

  const projection = generateProjection({
    health: current.healthScore,
    wealth: current.wealthScore,
    discipline: current.disciplineScore,
    confidence: current.confidenceScore,
    knowledge: current.knowledgeScore,
  });
  res.json(projection);
});

// GET /api/future-self/scores
router.get("/scores", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  // Generate synthetic score history based on current scores (30 days)
  const [current] = await db.select().from(futureSelfTable).where(
    sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'current'`
  );
  if (!current) return res.json([]);

  const history = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const progress = (30 - i) / 30;
    const noise = () => (Math.random() - 0.5) * 2;
    history.push({
      date: d.toISOString().split("T")[0],
      healthScore: Math.max(30, current.healthScore - (1 - progress) * 15 + noise()),
      wealthScore: Math.max(30, current.wealthScore - (1 - progress) * 12 + noise()),
      disciplineScore: Math.max(30, current.disciplineScore - (1 - progress) * 18 + noise()),
      confidenceScore: Math.max(30, current.confidenceScore - (1 - progress) * 10 + noise()),
      knowledgeScore: Math.max(30, current.knowledgeScore - (1 - progress) * 14 + noise()),
    });
  }
  res.json(history);
});

export default router;
