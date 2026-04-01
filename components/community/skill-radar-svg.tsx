import type { SkillRadarAxes } from "@/lib/community-metrics";
import { radarPoints, ringPolygon } from "@/lib/community-metrics";

type AxisLabel = { key: keyof SkillRadarAxes; label: string; hint: string };

export function SkillRadarSvg({
  axes,
  axesMeta,
  size = 220,
  className = "",
}: {
  axes: SkillRadarAxes;
  axesMeta: AxisLabel[];
  size?: number;
  className?: string;
}) {
  const r = size / 2;
  const pad = 36;
  const view = size + pad * 2;
  const center = r + pad;
  const labelR = r + 26;

  const grid = [0.25, 0.5, 0.75, 1].map((f) => (
    <polygon
      key={f}
      points={ringPolygon(r, f)
        .split(" ")
        .map((pair) => {
          const [x, y] = pair.split(",").map(Number);
          return `${center + (x - r)},${center + (y - r)}`;
        })
        .join(" ")}
      fill="none"
      stroke="var(--border)"
      strokeWidth={f === 1 ? 1.25 : 0.6}
      opacity={f === 1 ? 0.9 : 0.45}
    />
  ));

  const spokes = [0, 1, 2, 3, 4].map((i) => {
    const angle = ((-90 + i * 72) * Math.PI) / 180;
    const x2 = center + r * Math.cos(angle);
    const y2 = center + r * Math.sin(angle);
    return (
      <line
        key={i}
        x1={center}
        y1={center}
        x2={x2}
        y2={y2}
        stroke="var(--border)"
        strokeWidth={0.6}
        opacity={0.5}
      />
    );
  });

  const polyPoints = radarPoints(axes, r)
    .split(" ")
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return `${center + (x - r)},${center + (y - r)}`;
    })
    .join(" ");

  const labels = axesMeta.map((meta, i) => {
    const angle = ((-90 + i * 72) * Math.PI) / 180;
    const lx = center + labelR * Math.cos(angle);
    const ly = center + labelR * Math.sin(angle);
    return (
      <g key={meta.key}>
        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          dominantBaseline="middle"
          className="fill-[var(--foreground)] text-[10px] font-semibold uppercase tracking-wide"
        >
          {meta.label}
        </text>
        <title>{meta.hint}</title>
      </g>
    );
  });

  return (
    <div className={className}>
      <svg
        width={view}
        height={view}
        viewBox={`0 0 ${view} ${view}`}
        className="mx-auto overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop
              offset="0%"
              stopColor="rgb(139, 92, 246)"
              stopOpacity="0.55"
            />
            <stop
              offset="55%"
              stopColor="rgb(6, 182, 212)"
              stopOpacity="0.35"
            />
            <stop
              offset="100%"
              stopColor="rgb(236, 72, 153)"
              stopOpacity="0.3"
            />
          </linearGradient>
          <filter id="radarGlow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <g>{grid}</g>
        <g>{spokes}</g>
        <polygon
          points={polyPoints}
          fill="url(#radarFill)"
          stroke="rgb(139, 92, 246)"
          strokeWidth={2}
          filter="url(#radarGlow)"
          strokeLinejoin="round"
        />
        <circle
          cx={center}
          cy={center}
          r={3}
          className="fill-violet-500"
          opacity={0.9}
        />
        <g>{labels}</g>
      </svg>
    </div>
  );
}
