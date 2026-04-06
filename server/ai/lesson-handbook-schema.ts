import { z } from "zod";

function normStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (Array.isArray(val)) {
    return val
      .map((x) => normStr(x))
      .filter((s) => s.length > 0)
      .join("\n\n");
  }
  return "";
}

const modelString = z.preprocess((v) => normStr(v), z.string());

const lessonHandbookSectionSchema = z.object({
  heading: modelString,
  body: modelString,
});

export const lessonHandbookDocSchema = z.object({
  title: modelString,
  subtitle: modelString.optional(),
  sections: z.array(lessonHandbookSectionSchema).min(3).max(10),
  /** Short bullets the learner can scan before a spaced review. */
  quickReference: z.array(modelString).min(2).max(14),
});

export type LessonHandbookDoc = z.infer<typeof lessonHandbookDocSchema>;

/** Inputs for handbook generation (same lesson context shape as the task coach, without chat). */
export type LessonHandbookLLMInput = {
  roadmapTitle: string;
  lessonCategory: string;
  achievementKeys: string[];
  taskTitle: string;
  explanation: string | null;
  whyMatters: string | null;
  mentorPerspective: string | null;
  instructions: string | null;
  recap: string | null;
  resourcesLines: string;
  evaluationSummary: string | null;
  checkpointDescription: string | null;
};

export function parseLessonHandbookDoc(raw: unknown): LessonHandbookDoc {
  return lessonHandbookDocSchema.parse(raw);
}
