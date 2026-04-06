import { isLessonFinishedWithExam } from "@/lib/lesson-finished";

type PhaseTask = {
  title: string;
  progress: {
    quizPassedAt: Date | null;
    status: string;
  }[];
};

type Phase = {
  title: string;
  tasks: PhaseTask[];
};

/** Build human-readable summaries from parent journey progress (for linked “next chapter” generation). */
export function buildParentContinuationSummaries(parent: { phases: Phase[] }): {
  completedSummary: string;
  notYetCompletedSummary: string | null;
  completedLessonCount: number;
  totalLessonCount: number;
  allLessonsComplete: boolean;
} {
  const completedLines: string[] = [];
  const incompleteLines: string[] = [];
  let completedLessonCount = 0;
  let totalLessonCount = 0;

  parent.phases.forEach((ph, pi) => {
    const done: string[] = [];
    const open: string[] = [];
    for (const task of ph.tasks) {
      totalLessonCount++;
      const p = task.progress[0];
      if (isLessonFinishedWithExam(p)) {
        completedLessonCount++;
        done.push(task.title);
      } else {
        open.push(task.title);
      }
    }
    if (done.length) {
      completedLines.push(`${pi + 1}. ${ph.title}: ${done.join("; ")}`);
    }
    if (open.length) {
      incompleteLines.push(`${pi + 1}. ${ph.title}: ${open.join("; ")}`);
    }
  });

  const allLessonsComplete =
    totalLessonCount > 0 && completedLessonCount === totalLessonCount;

  const completedSummary =
    completedLines.length ?
      completedLines.join("\n")
    : "(No lessons passed the self-check on the prior journey yet.)";

  const notYetCompletedSummary =
    incompleteLines.length ? incompleteLines.join("\n") : null;

  return {
    completedSummary,
    notYetCompletedSummary,
    completedLessonCount,
    totalLessonCount,
    allLessonsComplete,
  };
}

/** Same shape as the legacy full-completion summary (every task title per phase). */
export function buildFullParentTaskSummary(parent: { phases: Phase[] }): string {
  return parent.phases
    .map((ph, pi) => {
      const tt = ph.tasks.map((task) => task.title).join("; ");
      return `${pi + 1}. ${ph.title}: ${tt}`;
    })
    .join("\n");
}
