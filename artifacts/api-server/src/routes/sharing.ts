import { Router } from "express";
import { db, futureSelfTable, chaptersTable, lifeMapTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";

const router = Router();

// GET /api/sharing/card
router.get("/card", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const [current] = await db.select().from(futureSelfTable).where(
    sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'current'`
  );
  const [chapter] = await db.select().from(chaptersTable).where(eq(chaptersTable.number, user.currentChapter));
  const areas = await db.select().from(lifeMapTable).where(eq(lifeMapTable.userId, user.id)).orderBy(desc(lifeMapTable.score)).limit(1);

  res.json({
    userName: user.name,
    overallScore: current?.overallScore ?? 50,
    streakDays: user.streakDays,
    currentChapterTitle: chapter?.title ?? "Awakening",
    topArea: areas[0]?.area ?? "discipline",
    generatedAt: new Date().toISOString(),
  });
});

export default router;
