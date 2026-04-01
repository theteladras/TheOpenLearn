import type { TaskProgressState } from "@prisma/client";

type ProgressSlice = { status: TaskProgressState };

type TaskWithProgress = {
  progress: ProgressSlice[];
};

type PhaseWithTasks = {
  tasks: TaskWithProgress[];
};

export type RoadmapWithPhaseProgress = {
  phases: PhaseWithTasks[];
};

export function countRoadmapTasks(roadmap: RoadmapWithPhaseProgress): {
  total: number;
  completed: number;
} {
  let total = 0;
  let completed = 0;
  for (const p of roadmap.phases) {
    for (const task of p.tasks) {
      total++;
      if (task.progress[0]?.status === "COMPLETED") completed++;
    }
  }
  return { total, completed };
}

export function countPhasesDone(roadmap: RoadmapWithPhaseProgress): {
  total: number;
  completed: number;
} {
  let total = roadmap.phases.length;
  let completed = 0;
  for (const p of roadmap.phases) {
    if (
      p.tasks.length > 0 &&
      p.tasks.every((t) => t.progress[0]?.status === "COMPLETED")
    ) {
      completed++;
    }
  }
  return { total, completed };
}

export function progressPercent(done: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((done / total) * 100);
}
