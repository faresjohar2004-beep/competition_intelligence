import { Router } from "express";
import { db, usersTable, actionsTable, chaptersTable } from "@workspace/db";
import { eq, count, avg, sql, desc } from "drizzle-orm";
import { requireAdmin } from "../lib/auth";

const router = Router();

// GET /api/admin/users
router.get("/users", requireAdmin, async (req, res) => {
  const users = await db.select().from(usersTable).orderBy(desc(usersTable.createdAt)).limit(100);
  const result = await Promise.all(users.map(async (u) => {
    const [actionCount] = await db.select({ count: count() }).from(actionsTable).where(eq(actionsTable.userId, u.id));
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      onboarded: u.onboarded,
      createdAt: u.createdAt.toISOString(),
      streakDays: u.streakDays,
      totalActions: actionCount.count,
      currentChapter: u.currentChapter,
      role: u.role,
    };
  }));
  res.json(result);
});

// GET /api/admin/metrics
router.get("/metrics", requireAdmin, async (req, res) => {
  const [totalUsersRow] = await db.select({ count: count() }).from(usersTable);
  const [activeUsersRow] = await db.select({ count: count() }).from(usersTable).where(sql`${usersTable.streakDays} > 0`);
  const [avgStreakRow] = await db.select({ avg: avg(usersTable.streakDays) }).from(usersTable);
  const [totalActionsRow] = await db.select({ count: count() }).from(actionsTable);

  const actionsByType = await db.select({
    actionType: actionsTable.type,
    count: count(),
  }).from(actionsTable).groupBy(actionsTable.type);

  const chapterDist = await db.select({
    chapterNumber: usersTable.currentChapter,
    userCount: count(),
  }).from(usersTable).groupBy(usersTable.currentChapter).orderBy(usersTable.currentChapter);

  const totalUsers = totalUsersRow.count;
  const activeUsers = activeUsersRow.count;

  res.json({
    totalUsers,
    activeUsers,
    avgStreak: Number(avgStreakRow.avg) || 0,
    totalActionsLogged: totalActionsRow.count,
    retentionRate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
    topActionTypes: actionsByType.map(a => ({
      actionType: a.actionType,
      count: a.count,
      totalHealthImpact: 0, totalWealthImpact: 0, totalDisciplineImpact: 0,
      totalConfidenceImpact: 0, totalKnowledgeImpact: 0,
    })),
    chapterDistribution: chapterDist.map(c => ({
      chapterNumber: c.chapterNumber,
      userCount: c.userCount,
    })),
  });
});

// GET /api/admin/chapters
router.get("/chapters", requireAdmin, async (req, res) => {
  const chapters = await db.select().from(chaptersTable).orderBy(chaptersTable.number);
  res.json(chapters.map(c => ({
    ...c,
    unlocked: true,
    completedAt: null,
    isCurrentChapter: false,
    createdAt: c.createdAt.toISOString(),
  })));
});

// POST /api/admin/chapters
router.post("/chapters", requireAdmin, async (req, res) => {
  const { number, title, subtitle, description, requiredActions } = req.body;
  const [chapter] = await db.insert(chaptersTable).values({ number, title, subtitle, description, requiredActions }).returning();
  res.status(201).json({
    ...chapter,
    unlocked: false,
    completedAt: null,
    isCurrentChapter: false,
    createdAt: chapter.createdAt.toISOString(),
  });
});

export default router;
