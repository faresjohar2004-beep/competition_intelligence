import { Router } from "express";
import { db, biographyTable, actionsTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { generateBiographyEntry } from "../lib/ai";

const router = Router();

// GET /api/biography
router.get("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const entries = await db.select().from(biographyTable).where(eq(biographyTable.userId, user.id)).orderBy(desc(biographyTable.createdAt));
  res.json(entries.map(e => ({ ...e, createdAt: e.createdAt.toISOString() })));
});

// POST /api/biography/today
router.post("/today", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const todayStr = new Date().toISOString().split("T")[0];

  // Check if already exists
  const [existing] = await db.select().from(biographyTable).where(
    sql`${biographyTable.userId} = ${user.id} AND ${biographyTable.date} = ${todayStr}`
  );
  if (existing) { res.status(201).json({ ...existing, createdAt: existing.createdAt.toISOString() }); return; }

  // Get today's actions
  const todayActions = await db.select().from(actionsTable).where(
    sql`${actionsTable.userId} = ${user.id} AND DATE(${actionsTable.completedAt}) = ${todayStr}`
  );
  const actionTypes = [...new Set(todayActions.map(a => a.type.replace(/_/g, " ")))];

  const content = generateBiographyEntry(user.name, actionTypes, user.currentChapter);

  const [entry] = await db.insert(biographyTable).values({
    userId: user.id,
    date: todayStr,
    content,
    chapterNumber: user.currentChapter,
  }).returning();

  res.status(201).json({ ...entry, createdAt: entry.createdAt.toISOString() });
});

export default router;
