import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const futureSelfTable = pgTable("future_self", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  timeframe: text("timeframe").notNull(), // current | one_year | five_years
  healthScore: real("health_score").notNull().default(50),
  wealthScore: real("wealth_score").notNull().default(50),
  disciplineScore: real("discipline_score").notNull().default(50),
  confidenceScore: real("confidence_score").notNull().default(50),
  knowledgeScore: real("knowledge_score").notNull().default(50),
  trajectoryScore: real("trajectory_score").notNull().default(50),
  overallScore: real("overall_score").notNull().default(50),
  characterDescription: text("character_description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertFutureSelfSchema = createInsertSchema(futureSelfTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFutureSelf = z.infer<typeof insertFutureSelfSchema>;
export type FutureSelf = typeof futureSelfTable.$inferSelect;
