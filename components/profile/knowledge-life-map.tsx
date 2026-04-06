"use client";

import { useId, useMemo } from "react";
import { cn } from "@/lib/utils";
import { KNOWLEDGE_MAP_RING_KEYS } from "@/lib/knowledge-map-insights";
import type { TopicClusterKey } from "@/lib/topic-cluster";

export type LifeMapSphere = {
  key: Exclude<TopicClusterKey, "general">;
  done: number;
  total: number;
  /** Full name (e.g. legend). */
  label: string;
  /** Compact line for the diagram. */
  shortLabel: string;
};

export type LifeMapGeneral = {
  done: number;
  total: number;
  label: string;
};

export type KnowledgeLifeMapProps = {
  spheres: LifeMapSphere[];
  general: LifeMapGeneral;
  /** Caption under the figure. */
  caption: string;
  /** Center hub label (e.g. “General core”). */
  coreLabel: string;
  className?: string;
};

type SphereStyle = {
  gradId: string;
  rim: string;
  glow: string;
};

const SPHERE_STYLES: Record<
  Exclude<TopicClusterKey, "general">,
  SphereStyle
> = {
  mathematics: {
    gradId: "math",
    rim: "rgb(37 99 235)",
    glow: "rgb(147 197 253)",
  },
  "life-sciences": {
    gradId: "life",
    rim: "rgb(22 163 74)",
    glow: "rgb(134 239 172)",
  },
  "physical-sciences": {
    gradId: "phys",
    rim: "rgb(8 145 178)",
    glow: "rgb(165 243 252)",
  },
  computing: {
    gradId: "comp",
    rim: "rgb(67 56 202)",
    glow: "rgb(199 210 254)",
  },
  technology: {
    gradId: "tech",
    rim: "rgb(109 40 217)",
    glow: "rgb(216 180 254)",
  },
  design: {
    gradId: "design",
    rim: "rgb(190 24 93)",
    glow: "rgb(251 207 232)",
  },
  languages: {
    gradId: "lang",
    rim: "rgb(180 83 9)",
    glow: "rgb(253 230 138)",
  },
  business: {
    gradId: "biz",
    rim: "rgb(194 65 12)",
    glow: "rgb(254 215 170)",
  },
  "arts-humanities": {
    gradId: "arts",
    rim: "rgb(162 28 175)",
    glow: "rgb(245 208 254)",
  },
  "health-wellbeing": {
    gradId: "health",
    rim: "rgb(13 148 136)",
    glow: "rgb(153 246 228)",
  },
};

const GRADIENT_STOPS: Record<
  SphereStyle["gradId"],
  { a: string; b: string; c: string }
> = {
  math: { a: "rgb(147 197 253)", b: "rgb(59 130 246)", c: "rgb(30 64 175)" },
  life: { a: "rgb(187 247 208)", b: "rgb(34 197 94)", c: "rgb(22 101 52)" },
  phys: { a: "rgb(165 243 252)", b: "rgb(6 182 212)", c: "rgb(14 116 144)" },
  comp: { a: "rgb(199 210 254)", b: "rgb(99 102 241)", c: "rgb(49 46 129)" },
  tech: { a: "rgb(216 180 254)", b: "rgb(139 92 246)", c: "rgb(76 29 149)" },
  design: {
    a: "rgb(251 207 232)",
    b: "rgb(236 72 153)",
    c: "rgb(131 24 67)",
  },
  lang: { a: "rgb(253 230 138)", b: "rgb(245 158 11)", c: "rgb(146 64 14)" },
  biz: { a: "rgb(254 215 170)", b: "rgb(249 115 22)", c: "rgb(154 52 18)" },
  arts: { a: "rgb(245 208 254)", b: "rgb(192 38 211)", c: "rgb(112 26 117)" },
  health: {
    a: "rgb(153 246 228)",
    b: "rgb(20 184 166)",
    c: "rgb(15 118 110)",
  },
};

