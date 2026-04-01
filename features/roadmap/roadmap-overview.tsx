"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { RoadmapViewPhase } from "./roadmap-view";

function scrollToPhase(phaseId: string) {
  const el = document.getElementById(`phase-${phaseId}`);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  const hash = `#phase-${phaseId}`;
  if (typeof window !== "undefined") {
    window.history.replaceState(null, "", hash);
  }
}

export function RoadmapOverview({ phases }: { phases: RoadmapViewPhase[] }) {
  const t = useTranslations("Roadmap");
  if (phases.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 80, damping: 22 }}
      className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/70 p-4 shadow-sm ring-1 ring-black/[0.03] dark:bg-[var(--card)]/40 dark:ring-white/[0.06]"
    >
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
            {t("overviewTitle")}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {t("overviewHint")}
          </p>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 [scrollbar-width:thin]">
        <div className="flex items-stretch gap-0 py-1.5">
          {phases.map((phase, pi) => {
            const n = phase.tasks.length;
            const done = phase.tasks.filter(
              (x) => x.status === "COMPLETED",
            ).length;
            const complete = n > 0 && done === n;
            const pct = n === 0 ? 0 : Math.round((done / n) * 100);

            return (
              <div key={phase.id} className="flex min-w-0 items-stretch">
                {pi > 0 ? (
                  <div
                    className="mx-1 hidden w-6 shrink-0 self-center sm:block"
                    aria-hidden
                  >
                    <div className="h-px w-full bg-gradient-to-r from-[var(--border)] via-[var(--accent)]/35 to-[var(--border)]" />
                  </div>
                ) : null}
                <motion.a
                  href={`#phase-${phase.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToPhase(phase.id);
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex min-w-[9.5rem] max-w-[11rem] shrink-0 flex-col rounded-xl border p-3 transition-colors",
                    complete
                      ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                      : "border-[var(--border)] bg-[var(--background)]/50 hover:border-[var(--accent)]/35 hover:bg-[var(--accent-soft)]/30",
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        complete
                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
                          : "bg-[var(--accent-soft)] text-[var(--accent)]",
                      )}
                    >
                      {complete ? (
                        <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                      ) : (
                        pi + 1
                      )}
                    </span>
                    <span className="truncate text-[0.7rem] font-medium uppercase tracking-wide text-[var(--muted)]">
                      {t("phase")}
                    </span>
                  </div>
                  <p className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-snug text-[var(--foreground)]">
                    {phase.title}
                  </p>
                  <p className="mt-1.5 text-xs text-[var(--muted)]">
                    {t("overviewTasksLine", { done, total: n })}
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--border)]/80">
                    <motion.div
                      className={cn(
                        "h-full rounded-full",
                        complete ? "bg-emerald-500/80" : "bg-[var(--accent)]",
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{
                        type: "spring",
                        stiffness: 120,
                        damping: 20,
                      }}
                    />
                  </div>
                </motion.a>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
