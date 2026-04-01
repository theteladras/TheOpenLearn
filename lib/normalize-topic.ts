export function normalizeTopic(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .slice(0, 512);
}

/** MVP: normalized equality, substring, or token overlap (pseudo-semantic). */
export function topicsLikelyDuplicate(a: string, b: string): boolean {
  const na = normalizeTopic(a);
  const nb = normalizeTopic(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;

  const wordsA = new Set(na.split(" ").filter((w) => w.length > 2));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  let inter = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) inter++;
  }
  const union = wordsA.size + wordsB.size - inter;
  const jaccard = inter / union;
  return jaccard >= 0.55;
}
