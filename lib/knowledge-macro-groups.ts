import type { TopicClusterKey } from "@/lib/topic-cluster";

/** Coarse lenses for the knowledge map (sciences · tools · people/world). */
export type KnowledgeMacro = "discover" | "build" | "connect";

export function macroForCluster(key: TopicClusterKey): KnowledgeMacro | "general" {
  switch (key) {
    case "mathematics":
    case "life-sciences":
    case "physical-sciences":
      return "discover";
    case "computing":
    case "technology":
    case "design":
      return "build";
    case "languages":
    case "business":
    case "arts-humanities":
    case "health-wellbeing":
      return "connect";
    default:
      return "general";
  }
}

export type ClusterProgressRow = {
  key: TopicClusterKey;
  done: number;
  total: number;
};

/** Roll topic buckets into three lenses. `general` is spread across all three. */
export function aggregateMacroProgress(
  rows: ClusterProgressRow[],
): Record<KnowledgeMacro, { done: number; total: number }> {
  const out: Record<KnowledgeMacro, { done: number; total: number }> = {
    discover: { done: 0, total: 0 },
    build: { done: 0, total: 0 },
    connect: { done: 0, total: 0 },
  };
  for (const row of rows) {
    const m = macroForCluster(row.key);
    if (m === "general") {
      const d = row.done / 3;
      const tot = row.total / 3;
      out.discover.done += d;
      out.discover.total += tot;
      out.build.done += d;
      out.build.total += tot;
      out.connect.done += d;
      out.connect.total += tot;
    } else {
      out[m].done += row.done;
      out[m].total += row.total;
    }
  }
  return out;
}

export function strongestMacroByDone(
  macros: Record<KnowledgeMacro, { done: number; total: number }>,
): KnowledgeMacro | null {
  let best: KnowledgeMacro | null = null;
  let max = -1;
  for (const k of ["discover", "build", "connect"] as const) {
    const d = macros[k].done;
    if (d > max) {
      max = d;
      best = k;
    }
  }
  return max > 0 ? best : null;
}

export type NextTopicSuggestion =
  | { kind: "empty" }
  | { kind: "complete" }
  | { kind: "cluster"; key: TopicClusterKey; done: number; total: number };

/** Prefer finishing an in-progress bucket with the lowest completion ratio. */
export function suggestNextTopicFocus(
  rows: ClusterProgressRow[],
): NextTopicSuggestion {
  const withTasks = rows.filter((r) => r.total > 0);
  if (withTasks.length === 0) return { kind: "empty" };
  const unfinished = withTasks.filter((r) => r.done < r.total);
  if (unfinished.length === 0) return { kind: "complete" };
  unfinished.sort(
    (a, b) => a.done / Math.max(1, a.total) - b.done / Math.max(1, b.total),
  );
  const pick = unfinished[0]!;
  return {
    kind: "cluster",
    key: pick.key,
    done: pick.done,
    total: pick.total,
  };
}
