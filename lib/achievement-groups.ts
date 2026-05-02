import type { Achievement } from "@prisma/client";
import { parseClusterAchievementSlug } from "@/lib/cluster-achievements";
import { parseSkillAchievementSlug } from "@/lib/skill-achievements";
import { TASK_ACHIEVEMENT_KEYS } from "@/lib/task-achievement-keys";
import { TOPIC_CLUSTER_KEYS } from "@/lib/topic-cluster";

export type AchievementGroupKind = "core" | "cluster" | "skill" | "other";

export type AchievementGroup = {
  id: string;
  kind: AchievementGroupKind;
  subgroupKey?: string;
  items: Achievement[];
};

const CORE_SLUGS: readonly string[] = [
  "first_step",
  "phase_crusher",
  "consistent_learner",
  "roadmap_finisher",
  "achievement_fan",
  "topic_explorer",
];

function tierOrder(tier: string): number {
  if (tier === "once") return 0;
  if (tier === "twice") return 1;
  if (tier === "many") return 2;
  return 9;
}

/**
 * Partition achievements into collapsible sections: core journey badges,
 * per topic-cluster milestones, per skill-track milestones, then any extras.
 */
export function buildAchievementGroups(
  sortedRows: Achievement[],
): AchievementGroup[] {
  const used = new Set<string>();
  const groups: AchievementGroup[] = [];

  const coreItems = sortedRows.filter((a) => CORE_SLUGS.includes(a.slug));
  coreItems.forEach((a) => used.add(a.id));
  if (coreItems.length > 0) {
    groups.push({ id: "core", kind: "core", items: coreItems });
  }

  for (const key of TOPIC_CLUSTER_KEYS) {
    const items = sortedRows.filter((a) => {
      const p = parseClusterAchievementSlug(a.slug);
      return p?.key === key;
    });
    items.forEach((a) => used.add(a.id));
    if (items.length === 0) continue;
    items.sort((a, b) => {
      const ta = parseClusterAchievementSlug(a.slug)!.tier;
      const tb = parseClusterAchievementSlug(b.slug)!.tier;
      return tierOrder(ta) - tierOrder(tb);
    });
    groups.push({
      id: `cluster:${key}`,
      kind: "cluster",
      subgroupKey: key,
      items,
    });
  }

  const skillKeys = new Set<string>();
  for (const k of TASK_ACHIEVEMENT_KEYS) skillKeys.add(k);
  for (const a of sortedRows) {
    const p = parseSkillAchievementSlug(a.slug);
    if (p) skillKeys.add(p.key);
  }
  const predefined = new Set<string>(TASK_ACHIEVEMENT_KEYS);
  const dynamicSkills = [...skillKeys]
    .filter((k) => !predefined.has(k))
    .sort((a, b) => a.localeCompare(b));
  const skillOrder = [...TASK_ACHIEVEMENT_KEYS, ...dynamicSkills];

  for (const key of skillOrder) {
    const items = sortedRows.filter((a) => {
      const p = parseSkillAchievementSlug(a.slug);
      return p?.key === key;
    });
    items.forEach((a) => used.add(a.id));
    if (items.length === 0) continue;
    items.sort((a, b) => {
      const ta = parseSkillAchievementSlug(a.slug)!.tier;
      const tb = parseSkillAchievementSlug(b.slug)!.tier;
      return tierOrder(ta) - tierOrder(tb);
    });
    groups.push({
      id: `skill:${key}`,
      kind: "skill",
      subgroupKey: key,
      items,
    });
  }

  const otherItems = sortedRows.filter((a) => !used.has(a.id));
  if (otherItems.length > 0) {
    groups.push({ id: "other", kind: "other", items: otherItems });
  }

  return groups;
}

export function countEarnedInGroup(
  items: Pick<Achievement, "id">[],
  earnedSet: Set<string>,
): { earned: number; total: number } {
  const total = items.length;
  const earned = items.filter((a) => earnedSet.has(a.id)).length;
  return { earned, total };
}