function completionIntensity(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(1, done / total);
}

function sphereRadius(
  base: number,
  done: number,
  total: number,
  hasAnyLessons: boolean,
): number {
  if (!hasAnyLessons) return base * 0.42;
  const t = completionIntensity(done, total);
  return base * (0.52 + 0.48 * (0.25 + 0.75 * t));
}

export function KnowledgeLifeMap({
  spheres,
  general,
  caption,
  coreLabel,
  className,
}: KnowledgeLifeMapProps) {
  const reactId = useId().replace(/:/g, "");
  const fid = `klm-${reactId}`;

  const sphereMap = useMemo(() => {
    const m = new Map(spheres.map((s) => [s.key, s]));
    return KNOWLEDGE_MAP_RING_KEYS.map((k) => m.get(k)!);
  }, [spheres]);

  const hasRingLessons = sphereMap.some((s) => s.total > 0);
  const capId = `${fid}-cap`;

  const center = 260;
  const ringR = 150;
  const n = sphereMap.length;

  const blobs = sphereMap
    .map((s, i) => {
      const angle = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      const cx = center + ringR * Math.cos(angle);
      const cy = center + ringR * Math.sin(angle);
      const style = SPHERE_STYLES[s.key];
      const t = completionIntensity(s.done, s.total);
      const r = sphereRadius(46, s.done, s.total, hasRingLessons);
      const haloR = r * 1.35;
      const glowOp = 0.08 + t * 0.38;
      const coreOp = 0.22 + t * 0.62;
      return {
        ...s,
        cx,
        cy,
        r,
        haloR,
        style,
        t,
        glowOp,
        coreOp,
        angleDeg: (angle * 180) / Math.PI,
      };
    })
    .sort((a, b) => a.t - b.t);

  const genT = completionIntensity(general.done, general.total);
  const genR = 24 + genT * 34;
  const genCoreOp = 0.2 + genT * 0.55;

  return (
    <div className={cn("space-y-4", className)}>
      <figure className="mx-auto w-full max-w-[min(100%,520px)]">
        <svg
          viewBox="0 0 520 520"
          className="h-auto w-full overflow-visible drop-shadow-[0_20px_48px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
          role="img"
          aria-labelledby={capId}
        >
          <title id={capId}>
            Life-of-learning map: nine topic spheres around a general core. Size
            and brightness follow your lesson progress in each area.
          </title>
          <defs>
            <radialGradient id={`${fid}-vignette`} cx="50%" cy="45%" r="72%">
              <stop
                offset="0%"
                className="[stop-color:var(--background)]"
                stopOpacity={0.02}
              />
              <stop
                offset="100%"
                className="[stop-color:var(--muted)]"
                stopOpacity={0.14}
              />
            </radialGradient>
            <filter
              id={`${fid}-softHalo`}
              x="-60%"
              y="-60%"
              width="220%"
              height="220%"
            >
              <feGaussianBlur stdDeviation="14" result="h" />
              <feMerge>
                <feMergeNode in="h" />
              </feMerge>
            </filter>
            {(
              Object.keys(GRADIENT_STOPS) as (keyof typeof GRADIENT_STOPS)[]
            ).map((gk) => {
              const { a, b, c } = GRADIENT_STOPS[gk];
              return (
                <radialGradient
                  key={gk}
                  id={`${fid}-g-${gk}`}
                  cx="32%"
                  cy="28%"
                  r="78%"
                >
                  <stop offset="0%" stopColor={a} stopOpacity="0.98" />
                  <stop offset="48%" stopColor={b} stopOpacity="0.88" />
                  <stop offset="100%" stopColor={c} stopOpacity="0.72" />
                </radialGradient>
              );
            })}
            <radialGradient id={`${fid}-g-general`} cx="35%" cy="30%" r="75%">
              <stop
                offset="0%"
                className="[stop-color:var(--foreground)]"
                stopOpacity="0.08"
              />
              <stop
                offset="55%"
                className="[stop-color:var(--muted)]"
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                className="[stop-color:var(--foreground)]"
                stopOpacity="0.5"
              />
            </radialGradient>
          </defs>

          <rect
            x="0"
            y="0"
            width="520"
            height="520"
            fill={`url(#${fid}-vignette)`}
            rx="28"
          />

          <circle
            cx={center}
            cy={center}
            r={ringR + 62}
            fill="none"
            className="stroke-[var(--border)]"
            strokeWidth="1"
            strokeOpacity={0.35}
            strokeDasharray="6 10"
          />

          <g
            style={{ mixBlendMode: "multiply" }}
            className="opacity-95 dark:opacity-90 dark:mix-blend-plus-lighter"
          >
            {blobs.map((b) => (
              <g key={b.key}>
                <circle
                  cx={b.cx}
                  cy={b.cy}
                  r={b.haloR}
                  fill={b.style.glow}
                  fillOpacity={b.glowOp * 0.85}
                  filter={`url(#${fid}-softHalo)`}
                />
                <circle
                  cx={b.cx}
                  cy={b.cy}
                  r={b.r * 1.08}
                  fill={b.style.glow}
                  fillOpacity={b.glowOp * 0.28}
                />
              </g>
            ))}
          </g>

          <g>
            {blobs.map((b) => (
              <g key={`core-${b.key}`}>
                <circle
                  cx={b.cx}
                  cy={b.cy}
                  r={b.r}
                  fill={`url(#${fid}-g-${b.style.gradId})`}
                  fillOpacity={b.coreOp}
                  stroke={b.style.rim}
                  strokeWidth="1.25"
                  strokeOpacity={0.35 + b.t * 0.45}
                />
              </g>
            ))}
          </g>

          <g>
            <circle
              cx={center}
              cy={center}
              r={genR * 1.15}
              className="fill-[var(--foreground)]"
              fillOpacity={0.04 + genT * 0.08}
              filter={`url(#${fid}-softHalo)`}
            />
            <circle
              cx={center}
              cy={center}
              r={genR}
              fill={`url(#${fid}-g-general)`}
              fillOpacity={genCoreOp}
              className="stroke-[var(--border)]"
              strokeWidth="1.5"
              strokeOpacity={0.55}
            />
            <text
              x={center}
              y={center + 3}
              textAnchor="middle"
              className="fill-[var(--foreground)] text-[9px] font-semibold uppercase tracking-widest opacity-80"
            >
              {coreLabel}
            </text>
          </g>

          {blobs.map((b) => {
            const lx =
              b.cx + (b.r + 28) * Math.cos((b.angleDeg * Math.PI) / 180);
            const ly =
              b.cy + (b.r + 28) * Math.sin((b.angleDeg * Math.PI) / 180);
            const words = b.shortLabel.split(/\s+/).filter(Boolean);
            const mid = Math.ceil(words.length / 2);
            const line1 = words.slice(0, mid).join(" ");
            const line2 = words.slice(mid).join(" ");
            return (
              <g key={`lbl-${b.key}`}>
                <text
                  x={lx}
                  y={line2 ? ly - 5 : ly}
                  textAnchor="middle"
                  className="fill-[var(--foreground)] text-[8.5px] font-medium leading-none"
                  style={{ opacity: 0.72 + b.t * 0.28 }}
                >
                  {line1}
                </text>
                {line2 ? (
                  <text
                    x={lx}
                    y={ly + 7}
                    textAnchor="middle"
                    className="fill-[var(--foreground)] text-[8.5px] font-medium leading-none"
                    style={{ opacity: 0.62 + b.t * 0.28 }}
                  >
                    {line2}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        <figcaption className="mt-4 text-pretty text-center text-xs leading-relaxed text-[var(--muted)]">
          {caption}
        </figcaption>
      </figure>
    </div>
  );
}
