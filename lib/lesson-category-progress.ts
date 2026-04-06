import { prisma } from "@/lib/db";
import { isLessonFinishedWithExam } from "@/lib/lesson-finished";
import {
  normalizeClusterKey,
  TOPIC_CLUSTER_KEYS,
  type TopicClusterKey,
} from "@/lib/topic-cluster";
import type { ClusterProgressRow } from "@/lib/knowledge-macro-groups";

/** Per canonical topic bucket: lesson totals on active roadmaps vs completed (exam rules apply). */
export async function getLessonCategoryProgress(
  userId: string,
): Promise<ClusterProgressRow[]> {
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId, status: "ACTIVE" },
    include: {
      learningIntent: { select: { topicClusterKey: true } },
      phases: {
        include: {
          tasks: {
            include: { progress: { where: { userId } } },
          },
        },
      },
    },
  });

  const agg: Record<TopicClusterKey, { done: number; total: number }> =
    Object.fromEntries(
      TOPIC_CLUSTER_KEYS.map((k) => [k, { done: 0, total: 0 }]),
    ) as Record<TopicClusterKey, { done: number; total: number }>;

  for (const r of roadmaps) {
    const journeyCluster = r.learningIntent?.topicClusterKey ?? "general";
    for (const ph of r.phases) {
      for (const task of ph.tasks) {
        const cat = normalizeClusterKey(task.lessonCategory ?? journeyCluster);
        agg[cat].total += 1;
        if (isLessonFinishedWithExam(task.progress[0])) {
          agg[cat].done += 1;
        }
      }
    }
  }

  return TOPIC_CLUSTER_KEYS.map((key) => ({
    key,
    done: agg[key].done,
    total: agg[key].total,
  }));
}
