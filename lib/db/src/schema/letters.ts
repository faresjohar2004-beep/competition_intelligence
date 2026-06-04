import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const lettersTable = pgTable("letters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  emotionalTone: text("emotional_tone"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLetterSchema = createInsertSchema(lettersTable).omit({ id: true, createdAt: true });
export type InsertLetter = z.infer<typeof insertLetterSchema>;
export type Letter = typeof lettersTable.$inferSelect;
