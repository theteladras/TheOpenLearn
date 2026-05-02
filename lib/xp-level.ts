/**
 * Learner level from lifetime XP. Single source of truth for dashboard, rankings, and profiles.
 *
 * Each segment of XP to reach the *next* level is ~30% larger than the previous segment:
 * `gap = round(previousGap * RATIO)` with RATIO = 1.3. First segment (level 1 → 2) is FIRST_LEVEL_GAP.
 */
const RATIO = 1.3;
/** XP required to go from level 1 → 2. */
const FIRST_LEVEL_GAP = 50;

/** Hard cap on stored task reward (matches generation prompt ceiling + margin). */
export const MAX_TASK_XP_REWARD = 120;

/** Max whole levels you can gain from a single lesson completion (task XP + all badges unlocked that click). */
export const MAX_LEVEL_GAIN_PER_TASK_COMPLETE = 2;

export function clampTaskXpReward(xp: number): number {
  const n = Math.floor(Number.isFinite(xp) ? xp : 0);
  return Math.max(0, Math.min(MAX_TASK_XP_REWARD, n));
}

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

/**
 * Largest XP increment allowed so `learnerLevelFromXp(xpBefore + delta) - learnerLevelFromXp(xpBefore) <= maxLevelGain`.
 */
export function maxXpDeltaForLevelGain(
  xpBefore: number,
  maxLevelGain: number,
): number {
  const x = Math.max(0, Math.floor(Number.isFinite(xpBefore) ? xpBefore : 0));
  if (maxLevelGain < 1) return 0;
  const lb = learnerLevelFromXp(x);
  const capLevel = lb + maxLevelGain;
  const maxTotal = xpAtLevelStart(capLevel + 1) - 1;
  return Math.max(0, maxTotal - x);
}

/** XP fill within the current level (for progress bars). */
export function learnerXpProgress(xp: number): {
  level: number;
  xpTotal: number;
  xpIntoLevel: number;
  xpInSegment: number;
  pct: number;
} {
  const x = Math.max(0, Math.floor(Number.isFinite(xp) ? xp : 0));
  const level = learnerLevelFromXp(xp);
  const start = xpAtLevelStart(level);
  const end = xpAtLevelStart(level + 1);
  const segment = Math.max(1, end - start);
  const into = Math.max(0, Math.min(segment, x - start));
  const pct = (into / segment) * 100;
  return {
    level,
    xpTotal: x,
    xpIntoLevel: into,
    xpInSegment: segment,
    pct,
  };
}
