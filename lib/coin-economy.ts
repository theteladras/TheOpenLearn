import type { UserPlan } from "@prisma/client";

export const COIN_START_JOURNEY_FREE = 10;
/** Awarded when a phase with 2+ tasks is fully completed (not for single-task phases). */
export const COIN_TOPIC_COMPLETE = 10;
export const COIN_JOURNEY_COMPLETE = 15;
export const COIN_REFERRAL = 30;
export const COIN_MONTHLY_GRANT = 30;
export const COIN_INITIAL_BALANCE = 50;
/** Bonus when learner leaves substantial reflection notes. */
export const COIN_REFLECTION_BONUS = 5;
export const REFLECTION_MIN_CHARS = 150;
/** Extra bonus when a free user completes the entire roadmap (awarded once with journey completion, not per task). */
export const COIN_EXCELLENCE_BONUS = 10;
/** Per message when asking the task-scoped AI coach (free plan only; PRO skips coin economy). */
export const COIN_TASK_AI_MESSAGE = 1;
/** One-time purchase for an AI-generated lesson handbook PDF (free plan; PRO included at no cost). */
export const COIN_LESSON_HANDBOOK = 12;

export function currentCalendarPeriod(d = new Date()): number {
  return d.getFullYear() * 100 + (d.getMonth() + 1);
}

export function skipsCoinEconomy(plan: UserPlan): boolean {
  return plan === "PRO";
}

/** Coins when the only task in a phase is completed — avoids the full phase bonus for trivial one-task phases. */
export function coinsForSingleTaskPhaseComplete(xpReward: number): number {
  const scaled = Math.round(xpReward / 6);
  return Math.min(8, Math.max(3, scaled));
}
