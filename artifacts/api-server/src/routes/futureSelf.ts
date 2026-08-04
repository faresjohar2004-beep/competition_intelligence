import { Router } from "express";
import { db, futureSelfTable, actionsTable } from "@workspace/db";
import { eq, sql, desc, gte } from "drizzle-orm";
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
  if (!current) { res.json({ fitnessProjection: "", wealthProjection: "", disciplineProjection: "", overallNarrative: "", topRecommendation: "" }); return; }

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
// Returns REAL score history reconstructed from actual logged actions.
// Strategy: today's scores are the cumulative total. For each historical day D,
// score_on_D = current_score − sum(impacts from actions logged AFTER day D).
// This gives a genuine upward curve that reflects the user's actual behaviour.
router.get("/scores", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;

  const [current] = await db.select().from(futureSelfTable).where(
    sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'current'`
  );
  if (!current) { res.json([]); return; }

  // Pull ALL of the user's actions so we can reconstruct any window
  const allActions = await db
    .select({
      completedAt: actionsTable.completedAt,
      healthImpact: actionsTable.healthImpact,
      wealthImpact: actionsTable.wealthImpact,
      disciplineImpact: actionsTable.disciplineImpact,
      confidenceImpact: actionsTable.confidenceImpact,
      knowledgeImpact: actionsTable.knowledgeImpact,
    })
    .from(actionsTable)
    .where(eq(actionsTable.userId, user.id));

  const clamp = (v: number) => Math.min(99, Math.max(10, v));

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const history = [];
  for (let i = 29; i >= 0; i--) {
    // End-of-day boundary for this historical slot
    const dayEnd = new Date(today);
    dayEnd.setDate(today.getDate() - i);

    // Sum impacts from every action that happened AFTER this day's boundary
    let futureHealth = 0, futureWealth = 0, futureDiscipline = 0;
    let futureConfidence = 0, futureKnowledge = 0;
    for (const a of allActions) {
      const ts = new Date(a.completedAt);
      if (ts > dayEnd) {
        futureHealth     += a.healthImpact     ?? 0;
        futureWealth     += a.wealthImpact     ?? 0;
        futureDiscipline += a.disciplineImpact ?? 0;
        futureConfidence += a.confidenceImpact ?? 0;
        futureKnowledge  += a.knowledgeImpact  ?? 0;
      }
    }

    const dayDate = new Date(today);
    dayDate.setDate(today.getDate() - i);

    history.push({
      date:              dayDate.toISOString().split("T")[0],
      healthScore:       clamp(current.healthScore     - futureHealth),
      wealthScore:       clamp(current.wealthScore     - futureWealth),
      disciplineScore:   clamp(current.disciplineScore - futureDiscipline),
      confidenceScore:   clamp(current.confidenceScore - futureConfidence),
      knowledgeScore:    clamp(current.knowledgeScore  - futureKnowledge),
    });
  }

  res.json(history);
});

export default router;
