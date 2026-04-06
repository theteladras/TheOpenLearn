import type { ClusterProgressRow } from "@/lib/knowledge-macro-groups";
import {
  TOPIC_CLUSTER_KEYS,
  type TopicClusterKey,
} from "@/lib/topic-cluster";

/** Topic buckets shown on the life map ring (everything except the general core). */
export const KNOWLEDGE_MAP_RING_KEYS = TOPIC_CLUSTER_KEYS.filter(
  (k): k is Exclude<TopicClusterKey, "general"> => k !== "general",
);

export type KnowledgeMapAnalysis = {
  totalDone: number;
  totalLessons: number;
  spheresWithLessons: number;
  spheresWithProgress: number;
  topByDone: ClusterProgressRow | null;
  secondByDone: ClusterProgressRow | null;
  /** Smallest completion share among spheres that still have undone lessons. */
  weakestActive: ClusterProgressRow | null;
};

function rowByKey(
  rows: ClusterProgressRow[],
): Record<TopicClusterKey, ClusterProgressRow> {
  const m = {} as Record<TopicClusterKey, ClusterProgressRow>;
  for (const r of rows) m[r.key] = r;
  return m;
}

/** Derive copy for “where you are” from per-cluster progress. */
export function analyzeKnowledgeMap(
  rows: ClusterProgressRow[],
): KnowledgeMapAnalysis {
  const map = rowByKey(rows);
  const totalDone = rows.reduce((s, r) => s + r.done, 0);
  const totalLessons = rows.reduce((s, r) => s + r.total, 0);

  const ringRows = KNOWLEDGE_MAP_RING_KEYS.map((k) => map[k]!);
  const spheresWithLessons = ringRows.filter((r) => r.total > 0).length;
  const spheresWithProgress = ringRows.filter((r) => r.done > 0).length;

  const activeRing = ringRows.filter((r) => r.total > 0);
  const sortedByDone = [...activeRing].sort((a, b) => {
    if (b.done !== a.done) return b.done - a.done;
    return b.done / Math.max(1, b.total) - a.done / Math.max(1, a.total);
  });

  const topByDone =
    sortedByDone[0] && sortedByDone[0].done > 0 ? sortedByDone[0]! : null;
  const secondByDone =
    sortedByDone[1] && sortedByDone[1].done > 0 ? sortedByDone[1]! : null;

  const incomplete = activeRing.filter((r) => r.done < r.total);
  let weakestActive: ClusterProgressRow | null = null;
  if (incomplete.length > 0) {
    incomplete.sort(
      (a, b) =>
        a.done / Math.max(1, a.total) - b.done / Math.max(1, b.total) ||
        a.done - b.done,
    );
    weakestActive = incomplete[0]!;
  }

  return {
    totalDone,
    totalLessons,
    spheresWithLessons,
    spheresWithProgress,
    topByDone,
    secondByDone,
    weakestActive,
  };
}
