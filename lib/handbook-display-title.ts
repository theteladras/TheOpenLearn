import { lessonHandbookDocSchema } from "@/server/ai/lesson-handbook-schema";

/** Title shown in lists; falls back to lesson title if JSON is missing or invalid. */
export function handbookDisplayTitle(
  handbookJson: unknown,
  lessonTitle: string,
): string {
  const parsed = lessonHandbookDocSchema.safeParse(handbookJson);
  if (parsed.success) {
    const t = parsed.data.title?.trim();
    if (t) return t.length > 140 ? `${t.slice(0, 137)}…` : t;
  }
  return lessonTitle;
}
