/**
 * Curated skill / stack tags lessons can count toward (separate from broad topic clusters).
 * Canonical predefined skill slugs for i18n labels (`TaskAchievementKeys`), mock inference,
 * and default milestone ordering. Valid additional slugs may appear at runtime (see
 * `SKILL_KEY_SLUG_RE`) and are registered via `ensureSkillMilestoneAchievements`.
 */

export const TASK_ACHIEVEMENT_KEYS = [
  "react",
  "nextjs",
  "vue",
  "svelte",
  "angular",
  "javascript",
  "typescript",
  "html_css",
  "tailwindcss",
  "nodejs",
  "python",
  "rust",
  "go",
  "java",
  "csharp",
  "sql",
  "graphql",
  "docker",
  "kubernetes",
  "aws",
  "figma",
  "music_theory",
  "writing",
  "public_speaking",
  "data_analysis",
  "machine_learning",
] as const;

export type TaskAchievementKey = (typeof TASK_ACHIEVEMENT_KEYS)[number];

export function isTaskAchievementKey(s: string): s is TaskAchievementKey {
  return (TASK_ACHIEVEMENT_KEYS as readonly string[]).includes(s);
}

/** Slug segment safe for skill_* achievement IDs and DB storage. */
export const SKILL_KEY_SLUG_RE = /^[a-z][a-z0-9_]{0,40}$/;

export function isValidSkillAchievementKeyPart(s: string): boolean {
  return SKILL_KEY_SLUG_RE.test(s);
}

/**
 * Normalize lesson skill tags: lowercase snake_case, allowlist-friendly slugs.
 * Unknown but valid slugs are kept — `ensureSkillMilestoneAchievements` registers them.
 */
export function normalizeTaskAchievementKeysExtended(
  raw: string[] | null | undefined,
  max = 3,
): string[] {
  if (!raw?.length) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of raw) {
    let k =
      typeof x === "string" ?
        x.trim().toLowerCase().replace(/-/g, "_").replace(/[^a-z0-9_]/g, "")
      : "";
    if (k.length > 0 && k[0] === "_") k = k.replace(/^_+/, "");
    if (!k || !isValidSkillAchievementKeyPart(k) || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
    if (out.length >= max) break;
  }
  return out;
}

/** @deprecated Prefer normalizeTaskAchievementKeysExtended (supports dynamic tracks). */
export function normalizeTaskAchievementKeys(
  raw: string[] | undefined | null,
  max = 3,
): TaskAchievementKey[] {
  return normalizeTaskAchievementKeysExtended(raw, max).filter(
    isTaskAchievementKey,
  ) as TaskAchievementKey[];
}
