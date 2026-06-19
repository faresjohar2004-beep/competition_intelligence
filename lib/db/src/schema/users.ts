import { pgTable, serial, text, integer, real, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkId: text("clerk_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  avatarUrl: text("avatar_url"),
  role: text("role").notNull().default("user"),
  onboarded: boolean("onboarded").notNull().default(false),
  age: integer("age"),
  gender: text("gender"),
  height: real("height"),
  weight: real("weight"),
  fitnessLevel: text("fitness_level"),
  incomeRange: text("income_range"),
  career: text("career"),
  mainGoals: text("main_goals"),
  biggestStruggles: text("biggest_struggles"),
  dailyHabits: text("daily_habits"),
  currentChapter: integer("current_chapter").notNull().default(1),
  streakDays: integer("streak_days").notNull().default(0),
  lastActiveDate: text("last_active_date"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  isPro: boolean("is_pro").notNull().default(false),
  tomorrowPromise: text("tomorrow_promise"),
  currentIdentity: text("current_identity"),
  desiredIdentity: text("desired_identity"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
