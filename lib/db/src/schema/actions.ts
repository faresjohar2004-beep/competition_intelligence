import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const actionsTable = pgTable("actions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // workout|reading|learning|content_creation|meditation|saving|deep_work|sleep|water
  notes: text("notes"),
  healthImpact: real("health_impact").notNull().default(0),
  wealthImpact: real("wealth_impact").notNull().default(0),
  disciplineImpact: real("discipline_impact").notNull().default(0),
  confidenceImpact: real("confidence_impact").notNull().default(0),
  knowledgeImpact: real("knowledge_impact").notNull().default(0),
  completedAt: timestamp("completed_at").notNull().defaultNow(),
});

export const insertActionSchema = createInsertSchema(actionsTable).omit({ id: true, completedAt: true });
export type InsertAction = z.infer<typeof insertActionSchema>;
export type Action = typeof actionsTable.$inferSelect;
