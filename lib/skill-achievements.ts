import { prisma } from "@/lib/db";
import { isLessonFinishedWithExam } from "@/lib/lesson-finished";
import {
  TASK_ACHIEVEMENT_KEYS,
  type TaskAchievementKey,
  isValidSkillAchievementKeyPart,
} from "@/lib/task-achievement-keys";

export type SkillMilestoneTier = "once" | "twice" | "many";

export function skillAchievementSlug(
  key: string,
  tier: SkillMilestoneTier,
): string {
  if (!isValidSkillAchievementKeyPart(key)) {
    throw new Error(`Invalid skill achievement key: ${key}`);
  }
  return `skill_${key}_${tier}`;
}

export function allSkillAchievementSlugsInOrder(): string[] {
  const tiers: SkillMilestoneTier[] = ["once", "twice", "many"];
  const out: string[] = [];
  for (const k of TASK_ACHIEVEMENT_KEYS) {
    for (const tier of tiers) {
      out.push(skillAchievementSlug(k, tier));
    }
  }
  return out;
}

export function parseSkillAchievementSlug(slug: string): {
  key: string;
  tier: SkillMilestoneTier;
} | null {
  const tiers: SkillMilestoneTier[] = ["once", "twice", "many"];
  for (const tier of tiers) {
    const suffix = `_${tier}`;
    if (!slug.endsWith(suffix)) continue;
    if (!slug.startsWith("skill_")) continue;
    const body = slug.slice("skill_".length, -suffix.length);
    if (!isValidSkillAchievementKeyPart(body)) continue;
    return { key: body, tier };
  }
  return null;
}

/** Completed lessons per skill tag (task lists key in achievementKeys). */
export async function countCompletedTasksPerSkillKey(
  userId: string,
): Promise<Record<string, number>> {
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      phases: {
        include: {
          tasks: {
            include: {
              progress: { where: { userId } },
            },
          },
        },
      },
    },
  });

  const counts: Record<string, number> = {};

  for (const r of roadmaps) {
    for (const ph of r.phases) {
      for (const task of ph.tasks) {
        const p = task.progress[0];
        if (!isLessonFinishedWithExam(p)) continue;
        for (const raw of task.achievementKeys) {
          if (!isValidSkillAchievementKeyPart(raw)) continue;
          counts[raw] = (counts[raw] ?? 0) + 1;
        }
      }
    }
  }
  return counts;
}

/** @deprecated Prefer dynamic keys from countCompletedTasksPerSkillKey. */
export async function countCompletedTasksPerKnownSkillOnly(
  userId: string,
): Promise<Record<TaskAchievementKey, number>> {
  const full = await countCompletedTasksPerSkillKey(userId);
  const out = Object.fromEntries(
    TASK_ACHIEVEMENT_KEYS.map((k) => [k, full[k] ?? 0]),
  ) as Record<TaskAchievementKey, number>;
  return out;
}
