import { integer, jsonb, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { ownerPolicies } from "./rls";
import { users } from "./users";

/**
 * Draft answers of the onboarding questionnaire, saved after every step.
 * `answers` is validated with the OnboardingAnswers Zod schema on read and write.
 */
export const onboardingProgress = pgTable(
  "onboarding_progress",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    currentStep: integer("current_step").notNull().default(0),
    answers: jsonb("answers").notNull().default({}),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [...ownerPolicies("onboarding_progress", t.userId)],
).enableRLS();
