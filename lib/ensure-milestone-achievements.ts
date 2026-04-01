import type { GeneratedRoadmap } from "@/types/ai";
import { prisma } from "@/lib/db";
import { clusterAchievementSlug } from "@/lib/cluster-achievements";
import {
  humanizeClusterForAchievement,
  humanizeSkillKeyForAchievement,
  milestoneDescriptionEnglish,
  milestoneTitleEnglish,
} from "@/lib/achievement-humanize";
import { skillAchievementSlug } from "@/lib/skill-achievements";
import {
  TASK_ACHIEVEMENT_KEYS,
  isValidSkillAchievementKeyPart,
} from "@/lib/task-achievement-keys";
import {
  TOPIC_CLUSTER_KEYS,
  isTopicClusterKey,
  type TopicClusterKey,
} from "@/lib/topic-cluster";

const CLUSTER_XP: Record<"once" | "twice" | "many", number> = {
  once: 30,
  twice: 45,
  many: 70,
};

const SKILL_XP: Record<"once" | "twice" | "many", number> = {
  once: 25,
  twice: 40,
  many: 60,
};

const TIERS = ["once", "twice", "many"] as const;

/** Upsert the three milestone rows for topic-cluster achievements (predefined keys only). */
export async function ensureClusterMilestoneAchievements(
  keys: TopicClusterKey[],
): Promise<void> {
  const seen = new Set<TopicClusterKey>();
  for (const key of keys) {
    if (!isTopicClusterKey(key) || seen.has(key)) continue;
    seen.add(key);
    const subject = humanizeClusterForAchievement(key);
    for (const tier of TIERS) {
      const slug = clusterAchievementSlug(key, tier);
      await prisma.achievement.upsert({
        where: { slug },
        create: {
          slug,
          title: milestoneTitleEnglish("cluster", subject, tier),
          description: milestoneDescriptionEnglish("cluster", subject, tier),
          xpBonus: CLUSTER_XP[tier],
          icon: null,
        },
        update: {
          title: milestoneTitleEnglish("cluster", subject, tier),
          description: milestoneDescriptionEnglish("cluster", subject, tier),
          xpBonus: CLUSTER_XP[tier],
        },
      });
    }
  }
}

/** Upsert skill-track milestones. Works for predefined + dynamically discovered slugs. */
export async function ensureSkillMilestoneAchievements(keys: string[]): Promise<void> {
  const seen = new Set<string>();
  for (const raw of keys) {
    if (!isValidSkillAchievementKeyPart(raw) || seen.has(raw)) continue;
    seen.add(raw);
    const subject = humanizeSkillKeyForAchievement(raw);
    for (const tier of TIERS) {
      const slug = skillAchievementSlug(raw, tier);
      await prisma.achievement.upsert({
        where: { slug },
        create: {
          slug,
          title: milestoneTitleEnglish("skill", subject, tier),
          description: milestoneDescriptionEnglish("skill", subject, tier),
          xpBonus: SKILL_XP[tier],
          icon: null,
        },
        update: {
          title: milestoneTitleEnglish("skill", subject, tier),
          description: milestoneDescriptionEnglish("skill", subject, tier),
          xpBonus: SKILL_XP[tier],
        },
      });
    }
  }
}

export async function ensureAllPredefinedMilestones(): Promise<void> {
  await ensureClusterMilestoneAchievements([...TOPIC_CLUSTER_KEYS]);
  await ensureSkillMilestoneAchievements([...TASK_ACHIEVEMENT_KEYS]);
}

/** Collect normalized cluster + skill keys from generated tasks (for milestone upserts). */
export function collectMilestoneKeysFromGenerated(
  generated: GeneratedRoadmap,
): { clusters: TopicClusterKey[]; skills: string[] } {
  const clusters = new Set<TopicClusterKey>();
  const skills = new Set<string>();
  for (const ph of generated.phases) {
    for (const t of ph.tasks) {
      const c = t.lessonCategory;
      if (c && isTopicClusterKey(c)) clusters.add(c);
      for (const k of t.achievementKeys ?? []) {
        if (typeof k === "string" && isValidSkillAchievementKeyPart(k)) {
          skills.add(k);
        }
      }
    }
  }
  return { clusters: [...clusters], skills: [...skills] };
}
