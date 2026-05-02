import { Check, Lock } from "lucide-react";
import type { PhaseStep } from "@/lib/dashboard-workspace-data";
import { cn } from "@/lib/utils";

function PathConnector() {
  return (
    <div
      aria-hidden
      className="mx-0.5 hidden h-px min-w-[0.35rem] flex-1 bg-[var(--border)] sm:mx-1 sm:block"
    />
  );
}

export function DashboardPhaseStrip({
  title,
  phases,
}: {
  title: string;
  phases: PhaseStep[];
}) {
  if (phases.length === 0) return null;

  return (
    <div className="min-w-0">
      <p className="mb-2 text-[0.65rem] font-semibold uppercase tracking-wider text-[var(--muted)] sm:text-xs">
        {title}
      </p>
      <div className="flex flex-wrap items-center gap-y-3 sm:flex-nowrap sm:overflow-x-auto sm:pb-1">
        {phases.map((ph, idx) => (
          <div
            key={ph.id}
            className="flex min-w-0 flex-1 items-center sm:min-w-[unset] sm:flex-initial sm:basis-auto"
          >
            <div className="flex min-w-[4.25rem] flex-col items-center gap-1 text-center sm:min-w-[4.75rem]">
              {ph.state === "done" ?
                <span className="flex size-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
              : ph.state === "active" ?
                ph.ratioLabel ?
                  <span className="flex size-7 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[0.65rem] font-semibold tabular-nums text-[var(--accent)] ring-2 ring-[var(--accent)]/30 ring-offset-2 ring-offset-[var(--background)] dark:ring-offset-[var(--card)]">
                    {ph.ratioLabel}
                  </span>
                : <span className="relative flex size-7 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)] ring-2 ring-[var(--accent)]/35 ring-offset-2 ring-offset-[var(--background)] dark:ring-offset-[var(--card)]">
                    <span className="relative size-2 rounded-full bg-[var(--accent)]" />
                  </span>
              : <span className="flex size-7 items-center justify-center rounded-full bg-[var(--muted)]/15 text-[var(--muted)]">
                  <Lock className="size-3" />
                </span>}
              <span
                className={cn(
                  "max-w-[5.25rem] text-[0.65rem] font-medium leading-tight sm:text-xs",
                  ph.state === "locked" ?
                    "text-[var(--muted)]"
                  : "text-[var(--foreground)]",
                )}
              >
                {ph.title}
              </span>
            </div>
            {idx < phases.length - 1 ?
              <PathConnector />
            : null}
          </div>
        ))}
      </div>
    </div>
  );
}
