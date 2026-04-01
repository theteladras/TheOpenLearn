import type { TopicClusterKey } from "@/lib/topic-cluster";

/** English fallback for DB achievement titles (UI uses i18n when available). */
const CLUSTER_EN: Record<TopicClusterKey, string> = {
  general: "General learning",
  mathematics: "Mathematics & logic",
  "life-sciences": "Life sciences",
  "physical-sciences": "Physical sciences",
  computing: "Programming & software",
  technology: "Technology & systems",
  design: "Design & product",
  languages: "Languages & communication",
  business: "Business & careers",
  "arts-humanities": "Arts & humanities",
  "health-wellbeing": "Health & wellbeing",
};

const SKILL_LABEL_EN: Record<string, string> = {
  react: "React",
  nextjs: "Next.js",
  vue: "Vue",
  svelte: "Svelte",
  angular: "Angular",
  javascript: "JavaScript",
  typescript: "TypeScript",
  html_css: "HTML & CSS",
  tailwindcss: "Tailwind CSS",
  nodejs: "Node.js",
  python: "Python",
  rust: "Rust",
  go: "Go",
  java: "Java",
  csharp: "C#",
  sql: "SQL",
  graphql: "GraphQL",
  docker: "Docker",
  kubernetes: "Kubernetes",
  aws: "AWS",
  figma: "Figma",
  music_theory: "Music theory",
  writing: "Writing",
  public_speaking: "Public speaking",
  data_analysis: "Data analysis",
  machine_learning: "Machine learning",
};

export function humanizeClusterForAchievement(key: TopicClusterKey): string {
  return CLUSTER_EN[key];
}

export function humanizeSkillKeyForAchievement(key: string): string {
  if (SKILL_LABEL_EN[key]) return SKILL_LABEL_EN[key];
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const TIER_LABEL_EN: Record<"once" | "twice" | "many", string> = {
  once: "First lesson",
  twice: "Two lessons",
  many: "Three or more",
};

export function milestoneTitleEnglish(
  kind: "cluster" | "skill",
  subject: string,
  tier: "once" | "twice" | "many",
): string {
  return `${subject} · ${TIER_LABEL_EN[tier]}`;
}

export function milestoneDescriptionEnglish(
  kind: "cluster" | "skill",
  subject: string,
  tier: "once" | "twice" | "many",
): string {
  const n = tier === "once" ? "one" : tier === "twice" ? "two" : "three or more";
  const scope =
    kind === "cluster" ?
      "lessons in this subject category"
    : "lessons tagged with this skill track";
  return `Complete ${n} ${scope} across your active learnings (${subject}).`;
}
