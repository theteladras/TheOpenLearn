"use client";

import { type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { TopicClusterMark } from "@/components/learning/topic-cluster-art";
import { Progress } from "@/components/ui/progress";
import { normalizeClusterKey } from "@/lib/topic-cluster";
import { cn } from "@/lib/utils";

export type DashboardLessonCategoryStat = {
  key: string;
  total: number;
  done: number;
};

export type DashboardAnalyticsData = {
  overallPct: number;
  roadmapCount: number;
  phasesPct: number;
  doneTasks: number;
  totalTasks: number;
  tasksCompletedThisWeek: number;
  xpTotal: number;
  streakDays: number;
  /** Task counts by lesson category (task.lessonCategory or journey fallback). */
  lessonCategories: DashboardLessonCategoryStat[];
};

function StatChip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-[7.5rem] flex-1 flex-col gap-0.5 rounded-xl border border-[var(--border)]/80 bg-[var(--card)]/80 px-3 py-2 shadow-sm backdrop-blur-sm dark:border-white/[0.08] dark:bg-[var(--card)]/50",
        className,
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </span>
      <div className="tabular-nums text-sm font-semibold leading-tight tracking-tight text-[var(--foreground)]">
        {children}
      </div>
    </div>
  );
}

export function DashboardAnalytics({ data }: { data: DashboardAnalyticsData }) {
  const t = useTranslations("Dashboard");
  const tCluster = useTranslations("TopicClusters");

  return (
    <section
      aria-label={t("analyticsTitle")}
      className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.07] via-transparent to-fuchsia-500/[0.06] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] ring-1 ring-violet-500/15 dark:from-violet-500/10 dark:to-fuchsia-500/5 dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent dark:via-violet-400/25"
        aria-hidden
      />
      <div className="relative p-4 sm:p-5">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {t("analyticsTitle")}
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--muted)]">
            {t("analyticsSummaryLine", {
              overall: data.overallPct,
              learnings: data.roadmapCount,
              done: data.doneTasks,
              total: data.totalTasks,
            })}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 sm:gap-2.5">
          <StatChip label={t("overallProgress")}>
            <span className="flex items-center gap-2">
              <span className="text-base">{data.overallPct}%</span>
              <Progress
                value={data.overallPct}
                className="h-1.5 w-14 shrink-0 sm:w-20"
              />
            </span>
          </StatChip>
          <StatChip label={t("parallelLearnings")}>
            {data.roadmapCount}
          </StatChip>
          <StatChip label={t("phasesCardTitle")}>
            <span className="flex items-center gap-2">
              <span className="text-base">{data.phasesPct}%</span>
              <Progress
                value={data.phasesPct}
                className="h-1.5 w-14 shrink-0 sm:w-20"
              />
            </span>
          </StatChip>
          <StatChip label={t("tasksDone")}>
            {data.doneTasks}/{data.totalTasks}
          </StatChip>
          <StatChip label={t("tasksThisWeek")} className="min-w-[5.5rem]">
            {data.tasksCompletedThisWeek}
          </StatChip>
          <StatChip label={t("xpAndStreak")}>
            {data.xpTotal} XP · {t("streakDays", { count: data.streakDays })}
          </StatChip>
        </div>

        {data.lessonCategories.length > 0 && (
          <div
            className="mt-4 border-t border-violet-500/15 pt-3 dark:border-violet-400/10"
            title={t("analyticsLessonCategoriesHint")}
          >
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
              {t("analyticsLessonCategories")}
            </h3>
            <ul className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {data.lessonCategories.map((row) => {
                const pct =
                  row.total > 0 ?
                    Math.round((row.done / row.total) * 100)
                  : 0;
                const k = normalizeClusterKey(row.key);
                return (
                  <li
                    key={row.key}
                    className="flex min-h-0 items-center gap-2 rounded-lg border border-[var(--border)]/60 bg-[var(--card)]/50 px-2 py-1.5 dark:border-white/[0.07] dark:bg-[var(--card)]/35"
                  >
                    <TopicClusterMark clusterKey={k} compact />
                    <div className="min-w-0 flex-1 leading-none">
                      <p
                        className="truncate text-[11px] font-medium text-[var(--foreground)]"
                        title={tCluster(k)}
                      >
                        {tCluster(k)}
                      </p>
                      <p className="mt-0.5 text-[10px] tabular-nums text-[var(--muted)]">
                        {t("analyticsLessonCategoryLine", {
                          done: row.done,
                          total: row.total,
                        })}
                        {" · "}
                        {pct}%
                      </p>
                    </div>
                    <Progress
                      value={pct}
                      className="hidden h-1 w-10 shrink-0 sm:block"
                      aria-hidden
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
