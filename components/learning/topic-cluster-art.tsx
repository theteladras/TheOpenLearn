import {
  Atom,
  BookOpen,
  Briefcase,
  Code2,
  Cpu,
  HeartPulse,
  Languages,
  LayoutTemplate,
  Leaf,
  Pi,
  Sparkles,
} from "lucide-react";
import type { TopicClusterKey } from "@/lib/topic-cluster";
import { isTopicClusterKey } from "@/lib/topic-cluster";
import { cn } from "@/lib/utils";

const STYLES: Record<
  TopicClusterKey,
  { Icon: typeof Sparkles; frame: string; glow: string }
> = {
  general: {
    Icon: Sparkles,
    frame: "from-slate-500/25 to-violet-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(139,92,246,0.45)]",
  },
  mathematics: {
    Icon: Pi,
    frame: "from-sky-500/30 to-indigo-500/25",
    glow: "shadow-[0_0_40px_-8px_rgba(14,165,233,0.45)]",
  },
  "life-sciences": {
    Icon: Leaf,
    frame: "from-emerald-500/30 to-teal-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(16,185,129,0.4)]",
  },
  "physical-sciences": {
    Icon: Atom,
    frame: "from-amber-500/25 to-orange-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(245,158,11,0.4)]",
  },
  computing: {
    Icon: Code2,
    frame: "from-violet-500/30 to-fuchsia-500/25",
    glow: "shadow-[0_0_40px_-8px_rgba(168,85,247,0.45)]",
  },
  technology: {
    Icon: Cpu,
    frame: "from-cyan-500/25 to-blue-500/25",
    glow: "shadow-[0_0_40px_-8px_rgba(6,182,212,0.4)]",
  },
  design: {
    Icon: LayoutTemplate,
    frame: "from-pink-500/25 to-rose-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(236,72,153,0.4)]",
  },
  languages: {
    Icon: Languages,
    frame: "from-blue-500/25 to-indigo-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(59,130,246,0.4)]",
  },
  business: {
    Icon: Briefcase,
    frame: "from-neutral-500/25 to-stone-400/20",
    glow: "shadow-[0_0_35px_-8px_rgba(120,113,108,0.35)]",
  },
  "arts-humanities": {
    Icon: BookOpen,
    frame: "from-red-500/20 to-amber-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(239,68,68,0.35)]",
  },
  "health-wellbeing": {
    Icon: HeartPulse,
    frame: "from-green-500/25 to-lime-500/20",
    glow: "shadow-[0_0_40px_-8px_rgba(34,197,94,0.35)]",
  },
};

function resolvedKey(clusterKey: string): TopicClusterKey {
  return isTopicClusterKey(clusterKey) ? clusterKey : "general";
}

export function TopicClusterMark({
  clusterKey,
  featured,
  className,
}: {
  clusterKey: string;
  featured?: boolean;
  className?: string;
}) {
  const key = resolvedKey(clusterKey);
  const { Icon, frame, glow } = STYLES[key];
  const box = featured
    ? "size-16 sm:size-20 rounded-2xl"
    : "size-12 rounded-xl";
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br ring-1 ring-white/10",
        frame,
        glow,
        box,
        className,
      )}
    >
      <Icon
        className={cn(
          "text-white/95 drop-shadow",
          featured ? "size-8 sm:size-10" : "size-6",
        )}
        strokeWidth={featured ? 1.5 : 1.75}
      />
    </div>
  );
}
