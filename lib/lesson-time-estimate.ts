/**
 * Active learning time for one lesson (reading, practice, self-check)—not calendar spread.
 */

function wordCount(s: string | null | undefined): number {
  const t = (s ?? "").trim();
  return t ? t.split(/\s+/).filter(Boolean).length : 0;
}

/**
 * Count explicit list steps; if none, infer coarse steps from non-empty instructions length.
 */
export function estimateInstructionSteps(instructions: string | null | undefined): number {
  const body = (instructions ?? "").trim();
  if (!body) return 0;

  let n = 0;
  for (const line of body.split("\n")) {
    if (/^\s*(\d+)[.)]\s+\S/.test(line)) n += 1;
    else if (/^\s*[-*+]\s+\S/.test(line)) n += 1;
  }
  if (n > 0) return Math.min(16, n);

  /* Prose-only instructions: ~one “chunk” per ~500 chars */
  return Math.min(12, Math.max(1, Math.ceil(body.length / 520)));
}

/**
 * Minutes derived only from THIS task’s text, quiz size, and resource count (no model guess).
 */
export function heuristicTaskActiveMinutes(input: {
  explanation: string | null | undefined;
  mentorPerspective: string | null | undefined;
  instructions: string | null | undefined;
  whyMatters: string | null | undefined;
  quizCount: number;
  resourceCount: number;
}): number {
  const readWords = wordCount(
    [
      input.explanation,
      input.whyMatters,
      input.mentorPerspective,
    ].join("\n"),
  );
  /* Study-style reading (~125 wpm effective for technical / retention) */
  const readMin = Math.min(92, Math.max(6, readWords / 125));

  const steps = estimateInstructionSteps(input.instructions);
  const handsOnMin = Math.min(105, steps * 4.2);

  const quizMin = Math.max(0, input.quizCount) * 2.9;

  const rc = Math.max(0, input.resourceCount);
  const resourceMin =
    rc === 0 ? 0 : Math.min(26, 10 + (rc - 1) * 5);

  const raw = readMin + handsOnMin + quizMin + resourceMin;
  return Math.round(Math.min(400, Math.max(12, raw)));
}

export type TaskLessonTimeInput = {
  explanation: string | null | undefined;
  mentorPerspective: string | null | undefined;
  instructions: string | null | undefined;
  whyMatters: string | null | undefined;
  quizCount: number;
  resourceCount: number;
  storedEstimatedMinutes: number | null | undefined;
  xpReward: number;
};

/**
 * Blend model-provided minutes with a content heuristic so the number tracks THIS task’s workload.
 * Call this for UI **and** when persisting `estimatedMinutes` after generation (same inputs → same value).
 */
export function resolveTaskLessonMinutes(input: TaskLessonTimeInput): number {
  const h = heuristicTaskActiveMinutes(input);
  const xpFallback = Math.min(
    400,
    Math.max(
      15,
      Math.round(20 + input.xpReward * 0.55 + input.quizCount * 5),
    ),
  );

  const stored = input.storedEstimatedMinutes;
  if (
    typeof stored === "number" &&
    Number.isFinite(stored) &&
    stored >= 10 &&
    stored <= 400
  ) {
    const rounded = Math.round(stored);
    /* Favor workload inferred from actual fields; keep model as a light anchor */
    return Math.min(
      400,
      Math.max(12, Math.round(0.24 * rounded + 0.76 * h)),
    );
  }

  return Math.min(
    400,
    Math.max(12, Math.round(0.64 * h + 0.36 * xpFallback)),
  );
}

/** @deprecated Prefer resolveTaskLessonMinutes with full task fields. */
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
