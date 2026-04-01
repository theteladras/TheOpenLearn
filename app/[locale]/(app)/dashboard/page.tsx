import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TopicClusterMark } from "@/components/learning/topic-cluster-art";
import { DashboardAnalytics } from "@/features/dashboard/dashboard-analytics";
import { DashboardHeroPulseCta } from "@/features/dashboard/dashboard-hero-pulse-cta";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import {
  countPhasesDone,
  countRoadmapTasks,
  progressPercent,
} from "@/lib/journey-stats";
import { normalizeClusterKey } from "@/lib/topic-cluster";

type Props = { params: Promise<{ locale: string }> };

export default async function DashboardPage({ params }: Props) {
  const { locale } = await params;
  const user = await getOrCreateAppUser();
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const tCluster = await getTranslations({
    locale,
    namespace: "TopicClusters",
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

  for (const r of roadmaps) {
    const { total, completed } = countRoadmapTasks(r);
    const ph = countPhasesDone(r);
    totalTasks += total;
    doneTasks += completed;
    phasesTotal += ph.total;
    phasesComplete += ph.completed;
  }

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

  const clusterLabel = (key: string) => {
    const k = normalizeClusterKey(key);
    return tCluster(k);
  };

  return (
    <div className="space-y-10">
      <header className="mx-auto max-w-2xl space-y-5 text-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {t("welcome", { name: user.displayName ?? "learner" })}
          </h1>
          <p className="mt-2 text-pretty text-[var(--muted)]">
            {t("subtitle")}
          </p>
        </div>
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
      </header>

      <DashboardAnalytics
        data={{
          overallPct,
          roadmapCount: roadmaps.length,
          phasesPct,
          doneTasks,
          totalTasks,
          tasksCompletedThisWeek,
          xpTotal: user.xpTotal,
          streakDays: user.streakDays,
        }}
      />

      <section className="space-y-6" aria-label={t("journeys")}>
        <h2 className="text-lg font-semibold">{t("journeys")}</h2>
        {roadmaps.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-[var(--muted)]">
              {t("emptyJourneys")}
            </CardContent>
          </Card>
        ) : (
          <>
            {featured ? (
              <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-transparent to-fuchsia-500/5 ring-1 ring-violet-500/20">
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <TopicClusterMark
                    clusterKey={
                      featured.learningIntent?.topicClusterKey ?? "general"
                    }
                    featured
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Badge variant="outline" className="mb-1 w-fit text-[10px]">
                      {t("latestJourney")}
                    </Badge>
                    <CardTitle className="text-xl sm:text-2xl">
                      {featured.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-[var(--muted)]">
                      {featured.goal ?? featured.description}
                    </CardDescription>
                    <p className="text-xs font-medium text-violet-600/90 dark:text-violet-300/90">
                      {clusterLabel(
                        featured.learningIntent?.topicClusterKey ?? "general",
                      )}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    const { total, completed } = countRoadmapTasks(featured);
                    const pct = progressPercent(completed, total);
                    return (
                      <>
                        <Progress value={pct} className="h-2" />
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="text-sm text-[var(--muted)]">
                            {completed}/{total} · {featured.estDurationLabel}
                          </p>
                          <Button asChild className="gap-2">
                            <Link href={`/roadmap/${featured.id}`}>
                              {t("continue")}
                              <ArrowRight className="size-4" />
                            </Link>
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : null}

            {rest.length > 0 ? (
              <>
                <h3 className="text-sm font-medium text-[var(--muted)]">
                  {t("allJourneys")}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  {rest.map((r) => {
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
              </>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
