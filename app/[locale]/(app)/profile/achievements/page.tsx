import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AchievementEpicCard } from "@/components/achievements/achievement-epic-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { humanizeSkillKeyForAchievement } from "@/lib/achievement-humanize";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import {
  allClusterAchievementSlugsInOrder,
  parseClusterAchievementSlug,
} from "@/lib/cluster-achievements";
import {
  allSkillAchievementSlugsInOrder,
  parseSkillAchievementSlug,
} from "@/lib/skill-achievements";
import { isTaskAchievementKey } from "@/lib/task-achievement-keys";

type Props = { params: Promise<{ locale: string }> };

const ORDER_SLUGS = [
  "first_step",
  "phase_crusher",
  "consistent_learner",
  "roadmap_finisher",
  "achievement_fan",
  "topic_explorer",
  ...allClusterAchievementSlugsInOrder(),
  ...allSkillAchievementSlugsInOrder(),
];

function sortAchievements<T extends { slug: string }>(rows: T[]): T[] {
  const idx = (s: string) => {
    const i = ORDER_SLUGS.indexOf(s);
    return i === -1 ? 999 : i;
  };
  return [...rows].sort((a, b) => {
    const d = idx(a.slug) - idx(b.slug);
    return d !== 0 ? d : a.slug.localeCompare(b.slug);
  });
}

function sortAchievementsForDisplay<T extends { id: string; slug: string }>(
  rows: T[],
  earnedIds: Set<string>,
): T[] {
  const ordered = sortAchievements(rows);
  const orderIdx = new Map(ordered.map((x, i) => [x.id, i]));
  return [...ordered].sort((a, b) => {
    const ae = earnedIds.has(a.id);
    const be = earnedIds.has(b.id);
    if (ae !== be) return ae ? -1 : 1;
    return (orderIdx.get(a.id) ?? 0) - (orderIdx.get(b.id) ?? 0);
  });
}

