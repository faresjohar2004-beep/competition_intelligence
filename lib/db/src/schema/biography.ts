import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const biographyTable = pgTable("biography", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  content: text("content").notNull(),
  chapterNumber: integer("chapter_number").notNull().default(1),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBiographySchema = createInsertSchema(biographyTable).omit({ id: true, createdAt: true });
export type InsertBiography = z.infer<typeof insertBiographySchema>;
export type Biography = typeof biographyTable.$inferSelect;
