import { Router } from "express";
import { db, lettersTable, futureSelfTable, usersTable } from "@workspace/db";
import { eq, sql, desc } from "drizzle-orm";
import { requireAuthWithUser } from "../lib/auth";
import { generateFutureLetter } from "../lib/ai";

const router = Router();

// GET /api/letters
router.get("/", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const letters = await db.select().from(lettersTable).where(eq(lettersTable.userId, user.id)).orderBy(desc(lettersTable.createdAt));
  res.json(letters.map(l => ({ ...l, createdAt: l.createdAt.toISOString() })));
});

// GET /api/letters/latest
router.get("/latest", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const [letter] = await db.select().from(lettersTable).where(eq(lettersTable.userId, user.id)).orderBy(desc(lettersTable.createdAt)).limit(1);
  if (!letter) { res.status(404).json({ error: "No letters yet" }); return; }
  res.json({ ...letter, createdAt: letter.createdAt.toISOString() });
});

// POST /api/letters/generate
router.post("/generate", requireAuthWithUser, async (req, res) => {
  const user = (req as any).user;
  const [current] = await db.select().from(futureSelfTable).where(
    sql`${futureSelfTable.userId} = ${user.id} AND ${futureSelfTable.timeframe} = 'current'`
  );

  const scores = {
    health: current?.healthScore ?? 50,
    wealth: current?.wealthScore ?? 50,
    discipline: current?.disciplineScore ?? 50,
    confidence: current?.confidenceScore ?? 50,
    knowledge: current?.knowledgeScore ?? 50,
  };

  const content = generateFutureLetter(user.name, scores, user.streakDays);
  const tones = ["grateful", "proud", "encouraging", "reflective", "urgent"];
  const emotionalTone = tones[Math.floor(Math.random() * tones.length)];

  const [letter] = await db.insert(lettersTable).values({
    userId: user.id,
    content,
    emotionalTone,
  }).returning();

  res.status(201).json({ ...letter, createdAt: letter.createdAt.toISOString() });
});

export default router;
