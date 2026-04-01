import { prisma } from "@/lib/db";
import {
  normalizeClusterKey,
  TOPIC_CLUSTER_KEYS,
  type TopicClusterKey,
} from "@/lib/topic-cluster";

export type ClusterMilestoneTier = "once" | "twice" | "many";

export function clusterAchievementSlug(
  clusterKey: TopicClusterKey,
  tier: ClusterMilestoneTier,
): string {
  return `cluster_${clusterKey}_${tier}`;
}

/** Slugs in a stable display order (all categories × once, twice, many). */
export function allClusterAchievementSlugsInOrder(): string[] {
  const tiers: ClusterMilestoneTier[] = ["once", "twice", "many"];
  const out: string[] = [];
  for (const k of TOPIC_CLUSTER_KEYS) {
    for (const tier of tiers) {
      out.push(clusterAchievementSlug(k, tier));
    }
  }
  return out;
}

export function parseClusterAchievementSlug(slug: string): {
  key: TopicClusterKey;
  tier: ClusterMilestoneTier;
} | null {
  const tiers: ClusterMilestoneTier[] = ["once", "twice", "many"];
  for (const tier of tiers) {
    const suffix = `_${tier}`;
    if (!slug.endsWith(suffix)) continue;
    const prefix = slug.slice(0, -suffix.length);
    if (!prefix.startsWith("cluster_")) continue;
    const raw = prefix.slice("cluster_".length);
    const key = normalizeClusterKey(raw);
    return { key, tier };
  }
  return null;
}

/** Completed lesson counts per category (same rules as dashboard analytics). */
export async function countCompletedTasksPerCategory(
  userId: string,
): Promise<Record<TopicClusterKey, number>> {
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      learningIntent: { select: { topicClusterKey: true } },
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

  const counts = Object.fromEntries(
    TOPIC_CLUSTER_KEYS.map((k) => [k, 0]),
  ) as Record<TopicClusterKey, number>;

  for (const r of roadmaps) {
    const journeyCluster = r.learningIntent?.topicClusterKey ?? "general";
    for (const ph of r.phases) {
      for (const task of ph.tasks) {
        const cat = normalizeClusterKey(
          task.lessonCategory ?? journeyCluster,
        );
        const p = task.progress[0];
        if (p?.status === "COMPLETED") {
          counts[cat] += 1;
        }
      }
    }
  }
  return counts;
}
