import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  icon: text("icon").notNull().default("🏆"),
  category: text("category").notNull().default("general"),
  earnedAt: timestamp("earned_at").notNull().defaultNow(),
});

export type Milestone = typeof milestonesTable.$inferSelect;
