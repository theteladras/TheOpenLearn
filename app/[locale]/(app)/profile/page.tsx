import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowRight } from "lucide-react";
import { KnowledgeLifeMap } from "@/components/profile/knowledge-life-map";
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
import { getOrCreateAppUser } from "@/lib/auth-user";
import {
  KNOWLEDGE_MAP_RING_KEYS,
  analyzeKnowledgeMap,
} from "@/lib/knowledge-map-insights";
import { suggestNextTopicFocus } from "@/lib/knowledge-macro-groups";
import { getLessonCategoryProgress } from "@/lib/lesson-category-progress";
import { progressPercent } from "@/lib/journey-stats";
import type { TopicClusterKey } from "@/lib/topic-cluster";

type Props = { params: Promise<{ locale: string }> };

const SPHERE_SHORT_I18N: Record<
  Exclude<TopicClusterKey, "general">,
  | "sphereShortMathematics"
  | "sphereShortLifeSciences"
  | "sphereShortPhysicalSciences"
  | "sphereShortComputing"
  | "sphereShortTechnology"
  | "sphereShortDesign"
  | "sphereShortLanguages"
  | "sphereShortBusiness"
  | "sphereShortArtsHumanities"
  | "sphereShortHealthWellbeing"
> = {
  mathematics: "sphereShortMathematics",
  "life-sciences": "sphereShortLifeSciences",
  "physical-sciences": "sphereShortPhysicalSciences",
  computing: "sphereShortComputing",
  technology: "sphereShortTechnology",
  design: "sphereShortDesign",
  languages: "sphereShortLanguages",
  business: "sphereShortBusiness",
  "arts-humanities": "sphereShortArtsHumanities",
  "health-wellbeing": "sphereShortHealthWellbeing",
};

