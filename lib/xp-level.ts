/**
 * Learner level from lifetime XP. Single source of truth for dashboard, rankings, and profiles.
 *
 * Each segment of XP to reach the *next* level is ~30% larger than the previous segment:
 * `gap = round(previousGap * RATIO)` with RATIO = 1.3. First segment (level 1 → 2) is FIRST_LEVEL_GAP.
 */
const RATIO = 1.3;
/** XP required to go from level 1 → 2. */
const FIRST_LEVEL_GAP = 50;

export function learnerLevelFromXp(xp: number): number {
  const x = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));
  if (x < FIRST_LEVEL_GAP) return 1;
  let level = 2;
  let threshold = FIRST_LEVEL_GAP;
  let gap = Math.round(FIRST_LEVEL_GAP * RATIO);
  while (x >= threshold + gap) {
    threshold += gap;
    level++;
    gap = Math.round(gap * RATIO);
  }
  return level;
}

/** Minimum total XP to be at `level` (1-indexed). Level 1 starts at 0. */
export function xpAtLevelStart(level: number): number {
  if (level <= 1) return 0;
  let threshold = 0;
  let gap = FIRST_LEVEL_GAP;
  for (let l = 2; l <= level; l++) {
    threshold += gap;
    if (l < level) gap = Math.round(gap * RATIO);
  }
  return threshold;
}
