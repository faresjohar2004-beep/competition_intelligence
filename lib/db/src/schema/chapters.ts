import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const chaptersTable = pgTable("chapters", {
  id: serial("id").primaryKey(),
  number: integer("number").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle").notNull(),
  description: text("description").notNull(),
  requiredActions: integer("required_actions").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const userChaptersTable = pgTable("user_chapters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  chapterNumber: integer("chapter_number").notNull(),
  unlocked: boolean("unlocked").notNull().default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertChapterSchema = createInsertSchema(chaptersTable).omit({ id: true, createdAt: true });
export type InsertChapter = z.infer<typeof insertChapterSchema>;
export type Chapter = typeof chaptersTable.$inferSelect;
