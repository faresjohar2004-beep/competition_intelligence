import { Router } from "express";
import { db, reflectionsTable, actionsTable } from "@workspace/db";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";

const router = Router();

// GET /api/reflections — list last 30
router.get("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const reflections = await db
    .select()
    .from(reflectionsTable)
    .where(eq(reflectionsTable.userId, user.id))
    .orderBy(desc(reflectionsTable.createdAt))
    .limit(30);
  res.json({ reflections });
});

// GET /api/reflections/today — check if reflected today
router.get("/today", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rows = await db
    .select()
    .from(reflectionsTable)
    .where(and(eq(reflectionsTable.userId, user.id), gte(reflectionsTable.createdAt, today)))
    .limit(1);
  res.json({ reflected: rows.length > 0, reflection: rows[0] ?? null });
});

// POST /api/reflections — create + auto-log evidence action
router.post("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const { type = "daily", q1, q2, q3, moodScore } = req.body;

  const [reflection] = await db
    .insert(reflectionsTable)
    .values({ userId: user.id, type, q1, q2, q3, moodScore })
    .returning();

  // Auto-log as evidence in actions table
  await db.insert(actionsTable).values({
    userId: user.id,
    type: "reflection",
    notes: q1 ?? null,
    healthImpact: 0,
    wealthImpact: 0,
    disciplineImpact: 1.5,
    confidenceImpact: 1.5,
    knowledgeImpact: 1.0,
  });

  res.status(201).json({ reflection });
});

export default router;
