import { pgTable, serial, integer, real, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const lifeMapTable = pgTable("life_map", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  area: text("area").notNull(), // health|wealth|career|relationships|discipline|knowledge
  score: real("score").notNull().default(50),
  trend: real("trend").notNull().default(0),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const lifeMapHistoryTable = pgTable("life_map_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  area: text("area").notNull(),
  score: real("score").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export const insertLifeMapSchema = createInsertSchema(lifeMapTable).omit({ id: true, updatedAt: true });
export type InsertLifeMap = z.infer<typeof insertLifeMapSchema>;
export type LifeMap = typeof lifeMapTable.$inferSelect;