export default async function ProfileAchievementsPage({ params }: Props) {
  const { locale } = await params;
  const user = await getOrCreateAppUser();
  const t = await getTranslations({ locale, namespace: "AchievementsPage" });
  const tProfile = await getTranslations({ locale, namespace: "Profile" });
  const tAch = await getTranslations({ locale, namespace: "Achievements" });
  const tCluster = await getTranslations({
    locale,
    namespace: "TopicClusters",
  });
  const tSkillKey = await getTranslations({
    locale,
    namespace: "TaskAchievementKeys",
  });

  const all = await prisma.achievement.findMany({
    orderBy: { xpBonus: "asc" },
  });
  const earned = await prisma.userAchievement.findMany({
    where: { userId: user.id },
    select: { achievementId: true, earnedAt: true },
  });
  const earnedSet = new Set(earned.map((e) => e.achievementId));
  const earnedAt = new Map(earned.map((e) => [e.achievementId, e.earnedAt]));

  const sorted = sortAchievementsForDisplay(all, earnedSet);
  const unlockedCount = sorted.filter((a) => earnedSet.has(a.id)).length;
  const pct =
    sorted.length === 0 ? 0 : Math.round((unlockedCount / sorted.length) * 100);

  const isBundled = (s: string): s is (typeof ORDER_SLUGS)[number] =>
    (ORDER_SLUGS as readonly string[]).includes(s);

  const dateFmt = (d: Date) =>
    d.toLocaleDateString(locale === "sr" ? "sr-Latn-RS" : "en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-1 max-w-xl text-[var(--muted)]">{t("subtitle")}</p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/profile">{tProfile("backToOverview")}</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardDescription>{t("collectionProgress")}</CardDescription>
          <CardTitle className="text-2xl">
            {unlockedCount}/{sorted.length} {t("unlocked")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sorted.map((a) => {
          const has = earnedSet.has(a.id);
          const skillParsed = parseSkillAchievementSlug(a.slug);
          const clusterParsed = parseClusterAchievementSlug(a.slug);
          const clusterLabel = clusterParsed ? tCluster(clusterParsed.key) : "";
          const skillDisplay = skillParsed
            ? isTaskAchievementKey(skillParsed.key)
              ? tSkillKey(skillParsed.key)
              : humanizeSkillKeyForAchievement(skillParsed.key)
            : "";
          const title = skillParsed
            ? tAch(`skillMilestone.${skillParsed.tier}.title`, {
                skill: skillDisplay,
              })
            : clusterParsed
              ? tAch(`clusterMilestone.${clusterParsed.tier}.title`, {
                  cluster: clusterLabel,
                })
              : isBundled(a.slug)
                ? tAch(`${a.slug}.title`)
                : a.title;
          const description = skillParsed
            ? tAch(`skillMilestone.${skillParsed.tier}.description`, {
                skill: skillDisplay,
              })
            : clusterParsed
              ? tAch(`clusterMilestone.${clusterParsed.tier}.description`, {
                  cluster: clusterLabel,
                })
              : isBundled(a.slug)
                ? tAch(`${a.slug}.description`)
                : a.description;
          const when = earnedAt.get(a.id);
          const microSubtitle = skillParsed
            ? `${t("tierLegend")} · ${skillDisplay}`
            : clusterParsed
              ? `${t("tierLegend")} · ${clusterLabel}`
              : null;
          const footerLine =
            has && when ? t("earnedOn", { date: dateFmt(when) }) : null;

          let earnedInsight: string | null = null;
          if (has) {
            if (skillParsed) {
              earnedInsight = tAch(
                `earnedDetail.skillMilestone.${skillParsed.tier}` as const,
                { skill: skillDisplay },
              );
            } else if (clusterParsed) {
              earnedInsight = tAch(
                `earnedDetail.clusterMilestone.${clusterParsed.tier}` as const,
                { cluster: clusterLabel },
              );
            } else if (
              a.slug === "first_step" ||
              a.slug === "phase_crusher" ||
              a.slug === "consistent_learner" ||
              a.slug === "roadmap_finisher" ||
              a.slug === "achievement_fan" ||
              a.slug === "topic_explorer"
            ) {
              earnedInsight = tAch(`earnedDetail.${a.slug}` as const);
            }
          }

          let howToBody: string;
          if (skillParsed) {
            howToBody = tAch(`howTo.skillMilestone.${skillParsed.tier}`, {
              skill: skillDisplay,
            });
          } else if (clusterParsed) {
            howToBody = tAch(`howTo.clusterMilestone.${clusterParsed.tier}`, {
              cluster: clusterLabel,
            });
          } else if (
            a.slug === "first_step" ||
            a.slug === "phase_crusher" ||
            a.slug === "consistent_learner" ||
            a.slug === "roadmap_finisher" ||
            a.slug === "achievement_fan" ||
            a.slug === "topic_explorer"
          ) {
            howToBody = tAch(`howTo.${a.slug}` as "howTo.first_step");
          } else {
            howToBody = tAch("howToFallback");
          }

          const howTo = !has
            ? {
                title: tAch("howToSectionTitle"),
                body: howToBody,
                dashboardCta: tAch("howToDashboardCta"),
                learnCta: tAch("howToLearnCta"),
              }
            : undefined;

          return (
            <li key={a.id} className="min-w-0 w-full list-none">
              <AchievementEpicCard
                slug={a.slug}
                title={title}
                description={description}
                xpBonus={a.xpBonus}
                unlocked={has}
                microSubtitle={microSubtitle}
                labels={{
                  unlocked: t("stateUnlocked"),
                  locked: t("stateLocked"),
                  lockedHint: t("artworkHint"),
                }}
                footerLine={footerLine}
                earnedInsight={earnedInsight}
                earnedInsightTitle={
                  has && earnedInsight
                    ? tAch("earnedInsightSectionTitle")
                    : undefined
                }
                howTo={howTo}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
