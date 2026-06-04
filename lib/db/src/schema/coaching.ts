import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const coachingMessagesTable = pgTable("coaching_messages", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const coachingInsightsTable = pgTable("coaching_insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // strength|weakness|recommendation|warning
  content: text("content").notNull(),
  priority: integer("priority").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCoachingMessageSchema = createInsertSchema(coachingMessagesTable).omit({ id: true, createdAt: true });
export type InsertCoachingMessage = z.infer<typeof insertCoachingMessageSchema>;
export type CoachingMessage = typeof coachingMessagesTable.$inferSelect;
