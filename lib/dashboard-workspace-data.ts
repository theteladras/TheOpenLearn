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

export type PhaseStepState = "done" | "active" | "locked";

export type PhaseStep = {
  id: string;
  title: string;
  state: PhaseStepState;
  /** e.g. "3/5" tasks done in active phase */
  ratioLabel?: string;
};

function countPhaseTasks(phase: DashboardRoadmapPhase): {
  total: number;
  completed: number;
} {
  let total = 0;
  let completed = 0;
  for (const task of phase.tasks) {
    total++;
    if (isLessonFinishedWithExam(task.progress[0])) completed++;
  }
  return { total, completed };
}

export function buildPhaseSteps(
  roadmap: DashboardRoadmapForWorkspace | null,
): PhaseStep[] {
  if (!roadmap?.phases?.length) return [];
  const phases = [...roadmap.phases].sort((a, b) => a.order - b.order);
  let firstIncompleteIdx = -1;
  for (let i = 0; i < phases.length; i++) {
    const { total, completed } = countPhaseTasks(phases[i]);
    if (total === 0) continue;
    if (completed < total) {
      firstIncompleteIdx = i;
      break;
    }
  }
  if (firstIncompleteIdx === -1) {
    return phases.map((p) => ({
      id: p.id,
      title: p.title,
      state: "done" as const,
    }));
  }
  return phases.map((p, i) => {
    const { total, completed } = countPhaseTasks(p);
    if (i < firstIncompleteIdx) {
      return { id: p.id, title: p.title, state: "done" as const };
    }
    if (i > firstIncompleteIdx) {
      return { id: p.id, title: p.title, state: "locked" as const };
    }
    return {
      id: p.id,
      title: p.title,
      state: "active" as const,
      ratioLabel: total > 0 ? `${completed}/${total}` : undefined,
    };
  });
}

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