export default async function ProfileOverviewPage({ params }: Props) {
  const { locale } = await params;
  const user = await getOrCreateAppUser();
  const t = await getTranslations({ locale, namespace: "Profile" });
  const tCluster = await getTranslations({
    locale,
    namespace: "TopicClusters",
  });

  const rows = await getLessonCategoryProgress(user.id);
  const analysis = analyzeKnowledgeMap(rows);
  const rowByKey = Object.fromEntries(rows.map((r) => [r.key, r])) as Record<
    TopicClusterKey,
    (typeof rows)[number]
  >;

  const spheres = KNOWLEDGE_MAP_RING_KEYS.map((key) => {
    const r = rowByKey[key]!;
    return {
      key,
      done: r.done,
      total: r.total,
      label: tCluster(key),
      shortLabel: t(SPHERE_SHORT_I18N[key]),
    };
  });

  const generalRow = rowByKey.general!;

  const next = suggestNextTopicFocus(rows);
  const clusterRows = [...rows]
    .filter((r) => r.total > 0)
    .sort((a, b) => {
      const pa = progressPercent(a.done, a.total);
      const pb = progressPercent(b.done, b.total);
      return pb - pa;
    });

  const showSecondary =
    analysis.secondByDone &&
    analysis.topByDone &&
    analysis.secondByDone.key !== analysis.topByDone.key;

  const showGap =
    analysis.weakestActive &&
    analysis.topByDone &&
    analysis.weakestActive.key !== analysis.topByDone.key &&
    analysis.weakestActive.done < analysis.weakestActive.total;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("overviewTitle")}
        </h1>
        <p className="mt-1 max-w-2xl text-pretty text-[var(--muted)]">
          {t("overviewSubtitle")}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)] lg:items-start">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("mapCardTitle")}</CardTitle>
            <CardDescription>{t("mapCardDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <KnowledgeLifeMap
              spheres={spheres}
              general={{
                done: generalRow.done,
                total: generalRow.total,
                label: tCluster("general"),
              }}
              caption={t("mapCaption")}
              coreLabel={t("mapCoreLabel")}
            />
            <ul
              className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              aria-label={t("legendAria")}
            >
              <li className="rounded-xl border border-[var(--border)]/60 bg-[var(--muted)]/[0.04] px-3 py-2.5 sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-semibold text-[var(--foreground)]">
                  {t("legendGeneralHeading")}
                </p>
                <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                  {tCluster("general")} —{" "}
                  {t("legendLessons", {
                    done: generalRow.done,
                    total: generalRow.total,
                  })}
                  {generalRow.total > 0 ? (
                    <>
                      {" "}
                      ·{" "}
                      {t("legendPct", {
                        pct: Math.round(
                          (generalRow.done / generalRow.total) * 100,
                        ),
                      })}
                    </>
                  ) : null}
                </p>
                <Progress
                  className="mt-2 h-1.5"
                  value={progressPercent(
                    generalRow.done,
                    Math.max(1, generalRow.total),
                  )}
                />
              </li>
              {spheres.map((s) => {
                const pct =
                  s.total > 0 ? Math.round((s.done / s.total) * 100) : 0;
                return (
                  <li
                    key={s.key}
                    className="rounded-xl border border-[var(--border)]/60 bg-[var(--muted)]/[0.04] px-3 py-2.5"
                  >
                    <p className="text-xs font-semibold text-[var(--foreground)]">
                      {s.label}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted)]">
                      {t("legendLessons", {
                        done: s.done,
                        total: s.total,
                      })}
                      {s.total > 0 ? <> · {t("legendPct", { pct })}</> : null}
                    </p>
                    <Progress
                      className="mt-2 h-1.5"
                      value={progressPercent(s.done, Math.max(1, s.total))}
                    />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("whereTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
              {analysis.totalDone === 0 ? (
                <p>{t("whereEmpty")}</p>
              ) : (
                <>
                  <p>
                    {analysis.spheresWithLessons === 0 && analysis.totalDone > 0
                      ? t("whereSummaryGeneralCore", {
                          totalDone: analysis.totalDone,
                          totalLessons: analysis.totalLessons,
                        })
                      : t("whereSummary", {
                          totalDone: analysis.totalDone,
                          totalLessons: analysis.totalLessons,
                          spheresWithProgress: analysis.spheresWithProgress,
                          spheresWithLessons: analysis.spheresWithLessons,
                        })}
                  </p>
                  {analysis.spheresWithLessons > 0 &&
                  analysis.spheresWithProgress === 1 ? (
                    <p>{t("whereSingleSphere")}</p>
                  ) : null}
                  {analysis.topByDone ? (
                    <p>
                      {t("whereLeadFocus", {
                        cluster: tCluster(analysis.topByDone.key),
                        done: analysis.topByDone.done,
                        total: analysis.topByDone.total,
                      })}
                    </p>
                  ) : null}
                  {showSecondary && analysis.secondByDone ? (
                    <p>
                      {t("whereLeadSecondary", {
                        cluster: tCluster(analysis.secondByDone.key),
                        done: analysis.secondByDone.done,
                        total: analysis.secondByDone.total,
                      })}
                    </p>
                  ) : null}
                  {showGap && analysis.weakestActive ? (
                    <p>
                      {t("whereGap", {
                        cluster: tCluster(analysis.weakestActive.key),
                        done: analysis.weakestActive.done,
                        total: analysis.weakestActive.total,
                      })}
                    </p>
                  ) : null}
                  {analysis.spheresWithLessons > 0 &&
                  analysis.spheresWithProgress >= 4 ? (
                    <p>{t("whereBreadth")}</p>
                  ) : analysis.spheresWithLessons > 0 &&
                    analysis.spheresWithProgress >= 2 ? (
                    <p>{t("whereDepth")}</p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("nextTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-[var(--muted)]">
              {next.kind === "empty" ? (
                <p>{t("nextEmpty")}</p>
              ) : next.kind === "complete" ? (
                <p>{t("nextComplete")}</p>
              ) : (
                <p>
                  {t("nextCluster", {
                    cluster: tCluster(next.key),
                    done: next.done,
                    total: next.total,
                  })}
                </p>
              )}
              <Button
                variant="secondary"
                size="sm"
                className="w-full sm:w-auto"
                asChild
              >
                <Link href="/dashboard" className="gap-2">
                  {t("nextDashboardCta")}
                  <ArrowRight className="size-3.5" aria-hidden />
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {clusterRows.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">{t("bucketsTitle")}</CardTitle>
            <CardDescription>{t("bucketsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {clusterRows.map((r) => {
              const pct = progressPercent(r.done, r.total);
              return (
                <div
                  key={r.key}
                  className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <TopicClusterMark clusterKey={r.key} compact />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {tCluster(r.key)}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {t("bucketCount", {
                          done: r.done,
                          total: r.total,
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="min-w-[8rem] flex-1 sm:max-w-xs">
                    <Progress value={pct} className="h-2" />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
