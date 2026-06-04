import { Router } from "express";
import { db, futureSelfTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";

const router = Router();

// GET /api/timeline
router.get("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const [current] = await db.select().from(futureSelfTable).where(
    sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'current'`
  );

  const baseScore = current?.overallScore ?? 50;

  const timelines = {
    current: {
      name: "Current Path",
      description: "If you continue with your current habits and consistency level",
      projectedScore: Math.min(100, baseScore + 8),
      milestones: [
        { month: 3, event: "Minor habit improvements visible", scoreProjection: Math.min(100, baseScore + 2) },
        { month: 6, event: "Friends notice changes in energy", scoreProjection: Math.min(100, baseScore + 5) },
        { month: 12, event: "Steady, modest progress", scoreProjection: Math.min(100, baseScore + 8) },
      ],
    },
    improved: {
      name: "Improved Path",
      description: "With consistent daily actions across all life areas",
      projectedScore: Math.min(100, baseScore + 22),
      milestones: [
        { month: 3, event: "Habits become automatic", scoreProjection: Math.min(100, baseScore + 7) },
        { month: 6, event: "Confidence visibly transformed", scoreProjection: Math.min(100, baseScore + 14) },
        { month: 12, event: "Major life trajectory shift", scoreProjection: Math.min(100, baseScore + 22) },
      ],
    },
    peak: {
      name: "Peak Potential Path",
      description: "Unlocking your maximum potential — every system optimized",
      projectedScore: Math.min(100, baseScore + 42),
      milestones: [
        { month: 3, event: "Identity transformation begins", scoreProjection: Math.min(100, baseScore + 14) },
        { month: 6, event: "Compounding returns accelerate", scoreProjection: Math.min(100, baseScore + 28) },
        { month: 12, event: "Category-defining life results", scoreProjection: Math.min(100, baseScore + 42) },
      ],
    },
  };

  res.json(timelines);
});

export default router;
