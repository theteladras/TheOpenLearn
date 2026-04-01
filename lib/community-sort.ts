import type { CommunityMemberStats } from "@/lib/community-metrics";

export const SORT_MODES = [
  "lessons",
  "rigor",
  "xp",
  "breadth",
  "streak",
  "roadmaps",
] as const;

export type SortMode = (typeof SORT_MODES)[number];

export function parseSortMode(raw: string | undefined): SortMode {
  if (raw && (SORT_MODES as readonly string[]).includes(raw)) {
    return raw as SortMode;
  }
  return "lessons";
}

export function sortMembers(
  list: CommunityMemberStats[],
  sort: SortMode,
): CommunityMemberStats[] {
  const copy = [...list];
  const avgRigor = (m: CommunityMemberStats) =>
    m.tasksDone > 0 ? m.challengeXp / m.tasksDone : 0;
  switch (sort) {
    case "lessons":
      copy.sort((a, b) => b.tasksDone - a.tasksDone);
      break;
    case "rigor":
      copy.sort((a, b) => avgRigor(b) - avgRigor(a));
      break;
    case "xp":
      copy.sort((a, b) => b.xpTotal - a.xpTotal);
      break;
    case "breadth":
      copy.sort((a, b) => b.topicBreadth - a.topicBreadth);
      break;
    case "streak":
      copy.sort((a, b) => b.streakDays - a.streakDays);
      break;
    case "roadmaps":
      copy.sort((a, b) => b.roadmapsDone - a.roadmapsDone);
      break;
    default:
      break;
  }
  return copy;
}
