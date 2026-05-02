import { isLessonFinishedWithExam } from "@/lib/lesson-finished";
import { progressPercent } from "@/lib/journey-stats";

type TaskProgressSlice = { status: string; quizPassedAt: Date | null } | undefined;

export type DashboardRoadmapPhase = {
  id: string;
  title: string;
  order: number;
  tasks: {
    id: string;
    title: string;
    order: number;
    progress: TaskProgressSlice[];
  }[];
};

export type DashboardRoadmapForWorkspace = {
  id: string;
  title: string;
  phases: DashboardRoadmapPhase[];
};

function orderedTasks(roadmap: DashboardRoadmapForWorkspace) {
  const phases = [...roadmap.phases].sort((a, b) => a.order - b.order);
  const out: DashboardRoadmapPhase["tasks"][number][] = [];
  for (const ph of phases) {
    out.push(...[...ph.tasks].sort((a, b) => a.order - b.order));
  }
  return out;
}

/** Prefer link to first AVAILABLE lesson; otherwise roadmap overview. */
export function getContinueHref(roadmap: DashboardRoadmapForWorkspace): string {
  for (const t of orderedTasks(roadmap)) {
    const st = t.progress[0]?.status ?? "LOCKED";
    if (st === "AVAILABLE") {
      return `/roadmap/${roadmap.id}/task/${t.id}`;
    }
  }
  return `/roadmap/${roadmap.id}`;
}

export type UpNextItem = { title: string; href: string };

/** Next lessons in sequence: current available + following task (even if locked). */
export function buildUpNextItems(
  roadmap: DashboardRoadmapForWorkspace | null,
  limit: number,
): UpNextItem[] {
  if (!roadmap || limit <= 0) return [];
  const tasks = orderedTasks(roadmap);
  const availIdx = tasks.findIndex(
    (t) => (t.progress[0]?.status ?? "LOCKED") === "AVAILABLE",
  );
  const out: UpNextItem[] = [];
  if (availIdx === -1) {
    const firstIncomplete = tasks.findIndex(
      (t) => !isLessonFinishedWithExam(t.progress[0]),
    );
    if (firstIncomplete >= 0) {
      const t = tasks[firstIncomplete];
      const st = t.progress[0]?.status ?? "LOCKED";
      const href =
        st === "AVAILABLE" ?
          `/roadmap/${roadmap.id}/task/${t.id}`
        : `/roadmap/${roadmap.id}`;
      out.push({ title: t.title, href });
    }
    return out.slice(0, limit);
  }
  for (let i = availIdx; i < tasks.length && out.length < limit; i++) {
    const t = tasks[i];
    const st = t.progress[0]?.status ?? "LOCKED";
    const href =
      st === "AVAILABLE" ?
        `/roadmap/${roadmap.id}/task/${t.id}`
      : `/roadmap/${roadmap.id}`;
    out.push({ title: t.title, href });
  }
  return out;
}

export function featuredProgressPct(
  roadmap: DashboardRoadmapForWorkspace | null,
): number {
  if (!roadmap) return 0;
  let total = 0;
  let completed = 0;
  for (const p of roadmap.phases) {
    for (const task of p.tasks) {
      total++;
      if (isLessonFinishedWithExam(task.progress[0])) completed++;
    }
  }
  return progressPercent(completed, total);
}
