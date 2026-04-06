/** Short learning-science and curiosity snippets when a task has no stored funFacts. */
export const LEARNING_SIDE_FACTS_FALLBACK: string[] = [
  "Spaced practice—revisiting material over several days—usually beats rereading the same page once for long-term memory.",
  "Explaining an idea in your own words, even to an imaginary listener, exposes gaps you miss when only skimming.",
  "Trying to recall an answer before peeking at notes (the generation effect) tends to strengthen memory more than passive rereading.",
  "Mixing related problem types feels slower than drilling one kind, but it often builds more flexible understanding.",
  "A little productive struggle while learning usually beats perfectly smooth reading for retention.",
  "Rephrasing your search query once or twice often surfaces surprisingly different (and sometimes better) sources.",
  "Official docs are often written for experts; pairing them with a gentler explainer can save hours when you’re new.",
  "Some memory consolidation happens during rest and sleep—not only at the desk.",
  "Asking yourself “what will I use this for next?” before you read changes what you notice in the material.",
  "Rubber-duck debugging: describing a problem out loud often reveals the fix before anyone else replies.",
  "Calendar time is not the same as focused minutes—a short, phone-free block often beats a long distracted skim.",
  "The first explanation you find may not match how you think; a second source sometimes clicks when the first didn’t.",
  "Tiny self-checks (one question, no notes) separate “I followed along” from “I could apply this tomorrow.”",
  "Naming one thing you’d teach a friend after this lesson is a fast check on whether it actually stuck.",
  "It’s normal for harder material to feel worse during study but test better later—that’s desirable difficulty at work.",
  "Writing a one-sentence summary before you close the tab helps next time you pick the lesson back up.",
  "If a term keeps appearing, looking it up once and adding it to your notes pays off across the whole journey.",
  "Alternating between reading and doing—even briefly—often links concepts to procedures more tightly.",
];

function hashToUint(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Stable, deduped pick of n facts for sidebar variety per task. */
export function pickLearningSideFacts(seed: string, n: number): string[] {
  const pool = LEARNING_SIDE_FACTS_FALLBACK;
  if (pool.length === 0 || n <= 0) return [];
  const count = Math.min(n, pool.length);
  let h = hashToUint(seed);
  const out: string[] = [];
  const used = new Set<number>();
  let guard = 0;
  while (out.length < count && guard < pool.length * 4) {
    guard++;
    h = Math.imul(h, 1664525) + 1013904223;
    const idx = h % pool.length;
    if (used.has(idx)) continue;
    used.add(idx);
    out.push(pool[idx]!);
  }
  return out;
}
