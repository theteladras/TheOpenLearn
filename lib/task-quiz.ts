import type { TaskQuizQuestion } from "@/types/ai";

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
