import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight, BookMarked, Sparkles } from "lucide-react";
import { TopicClusterMark } from "@/components/learning/topic-cluster-art";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DashboardAnalytics } from "@/features/dashboard/dashboard-analytics";
import { DashboardHeroPulseCta } from "@/features/dashboard/dashboard-hero-pulse-cta";
import { getOrCreateAppUser } from "@/lib/auth-user";
import {
  buildUpNextItems,
  featuredProgressPct,
  getContinueHref,
  type DashboardRoadmapForWorkspace,
} from "@/lib/dashboard-workspace-data";
import { prisma } from "@/lib/db";
import {
  countPhasesDone,
  countRoadmapTasks,
  progressPercent,
} from "@/lib/journey-stats";
import { isLessonFinishedWithExam } from "@/lib/lesson-finished";
import { normalizeClusterKey } from "@/lib/topic-cluster";
import { learnerLevelFromXp } from "@/lib/xp-level";

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const user = await getOrCreateAppUser();
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const tCluster = await getTranslations({
    locale,
    namespace: "TopicClusters",
  });

  const handbookCount = await prisma.lessonHandbook.count({
    where: { userId: user.id },
  });

  const roadmaps = await prisma.roadmap.findMany({
    where: { userId: user.id, status: "ACTIVE" },
    orderBy: { updatedAt: "desc" },
    include: {
      learningIntent: {
        select: { topicClusterKey: true, topicTitle: true },
      },
      phases: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              progress: { where: { userId: user.id } },
            },
          },
        },
      },
    },
  });

  let totalTasks = 0;
  let doneTasks = 0;
  let phasesComplete = 0;
  let phasesTotal = 0;

  const lessonCategoryAgg: Record<string, { total: number; done: number }> = {};

  for (const r of roadmaps) {
    const { total, completed } = countRoadmapTasks(r);
    const ph = countPhasesDone(r);
    totalTasks += total;
    doneTasks += completed;
    phasesTotal += ph.total;
    phasesComplete += ph.completed;

    const journeyCluster = r.learningIntent?.topicClusterKey ?? "general";
    for (const phase of r.phases) {
      for (const task of phase.tasks) {
        const cat = normalizeClusterKey(task.lessonCategory ?? journeyCluster);
        if (!lessonCategoryAgg[cat]) {
          lessonCategoryAgg[cat] = { total: 0, done: 0 };
        }
        lessonCategoryAgg[cat].total += 1;
        if (isLessonFinishedWithExam(task.progress[0])) {
          lessonCategoryAgg[cat].done += 1;
        }
      }
    }
  }

  const lessonCategories = Object.entries(lessonCategoryAgg)
    .map(([key, v]) => ({ key, total: v.total, done: v.done }))
    .sort((a, b) => b.total - a.total);

  const overallPct = progressPercent(doneTasks, totalTasks);
  const phasesPct = progressPercent(phasesComplete, phasesTotal);

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const tasksCompletedThisWeek = await prisma.userTaskProgress.count({
    where: {
      userId: user.id,
      status: "COMPLETED",
      completedAt: { gte: weekStart },
    },
  });

  const featured = roadmaps[0];
  const rest = roadmaps.slice(1);

  const workspaceRoadmap = featured as DashboardRoadmapForWorkspace | null;
  const continueHref =
    workspaceRoadmap ?
      getContinueHref(workspaceRoadmap)
    : "/learn/new";
  const continuePct = featuredProgressPct(workspaceRoadmap);
  const upNext = buildUpNextItems(workspaceRoadmap, 2);

  const clusterLabel = (key: string) => {
    const k = normalizeClusterKey(key);
    return tCluster(k);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[var(--border)]/60 bg-[var(--card)]/25 p-4 backdrop-blur-sm sm:p-5 md:p-6 dark:bg-[var(--card)]/20">
        <div className="space-y-5">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
              {t("welcome", { name: user.displayName ?? "learner" })}
            </h1>
            <p className="mt-1 max-w-2xl text-pretty text-sm leading-relaxed text-[var(--muted)]">
              {t("subtitle")}
            </p>
          </div>

          {featured ?
            <>
              <div className="grid gap-3 md:grid-cols-5 md:gap-4">
                <div className="space-y-3 md:col-span-3">
                  <div className="rounded-xl border border-[var(--border)]/70 bg-[var(--accent-soft)]/35 p-3 dark:bg-[var(--accent-soft)]/15 sm:p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)]">
                          {t("workspaceContinueSection")}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-[var(--foreground)] sm:text-base">
                          {featured.title}
                        </p>
                        {featured.goal || featured.description ?
                          <p className="mt-1 line-clamp-2 text-xs text-[var(--muted)]">
                            {featured.goal ?? featured.description}
                          </p>
                        : null}
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-xs font-semibold tabular-nums text-[var(--accent)]">
                        {continuePct}%
                      </span>
                    </div>
                    <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-[var(--background)]/80 dark:bg-[var(--foreground)]/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-fuchsia-500/90"
                        style={{ width: `${continuePct}%` }}
                      />
                    </div>
                    <Button
                      className="w-full rounded-full bg-[var(--accent)] shadow-md shadow-[var(--accent)]/25"
                      asChild
                    >
                      <Link href={continueHref}>{t("continue")}</Link>
                    </Button>
                  </div>

                  {rest[0] || rest[1] ?
                    <div className="space-y-2 rounded-xl border border-[var(--border)]/60 bg-[var(--card)]/40 p-3 dark:bg-[var(--card)]/25">
                      {[rest[0], rest[1]].filter(Boolean).map((r) => {
                        const { total, completed } = countRoadmapTasks(r);
                        const pct = progressPercent(completed, total);
                        return (
                          <div key={r.id}>
                            <div className="mb-1 flex justify-between gap-2 text-xs font-medium text-[var(--foreground)]">
                              <Link
                                href={`/roadmap/${r.id}`}
                                className="min-w-0 truncate hover:underline"
                              >
                                {r.title}
                              </Link>
                              <span className="shrink-0 tabular-nums text-[var(--muted)]">
                                {pct}%
                              </span>
                            </div>
                            <div className="h-1 overflow-hidden rounded-full bg-[var(--border)]/80">
                              <div
                                className="h-full rounded-full bg-[var(--accent)]/70"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  : null}
                </div>

                <div className="rounded-xl border border-[var(--border)]/70 bg-[var(--card)]/40 p-3 dark:bg-[var(--card)]/25 md:col-span-2 md:p-4">
                  <div className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-wide text-[var(--muted)] sm:text-xs">
                    <Sparkles className="size-3.5 shrink-0 text-[var(--accent)] sm:size-4" />
                    {t("workspaceSuggestedNext")}
                  </div>
                  {upNext.length > 0 ?
                    <ul className="space-y-2 text-xs sm:text-sm">
                      {upNext.map((item, i) => (
                        <li key={`${item.href}-${i}`}>
                          <Link
                            href={item.href}
                            className="block rounded-lg bg-[var(--accent-soft)]/50 px-2.5 py-2 font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--accent-soft)]/70 dark:bg-[var(--accent-soft)]/20 dark:hover:bg-[var(--accent-soft)]/35"
                          >
                            {item.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  : <p className="text-xs text-[var(--muted)]">
                      {t("workspaceNoUpNext")}
                    </p>}
                </div>
              </div>
            </>
          : <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--accent-soft)]/20 px-4 py-10 text-center dark:bg-[var(--accent-soft)]/10">
              <p className="text-sm text-[var(--muted)]">{t("emptyJourneys")}</p>
              <Button className="mt-4 rounded-full" asChild>
                <Link href="/learn/new">{t("newRoadmap")}</Link>
              </Button>
            </div>}

          <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)]/50 pt-4 sm:grid-cols-4 sm:gap-3 sm:pt-5">
            <div className="rounded-lg bg-[var(--accent-soft)]/25 px-2 py-2 dark:bg-[var(--accent-soft)]/10 sm:px-3">
              <p className="text-[0.65rem] font-medium text-[var(--muted)] sm:text-xs">
                {t("workspaceStatCourses")}
              </p>
              <p className="text-sm font-semibold tabular-nums text-[var(--foreground)] sm:text-base">
                {roadmaps.length}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--accent-soft)]/25 px-2 py-2 dark:bg-[var(--accent-soft)]/10 sm:px-3">
              <p className="text-[0.65rem] font-medium text-[var(--muted)] sm:text-xs">
                {t("workspaceStatTasks")}
              </p>
              <p className="text-sm font-semibold tabular-nums text-[var(--foreground)] sm:text-base">
                {totalTasks > 0 ? `${doneTasks}/${totalTasks}` : "0"}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--accent-soft)]/25 px-2 py-2 dark:bg-[var(--accent-soft)]/10 sm:px-3">
              <p className="text-[0.65rem] font-medium text-[var(--muted)] sm:text-xs">
                {t("workspaceStatOverall")}
              </p>
              <p className="text-sm font-semibold tabular-nums text-[var(--foreground)] sm:text-base">
                {overallPct}%
              </p>
            </div>
            <div className="rounded-lg bg-[var(--accent-soft)]/25 px-2 py-2 dark:bg-[var(--accent-soft)]/10 sm:px-3">
              <p className="text-[0.65rem] font-medium text-[var(--muted)] sm:text-xs">
                {t("workspaceStatLevelXp")}
              </p>
              <p className="text-sm font-semibold tabular-nums sm:text-base">
                <span className="text-[var(--accent)]">
                  {t("workspaceLevelPrefix", {
                    level: learnerLevelFromXp(user.xpTotal),
                  })}
                </span>
                <span className="text-[var(--muted)]"> · </span>
                <span className="text-[var(--foreground)]">
                  {t("workspaceXpTotal", { xp: user.xpTotal })}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 sm:flex-row sm:flex-wrap sm:justify-center">
        <DashboardHeroPulseCta>
          <Button
            asChild
            size="lg"
            className="relative gap-2 rounded-full px-8 shadow-lg shadow-[var(--accent)]/25 transition-[filter] duration-300 hover:brightness-110"
          >
            <Link href="/learn/new">
              {t("newRoadmap")}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </DashboardHeroPulseCta>
        {handbookCount > 0 ?
          <Link
            href="/profile/handbooks"
            className="inline-flex items-center gap-2 rounded-full border border-indigo-500/25 bg-indigo-500/[0.07] px-4 py-2 text-sm font-medium text-indigo-800 transition-colors hover:bg-indigo-500/15 dark:text-indigo-200 dark:hover:bg-indigo-500/20"
          >
            <BookMarked className="size-4 shrink-0" aria-hidden />
            {t("handbooksTeaser", { count: handbookCount })}
          </Link>
        : null}
      </div>

      <DashboardAnalytics
        mode="categoriesOnly"
        data={{
          overallPct,
          roadmapCount: roadmaps.length,
          phasesPct,
          doneTasks,
          totalTasks,
          tasksCompletedThisWeek,
          xpTotal: user.xpTotal,
          streakDays: user.streakDays,
          lessonCategories,
        }}
      />

      {rest.length > 2 ?
        <section className="space-y-4" aria-label={t("allJourneys")}>
          <h2 className="text-lg font-semibold">{t("allJourneys")}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {rest.slice(2).map((r) => {
              const { total, completed } = countRoadmapTasks(r);
              const pct = progressPercent(completed, total);
              const ck = r.learningIntent?.topicClusterKey ?? "general";
              return (
                <Card key={r.id} className="flex flex-col">
                  <CardHeader className="flex-row items-start gap-3 space-y-0 pb-2">
                    <TopicClusterMark clusterKey={ck} />
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base leading-snug">
                        {r.title}
                      </CardTitle>
                      <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                        {clusterLabel(ck)}
                      </p>
                      <CardDescription className="mt-1 line-clamp-2 text-xs">
                        {r.goal ?? r.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="mt-auto space-y-2">
                    <Progress value={pct} />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-[var(--muted)]">
                        {completed}/{total}
                      </p>
                      <Button variant="secondary" size="sm" asChild>
                        <Link href={`/roadmap/${r.id}`}>{t("view")}</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      : null}
    </div>
  );
}
