import { Router } from "express";
import { db, lifeMapTable, lifeMapHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";

const router = Router();

// GET /api/life-map
router.get("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const areas = await db.select().from(lifeMapTable).where(eq(lifeMapTable.userId, user.id));
  res.json(areas.map(a => ({ ...a, updatedAt: a.updatedAt.toISOString() })));
});

// GET /api/life-map/history
router.get("/history", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const areas = await db.select().from(lifeMapTable).where(eq(lifeMapTable.userId, user.id));
  const areaNames = ["health", "wealth", "career", "relationships", "discipline", "knowledge"];
  const areaScores = new Map(areas.map(a => [a.area, a.score]));

  // Generate synthetic 30-day history per area
  const today = new Date();
  const result = areaNames.map(area => {
    const currentScore = areaScores.get(area) ?? 50;
    const history = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const progress = (30 - i) / 30;
      history.push({
        date: d.toISOString().split("T")[0],
        score: Math.max(20, currentScore - (1 - progress) * 15 + (Math.random() - 0.5) * 3),
      });
    }
    return { area, history };
  });

  res.json(result);
});

export default router;
