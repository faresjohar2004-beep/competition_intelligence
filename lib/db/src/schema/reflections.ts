import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const reflectionsTable = pgTable("reflections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull().default("daily"), // daily | weekly | monthly
  q1: text("q1"), // What identity-aligned action did you take?
  q2: text("q2"), // What did you choose to become today?
  q3: text("q3"), // What would your future self say about this?
  moodScore: integer("mood_score"), // 1-5
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReflectionSchema = createInsertSchema(reflectionsTable).omit({ id: true, createdAt: true });
export type InsertReflection = z.infer<typeof insertReflectionSchema>;
export type Reflection = typeof reflectionsTable.$inferSelect;
