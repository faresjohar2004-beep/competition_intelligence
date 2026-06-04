import { Router } from "express";
import { db, chaptersTable, userChaptersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuthWithUser, requireAdmin } from "../lib/auth";

const router = Router();

// GET /api/chapters
router.get("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const chapters = await db.select().from(chaptersTable).orderBy(chaptersTable.number);
  const userChapters = await db.select().from(userChaptersTable).where(eq(userChaptersTable.userId, user.id));
  const ucMap = new Map(userChapters.map(uc => [uc.chapterNumber, uc]));

  res.json(chapters.map(c => ({
    ...c,
    unlocked: ucMap.has(c.number),
    completedAt: ucMap.get(c.number)?.completedAt?.toISOString() ?? null,
    isCurrentChapter: user.currentChapter === c.number,
    createdAt: c.createdAt.toISOString(),
  })));
});

// GET /api/chapters/current
router.get("/current", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const [chapter] = await db.select().from(chaptersTable).where(eq(chaptersTable.number, user.currentChapter));
  if (!chapter) return res.status(404).json({ error: "Not found" });

  const [uc] = await db.select().from(userChaptersTable).where(
    sql`${userChaptersTable.userId} = ${user.id} AND ${userChaptersTable.chapterNumber} = ${chapter.number}`
  );

  res.json({
    ...chapter,
    unlocked: true,
    completedAt: uc?.completedAt?.toISOString() ?? null,
    isCurrentChapter: true,
    createdAt: chapter.createdAt.toISOString(),
  });
});

// POST /api/admin/chapters — handled in admin routes
export default router;
