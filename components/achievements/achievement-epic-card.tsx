import type { LucideIcon } from "lucide-react";
import {
  Atom,
  Award,
  BarChart3,
  BookOpen,
  Box,
  Boxes,
  Braces,
  Brain,
  Briefcase,
  CircleDot,
  Cloud,
  Coffee,
  Cog,
  Compass,
  Cpu,
  Database,
  FileCode2,
  Flame,
  Footprints,
  Gem,
  Hash,
  HeartPulse,
  Hexagon,
  Languages,
  Layers,
  Layout,
  Lightbulb,
  Mic,
  Monitor,
  Music,
  Paintbrush,
  Palette,
  PenLine,
  PenTool,
  Rocket,
  ScrollText,
  Server,
  Share2,
  Shield,
  Sparkles,
  Star,
  Target,
  Telescope,
  Terminal,
  Trophy,
  Wind,
  Workflow,
  Zap,
  Calculator,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { parseClusterAchievementSlug } from "@/lib/cluster-achievements";
import { parseSkillAchievementSlug } from "@/lib/skill-achievements";
import type { TopicClusterKey } from "@/lib/topic-cluster";
import { isValidSkillAchievementKeyPart } from "@/lib/task-achievement-keys";
import { cn } from "@/lib/utils";

const CLUSTER_EPIC_ICON: Record<TopicClusterKey, LucideIcon> = {
  general: Lightbulb,
  mathematics: Calculator,
  "life-sciences": Atom,
  "physical-sciences": Sparkles,
  computing: Monitor,
  technology: Cpu,
  design: Palette,
  languages: Languages,
  business: Briefcase,
  "arts-humanities": BookOpen,
  "health-wellbeing": HeartPulse,
};

const SKILL_EPIC_ICON: Record<string, LucideIcon> = {
  react: Workflow,
  nextjs: Rocket,
  vue: Wind,
  svelte: Hexagon,
  angular: Shield,
  javascript: Braces,
  typescript: FileCode2,
  html_css: Layout,
  tailwindcss: Paintbrush,
  nodejs: Server,
  python: Terminal,
  rust: Cog,
  go: CircleDot,
  java: Coffee,
  csharp: Hash,
  sql: Database,
  graphql: Share2,
  docker: Box,
  kubernetes: Boxes,
  aws: Cloud,
  figma: PenTool,
  music_theory: Music,
  writing: PenLine,
  public_speaking: Mic,
  data_analysis: BarChart3,
  machine_learning: Brain,
};

const DYNAMIC_ICON_POOL: LucideIcon[] = [
  Star,
  Hexagon,
  ScrollText,
  Target,
  Zap,
  Gem,
  Award,
  Compass,
  Telescope,
  Layers,
];

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function dynamicSkillIcon(key: string): LucideIcon {
  return DYNAMIC_ICON_POOL[simpleHash(key) % DYNAMIC_ICON_POOL.length]!;
}

const TIER_EPIC: Record<
  "once" | "twice" | "many",
  {
    label: string;
    ribbon: string;
    ring: string;
    glow: string;
    mesh: string;
  }
> = {
  once: {
    label: "I",
    ribbon: "from-amber-950/80 via-amber-800/90 to-amber-950/80",
    ring: "ring-amber-600/45",
    glow: "shadow-[0_0_32px_-6px_rgba(217,119,6,0.45)]",
    mesh: "from-amber-500/10 via-transparent to-orange-600/5",
  },
  twice: {
    label: "II",
    ribbon: "from-slate-700/90 via-slate-400/95 to-slate-600/90",
    ring: "ring-slate-300/55",
    glow: "shadow-[0_0_36px_-6px_rgba(148,163,184,0.5)]",
    mesh: "from-slate-400/10 via-transparent to-cyan-500/5",
  },
  many: {
    label: "III",
    ribbon: "from-violet-950/90 via-amber-500/95 to-fuchsia-900/90",
    ring: "ring-amber-300/65",
    glow: "shadow-[0_0_40px_-4px_rgba(251,191,36,0.55)]",
    mesh: "from-amber-400/15 via-fuchsia-500/8 to-violet-600/10",
  },
};

const CORE_EPIC: Record<
  string,
  { Icon: LucideIcon; mesh: string; ring: string; glow: string }
> = {
  first_step: {
    Icon: Footprints,
    mesh: "from-emerald-500/15 via-transparent to-teal-600/10",
    ring: "ring-emerald-500/40",
    glow: "shadow-[0_0_28px_-6px_rgba(52,211,153,0.4)]",
  },
  phase_crusher: {
    Icon: Zap,
    mesh: "from-yellow-500/15 via-transparent to-amber-600/10",
    ring: "ring-yellow-500/45",
    glow: "shadow-[0_0_32px_-6px_rgba(234,179,8,0.45)]",
  },
  consistent_learner: {
    Icon: Flame,
    mesh: "from-orange-500/15 via-transparent to-red-600/10",
    ring: "ring-orange-500/45",
    glow: "shadow-[0_0_32px_-6px_rgba(249,115,22,0.45)]",
  },
  roadmap_finisher: {
    Icon: Trophy,
    mesh: "from-violet-500/20 via-transparent to-fuchsia-600/12",
    ring: "ring-violet-400/55",
    glow: "shadow-[0_0_40px_-4px_rgba(167,139,250,0.5)]",
  },
};

export type AchievementEpicCardProps = {
  slug: string;
  title: string;
  description: string;
  xpBonus: number;
  unlocked: boolean;
  /** Second line under the title (e.g. tier · subject). */
  microSubtitle: string | null;
  labels: {
    unlocked: string;
    locked: string;
    lockedHint: string;
  };
  /** Footer: formatted “earned on …” when unlocked, else use lockedHint via labels. */
  footerLine: string | null;
  /** Shown when locked: concrete steps + quick links to act on them. */
  howTo?:
    | {
        title: string;
        body: string;
        dashboardCta: string;
        learnCta: string;
      }
    | undefined;
};

export function AchievementEpicCard({
  slug,
  title,
  description,
  xpBonus,
  unlocked,
  microSubtitle,
  labels,
  footerLine,
  howTo,
}: AchievementEpicCardProps) {
  const core = CORE_EPIC[slug];
  const skill = parseSkillAchievementSlug(slug);
  const cluster = !skill ? parseClusterAchievementSlug(slug) : null;

  let Icon: LucideIcon = Star;
  let tier: "once" | "twice" | "many" | null = null;
  let mesh = "from-violet-500/8 via-transparent to-cyan-500/8";
  let ring = "ring-white/10";
  let glow = "";

  if (core) {
    Icon = core.Icon;
    mesh = core.mesh;
    ring = core.ring;
    glow = core.glow;
  } else if (skill && isValidSkillAchievementKeyPart(skill.key)) {
    tier = skill.tier;
    const style = TIER_EPIC[tier];
    Icon = SKILL_EPIC_ICON[skill.key] ?? dynamicSkillIcon(skill.key);
    mesh = style.mesh;
    ring = style.ring;
    glow = unlocked ? style.glow : "";
  } else if (cluster) {
    tier = cluster.tier;
    const style = TIER_EPIC[tier];
    Icon = CLUSTER_EPIC_ICON[cluster.key];
    mesh = style.mesh;
    ring = style.ring;
    glow = unlocked ? style.glow : "";
  }

  const tierBadge =
    tier ?
      <span
        className={cn(
          "inline-flex min-w-[1.75rem] justify-center rounded border border-white/15 bg-gradient-to-b px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white/95 shadow-sm",
          TIER_EPIC[tier].ribbon,
        )}
      >
        {TIER_EPIC[tier].label}
      </span>
    : null;

  return (
    <Card
      className={cn(
        "group relative flex h-full min-h-[14.5rem] flex-col overflow-hidden border transition-[transform,box-shadow] duration-300",
        unlocked ?
          cn(
            "border-white/10 bg-[var(--card)]/90",
            glow || "shadow-lg shadow-black/10 dark:shadow-black/40",
          )
        : "border-[var(--border)]/60 bg-[var(--card)]/40 opacity-[0.92]",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-90",
          mesh,
        )}
        aria-hidden
      />
      <div
        className={cn(
          "pointer-events-none absolute inset-px rounded-[inherit] ring-1 ring-inset",
          unlocked ? ring : "ring-black/5 dark:ring-white/5",
        )}
        aria-hidden
      />
      <CardHeader className="relative flex flex-1 flex-col gap-3 space-y-0 pb-2 pt-5">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-[3.25rem] shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br p-0.5",
              unlocked ?
                "from-white/25 to-white/5 text-white"
              : "from-[var(--muted)]/20 to-[var(--muted)]/5 text-[var(--muted)]",
            )}
          >
            <div
              className={cn(
                "flex size-full items-center justify-center rounded-[0.875rem] bg-black/20 dark:bg-black/35",
                !unlocked && "grayscale",
              )}
            >
              <Icon
                className={cn(
                  "size-7",
                  unlocked ? "text-amber-100 drop-shadow-md" : "opacity-75",
                )}
                strokeWidth={1.5}
                aria-hidden
              />
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              {tierBadge}
              <Badge
                variant={unlocked ? "success" : "outline"}
                className="text-[10px] font-semibold uppercase tracking-wide"
              >
                {unlocked ? labels.unlocked : labels.locked}
              </Badge>
              {xpBonus > 0 ?
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold tabular-nums text-amber-700 dark:text-amber-300">
                  +{xpBonus} XP
                </span>
              : null}
            </div>
            <CardTitle className="text-balance font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-[1.05rem]">
              {title}
            </CardTitle>
            {microSubtitle ?
              <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                {microSubtitle}
              </p>
            : null}
          </div>
        </div>
        <CardDescription className="relative mt-auto text-pretty text-sm leading-relaxed text-[var(--muted)]">
          {description}
        </CardDescription>
        {!unlocked && howTo ?
          <div className="relative mt-3 rounded-lg border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5 dark:border-amber-500/30 dark:bg-amber-950/25">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-100/90">
              {howTo.title}
            </p>
            <p className="mt-1.5 text-pretty text-sm leading-snug text-[var(--foreground)]">
              {howTo.body}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
              <Link
                href="/dashboard"
                className="text-xs font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              >
                {howTo.dashboardCta}
              </Link>
              <Link
                href="/learn/new"
                className="text-xs font-semibold text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              >
                {howTo.learnCta}
              </Link>
            </div>
          </div>
        : null}
      </CardHeader>
      <CardContent className="relative mt-auto border-t border-white/5 px-5 pb-4 pt-3">
        <p className="text-xs text-[var(--muted)]">
          {footerLine ?? labels.lockedHint}
        </p>
      </CardContent>
    </Card>
  );
}
