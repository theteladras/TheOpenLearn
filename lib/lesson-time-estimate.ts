/**
 * Active learning time for one lesson (reading, practice, self-check)—not calendar spread.
 */
export function resolveTaskEstimatedMinutes(
  fromModel: number | null | undefined,
  xpReward: number,
  quizCount: number,
): number {
  if (typeof fromModel === "number" && Number.isFinite(fromModel)) {
    return Math.min(400, Math.max(10, Math.round(fromModel)));
  }
  return Math.min(
    400,
    Math.max(15, Math.round(20 + xpReward * 0.55 + quizCount * 5)),
  );
}
