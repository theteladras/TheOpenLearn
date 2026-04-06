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

/**
 * Normalized lookup key for aliases (lowercase, hyphens, trimmed).
 * Accepts model output like "Life Sciences", "biology", "life_sciences".
 */
function clusterAliasLookupKey(s: string): string {
  return s.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

/**
 * When the model or legacy data uses a plain-language subject instead of the
 * canonical slug, map it so cluster milestones and analytics stay correct.
 */
const LESSON_CATEGORY_ALIASES: Record<string, TopicClusterKey> = {
  // Life sciences
  biology: "life-sciences",
  biochemistry: "life-sciences",
  botany: "life-sciences",
  zoology: "life-sciences",
  microbiology: "life-sciences",
  genetics: "life-sciences",
  genomics: "life-sciences",
  neuroscience: "life-sciences",
  ecology: "life-sciences",
  evolution: "life-sciences",
  physiology: "life-sciences",
  anatomy: "life-sciences",
  ornithology: "life-sciences",
  entomology: "life-sciences",
  "marine-biology": "life-sciences",
  virology: "life-sciences",
  immunology: "life-sciences",
  // Physical sciences
  physics: "physical-sciences",
  chemistry: "physical-sciences",
  astronomy: "physical-sciences",
  astrophysics: "physical-sciences",
  geology: "physical-sciences",
  meteorology: "physical-sciences",
  "materials-science": "physical-sciences",
  // Mathematics & quant
  statistics: "mathematics",
  stats: "mathematics",
  biostatistics: "mathematics",
  econometrics: "mathematics",
  "linear-algebra": "mathematics",
  trigonometry: "mathematics",
  calculus: "mathematics",
  // Computing
  programming: "computing",
  software: "computing",
  "computer-science": "computing",
  informatics: "computing",
  coding: "computing",
  // Technology / infra
  devops: "technology",
  networking: "technology",
  cybersecurity: "technology",
  infosec: "technology",
  "cloud-computing": "technology",
  sre: "technology",
  // Design & product
  ux: "design",
  ui: "design",
  "ui-ux": "design",
  "graphic-design": "design",
  "product-design": "design",
  illustration: "design",
  // Languages & communication
  linguistics: "languages",
  translation: "languages",
  esl: "languages",
  writing: "languages",
  // Business & careers
  marketing: "business",
  sales: "business",
  finance: "business",
  accounting: "business",
  economics: "business",
  entrepreneurship: "business",
  management: "business",
  mba: "business",
  ecommerce: "business",
  branding: "business",
  strategy: "business",
  investing: "business",
  // Arts, humanities & society (politics, music, etc. share this bucket)
  politics: "arts-humanities",
  "political-science": "arts-humanities",
  civics: "arts-humanities",
  government: "arts-humanities",
  governance: "arts-humanities",
  diplomacy: "arts-humanities",
  democracy: "arts-humanities",
  journalism: "arts-humanities",
  law: "arts-humanities",
  history: "arts-humanities",
  philosophy: "arts-humanities",
  literature: "arts-humanities",
  sociology: "arts-humanities",
  anthropology: "arts-humanities",
  geography: "arts-humanities",
  psychology: "arts-humanities",
  ethics: "arts-humanities",
  religion: "arts-humanities",
  theology: "arts-humanities",
  archaeology: "arts-humanities",
  music: "arts-humanities",
  "music-theory": "arts-humanities",
  songwriting: "arts-humanities",
  film: "arts-humanities",
  cinema: "arts-humanities",
  theater: "arts-humanities",
  drama: "arts-humanities",
  "art-history": "arts-humanities",
  // Health
  medicine: "health-wellbeing",
  nursing: "health-wellbeing",
  pharmacy: "health-wellbeing",
  nutrition: "health-wellbeing",
  fitness: "health-wellbeing",
  wellness: "health-wellbeing",
  psychiatry: "health-wellbeing",
  "mental-health": "health-wellbeing",
};

export function normalizeClusterKey(s: string | null | undefined): TopicClusterKey {
  if (s == null || typeof s !== "string") return "general";
  const key = clusterAliasLookupKey(s);
  if (key.length === 0) return "general";
  if (isTopicClusterKey(key)) return key;
  const aliased = LESSON_CATEGORY_ALIASES[key];
  if (aliased) return aliased;
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
    /\b(math|mathematics|calculus|algebra|geometry|theorem|matrix|equation|proof|statistics|probability|econometrics)\b/.test(
      t,
    )
  ) {
    return "mathematics";
  }
  if (
    /\b(biology|biochemistry|botany|zoology|microbiology|neuroscience|cell|dna|rna|ecology|evolution|organism|photosynthesis|mitosis|meiosis|genetics|physiology|anatomy|virology|immunology)\b/.test(
      t,
    )
  ) {
    return "life-sciences";
  }
  if (
    /\b(astronomy|astrophysics|geology|meteorology|physics|chemistry|atom|molecule|thermodynamics|quantum|laboratory)\b/.test(
      t,
    )
  ) {
    return "physical-sciences";
  }
  if (
    /\b(politics|political|political-science|civics|public-policy|governance|diplomacy|election|parliament|democracy|legislature)\b/.test(
      t,
    )
  ) {
    return "arts-humanities";
  }
  if (
    /\b(music|song|instrument|songwriting|composer|orchestra|harmony|rhythm|melody)\b/.test(
      t,
    )
  ) {
    return "arts-humanities";
  }
  if (
    /\b(design|ux|ui|figma|illustration|drawing|photography|typography)\b/.test(
      t,
    )
  ) {
    return "design";
  }
  if (
    /\b(language|spanish|french|german|serbian|english|grammar|writing|linguistics)\b/.test(
      t,
    )
  ) {
    return "languages";
  }
  if (
    /\b(business|marketing|startup|finance|management|sales|branding|e-?commerce|accounting|entrepreneurship|economics)\b/.test(
      t,
    )
  ) {
    return "business";
  }
  if (
    /\b(history|philosophy|literature|psychology|sociology|anthropology|archaeology|journalism|religion|theology|ethics|law\b|culture|geography|art\b|film|cinema|documentary)\b/.test(
      t,
    )
  ) {
    return "arts-humanities";
  }
  if (
    /\b(health|medicine|nursing|nutrition|fitness|wellness|therapy|psychiatry|pharmacy|dentistry)\b/.test(
      t,
    )
  ) {
    return "health-wellbeing";
  }
  if (
    /\b(ai|machine learning|data science|cloud|kubernetes|docker|cybersecurity|infosec|sre\b|devops)\b/.test(
      t,
    )
  ) {
    return "technology";
  }

  return "general";
}
