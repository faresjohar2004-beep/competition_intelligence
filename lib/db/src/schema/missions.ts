import { pgTable, serial, integer, text, boolean, timestamp, date } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const missionsTable = pgTable("missions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  date: date("date").notNull(),
  criticalMission: text("critical_mission").notNull(),
  secondaryMission1: text("secondary_mission_1").notNull(),
  secondaryMission2: text("secondary_mission_2").notNull(),
  secondaryMission3: text("secondary_mission_3").notNull(),
  courageChallenge: text("courage_challenge").notNull(),
  criticalCompleted: boolean("critical_completed").notNull().default(false),
  secondary1Completed: boolean("secondary_1_completed").notNull().default(false),
  secondary2Completed: boolean("secondary_2_completed").notNull().default(false),
  secondary3Completed: boolean("secondary_3_completed").notNull().default(false),
  courageCompleted: boolean("courage_completed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Mission = typeof missionsTable.$inferSelect;
