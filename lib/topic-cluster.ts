/** Generic topic buckets for parallel learnings and future community linking. */

export const TOPIC_CLUSTER_KEYS = [
  "general",
  "mathematics",
  "life-sciences",
  "physical-sciences",
  "computing",
  "technology",
  "design",
  "languages",
  "business",
  "arts-humanities",
  "health-wellbeing",
] as const;

export type TopicClusterKey = (typeof TOPIC_CLUSTER_KEYS)[number];

export function isTopicClusterKey(s: string): s is TopicClusterKey {
  return (TOPIC_CLUSTER_KEYS as readonly string[]).includes(s);
}

export function normalizeClusterKey(s: string | null | undefined): TopicClusterKey {
  if (s && isTopicClusterKey(s)) return s;
  return "general";
}

/**
 * Lightweight keyword routing — replace with model output when you wire real AI.
 * Uses subject + title from the understanding step.
 */
export function inferTopicCluster(subject: string, title: string): TopicClusterKey {
  const t = `${subject} ${title}`.toLowerCase();

  if (
    /\b(react|javascript|typescript|programming|code|software|developer|api|backend|frontend|devops|git\b|node\.?js)\b/.test(
      t,
    )
  ) {
    return "computing";
  }
  if (
    /\b(math|mathematics|calculus|algebra|geometry|theorem|matrix|equation|proof|statistics|probability)\b/.test(
      t,
    )
  ) {
    return "mathematics";
  }
  if (
    /\b(biology|cell|dna|rna|ecology|evolution|organism|photosynthesis|mitosis|genetics)\b/.test(
      t,
    )
  ) {
    return "life-sciences";
  }
  if (
    /\b(physics|chemistry|atom|molecule|thermodynamics|quantum|laboratory)\b/.test(t)
  ) {
    return "physical-sciences";
  }
  if (
    /\b(music|design|ux|ui|figma|illustration|drawing|film|photography)\b/.test(t)
  ) {
    if (/\bmusic|song|instrument\b/.test(t)) return "arts-humanities";
    return "design";
  }
  if (/\b(language|spanish|french|german|serbian|english|grammar|writing)\b/.test(t)) {
    return "languages";
  }
  if (/\b(business|marketing|startup|finance|management|sales)\b/.test(t)) {
    return "business";
  }
  if (
    /\b(history|philosophy|literature|psychology|sociology|art\b|culture)\b/.test(t)
  ) {
    return "arts-humanities";
  }
  if (/\b(health|medicine|nutrition|fitness|wellness|therapy)\b/.test(t)) {
    return "health-wellbeing";
  }
  if (
    /\b(ai|machine learning|data science|cloud|kubernetes|docker|security)\b/.test(
      t,
    )
  ) {
    return "technology";
  }

  return "general";
}
