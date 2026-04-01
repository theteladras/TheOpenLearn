import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
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
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ locale: string }> };

const ORDER_SLUGS = [
  "first_step",
  "phase_crusher",
  "consistent_learner",
  "roadmap_finisher",
];

function sortAchievements<T extends { slug: string }>(rows: T[]): T[] {
  const idx = (s: string) => {
    const i = ORDER_SLUGS.indexOf(s);
    return i === -1 ? 99 : i;
  };
  return [...rows].sort((a, b) => idx(a.slug) - idx(b.slug));
}

export default async function AchievementsPage({ params }: Props) {
  const { locale } = await params;
  const user = await getOrCreateAppUser();
  const t = await getTranslations({ locale, namespace: "AchievementsPage" });
  const tAch = await getTranslations({ locale, namespace: "Achievements" });

  const all = await prisma.achievement.findMany({
    orderBy: { xpBonus: "asc" },
  });
  const earned = await prisma.userAchievement.findMany({
    where: { userId: user.id },
    select: { achievementId: true, earnedAt: true },
  });
  const earnedSet = new Set(earned.map((e) => e.achievementId));
  const earnedAt = new Map(earned.map((e) => [e.achievementId, e.earnedAt]));

  const sorted = sortAchievements(all);
  const unlockedCount = sorted.filter((a) => earnedSet.has(a.id)).length;
  const pct =
    sorted.length === 0 ? 0 : Math.round((unlockedCount / sorted.length) * 100);

  const isBundled = (s: string): s is (typeof ORDER_SLUGS)[number] =>
    (ORDER_SLUGS as readonly string[]).includes(s);

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
          <Link href="/dashboard">{t("backDashboard")}</Link>
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

      <ul className="grid gap-4 sm:grid-cols-2">
        {sorted.map((a) => {
          const has = earnedSet.has(a.id);
          const title = isBundled(a.slug) ? tAch(`${a.slug}.title`) : a.title;
          const description = isBundled(a.slug)
            ? tAch(`${a.slug}.description`)
            : a.description;
          const when = earnedAt.get(a.id);
          return (
            <li key={a.id}>
              <Card
                className={
                  has ? "border-emerald-500/25 bg-emerald-500/5" : "opacity-90"
                }
              >
                <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                  <div
                    className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] text-2xl"
                    title={t("artworkPlaceholder")}
                  >
                    {a.icon ?? "◆"}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">{title}</CardTitle>
                      <Badge variant={has ? "success" : "outline"}>
                        {has ? t("stateUnlocked") : t("stateLocked")}
                      </Badge>
                      {a.xpBonus > 0 ? (
                        <span className="text-xs text-[var(--muted)]">
                          +{a.xpBonus} XP
                        </span>
                      ) : null}
                    </div>
                    <CardDescription className="text-pretty">
                      {description}
                    </CardDescription>
                    {has && when ? (
                      <p className="text-xs text-[var(--muted)]">
                        {t("earnedOn", {
                          date: when.toLocaleDateString(
                            locale === "sr" ? "sr-Latn-RS" : "en-US",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            },
                          ),
                        })}
                      </p>
                    ) : (
                      <p className="text-xs text-[var(--muted)]">
                        {t("artworkHint")}
                      </p>
                    )}
                  </div>
                </CardHeader>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
