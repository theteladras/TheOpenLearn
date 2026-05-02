import type { TaskQuizQuestion } from "@/types/ai";

/** Parsed self-check bank: one or more interchangeable question sets (rotation on failed attempts). */
export type TaskQuizBank = {
  variants: TaskQuizQuestion[][];
};

export function parseTaskQuizQuestions(raw: unknown): TaskQuizQuestion[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const out: TaskQuizQuestion[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const question = typeof o.question === "string" ? o.question.trim() : "";
    const choices = Array.isArray(o.choices)
      ? o.choices.filter((c): c is string => typeof c === "string" && c.length > 0)
      : [];
    const correctIndex =
      typeof o.correctIndex === "number" &&
      Number.isInteger(o.correctIndex) &&
      o.correctIndex >= 0
        ? o.correctIndex
        : -1;
    if (!question || choices.length < 2 || correctIndex >= choices.length) continue;
    out.push({ question, choices, correctIndex });
  }
  return out;
}

/**
 * Reads stored JSON: legacy plain array of questions, or `{ variants: Question[][] }`.
 */
export function parseTaskQuizBank(raw: unknown): TaskQuizBank {
  if (raw && typeof raw === "object" && !Array.isArray(raw) && "variants" in raw) {
    const v = (raw as { variants: unknown }).variants;
    if (!Array.isArray(v)) return { variants: [] };
    const variants = v
      .map((block) => parseTaskQuizQuestions(block))
      .filter((q) => q.length > 0);
    return { variants };
  }
  const single = parseTaskQuizQuestions(raw);
  if (single.length > 0) return { variants: [single] };
  return { variants: [] };
}

export function taskBankHasQuiz(bank: TaskQuizBank): boolean {
  return bank.variants.some((v) => v.length > 0);
}

/** Same index rule as server grading: `quizFailCount % nonEmptyVariants`. */
export function activeQuizVariant(
  bank: TaskQuizBank,
  quizFailCount: number,
): TaskQuizQuestion[] {
  const variants = bank.variants.filter((v) => v.length > 0);
  if (variants.length === 0) return [];
  const idx =
    ((quizFailCount % variants.length) + variants.length) % variants.length;
  return variants[idx]!;
}

export function quizBankMaxQuestionCount(bank: TaskQuizBank): number {
  if (bank.variants.length === 0) return 0;
  return Math.max(...bank.variants.map((v) => v.length));
}

export function quizBankToJsonValue(
  variants: TaskQuizQuestion[][],
): { variants: TaskQuizQuestion[][] } {
  return { variants };
}

export function gradeQuiz(
  questions: TaskQuizQuestion[],
  answers: number[],
): { passed: boolean; correctCount: number; wrongIndices: number[] } {
  if (questions.length === 0) {
    return { passed: true, correctCount: 0, wrongIndices: [] };
  }
  if (answers.length !== questions.length) {
    return { passed: false, correctCount: 0, wrongIndices: [] };
  }
  let correct = 0;
  const wrongIndices: number[] = [];
  for (let i = 0; i < questions.length; i++) {
    const a = answers[i];
    if (typeof a === "number" && a === questions[i]!.correctIndex) {
      correct++;
    } else {
      wrongIndices.push(i);
    }
  }
  return {
    passed: correct === questions.length,
    correctCount: correct,
    wrongIndices,
  };
}
