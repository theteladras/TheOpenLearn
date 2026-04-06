"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import type { KnowledgeMacro } from "@/lib/knowledge-macro-groups";

export type KnowledgeVennMacro = {
  done: number;
  total: number;
  label: string;
  description: string;
};

export type KnowledgeVennProps = {
  macros: Record<KnowledgeMacro, KnowledgeVennMacro>;
  /** Short figure caption under the diagram. */
  caption: string;
  className?: string;
};

const LENS_COLORS: Record<KnowledgeMacro, { fill: string; stroke: string }> = {
  discover: {
    fill: "rgb(16 185 129)",
    stroke: "rgb(5 150 105)",
  },
  build: {
    fill: "rgb(139 92 246)",
    stroke: "rgb(109 40 217)",
  },
  connect: {
    fill: "rgb(251 146 60)",
    stroke: "rgb(234 88 12)",
  },
};

function lensOpacity(done: number, total: number): number {
  if (total <= 0) return 0.09;
  const r = Math.min(1, done / total);
  return 0.1 + r * 0.62;
}

export function KnowledgeVenn({
  macros,
  caption,
  className,
}: KnowledgeVennProps) {
  const id = useId().replace(/:/g, "");
  const capId = `kv-${id}-cap`;

  const op = {
    discover: lensOpacity(macros.discover.done, macros.discover.total),
    build: lensOpacity(macros.build.done, macros.build.total),
    connect: lensOpacity(macros.connect.done, macros.connect.total),
  };

  return (
    <div className={cn("space-y-4", className)}>
      <figure className="mx-auto w-full max-w-md">
        <svg
          viewBox="0 0 120 104"
          className="h-auto w-full overflow-visible"
          role="img"
          aria-labelledby={capId}
        >
          <title id={capId}>
            {macros.discover.label}, {macros.build.label},{" "}
            {macros.connect.label}. Brighter circles mean more lessons finished
            in that lens.
          </title>
          {/* discover — left */}
          <circle
            cx="44"
            cy="40"
            r="34"
            fill={LENS_COLORS.discover.fill}
            fillOpacity={op.discover}
            stroke={LENS_COLORS.discover.stroke}
            strokeWidth="1"
            strokeOpacity={0.45}
          />
          {/* build — right */}
          <circle
            cx="76"
            cy="40"
            r="34"
            fill={LENS_COLORS.build.fill}
            fillOpacity={op.build}
            stroke={LENS_COLORS.build.stroke}
            strokeWidth="1"
            strokeOpacity={0.45}
          />
          {/* connect — bottom */}
          <circle
            cx="60"
            cy="66"
            r="34"
            fill={LENS_COLORS.connect.fill}
            fillOpacity={op.connect}
            stroke={LENS_COLORS.connect.stroke}
            strokeWidth="1"
            strokeOpacity={0.45}
          />
        </svg>
        <figcaption className="mt-3 text-pretty text-center text-xs text-[var(--muted)]">
          {caption}
        </figcaption>
      </figure>
    </div>
  );
}
