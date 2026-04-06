/**
 * A lesson is treated as fully finished only when it is marked complete
 * and the learner has passed the end-of-lesson exam (quiz).
 */
export function isLessonFinishedWithExam(
  progress:
    | { status: string; quizPassedAt?: Date | string | null | undefined }
    | undefined,
): boolean {
  if (!progress || progress.status !== "COMPLETED") return false;
  const ts = progress.quizPassedAt;
  if (ts == null) return false;
  if (typeof ts === "string" && ts.length === 0) return false;
  return true;
}
