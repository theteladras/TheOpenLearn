import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { SkillRadarSvg } from "@/components/community/skill-radar-svg";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  buildSkillRadarAxes,
  type SkillRadarAxes,
} from "@/lib/community-metrics";
import { ProfileFollowControls } from "@/components/community/profile-follow-controls";
import { getOptionalAppUserId } from "@/lib/auth-user";
import {
  getPublicCommunityCohort,
  getPublicProfileOrNull,
} from "@/lib/community-data";
import { getFollowSocialContext } from "@/lib/community-follow";

type Props = { params: Promise<{ locale: string; userId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, userId } = await params;
  const t = await getTranslations({ locale, namespace: "Community" });
  const profile = await getPublicProfileOrNull(userId);
  if (!profile) {
    return { title: t("privateProfileMeta") };
  }
  return {
    title: `${profile.displayName ?? t("anon")} · ${t("metaTitle")}`,
    description: profile.publicBio ?? t("profileMetaFallback"),
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { locale, userId } = await params;
  const t = await getTranslations({ locale, namespace: "Community" });

  const profile = await getPublicProfileOrNull(userId);
  if (!profile) notFound();

  const viewerId = await getOptionalAppUserId();
  const social = await getFollowSocialContext(userId, viewerId);
  const isSelf = viewerId === userId;

  const cohort = await getPublicCommunityCohort();
  const axes: SkillRadarAxes = buildSkillRadarAxes(profile, cohort);

  const axisMeta: { key: keyof SkillRadarAxes; label: string; hint: string }[] =
    [
      { key: "volume", label: t("axisVolume"), hint: t("axisVolumeHint") },
      { key: "rigor", label: t("axisRigor"), hint: t("axisRigorHint") },
      { key: "breadth", label: t("axisBreadth"), hint: t("axisBreadthHint") },
      { key: "drive", label: t("axisDrive"), hint: t("axisDriveHint") },
      { key: "mastery", label: t("axisMastery"), hint: t("axisMasteryHint") },
    ];

  const since = profile.createdAt.toLocaleDateString(
    locale === "sr" ? "sr-Latn-RS" : "en-US",
    { month: "short", year: "numeric" },
  );

  const avgRigor =
    profile.tasksDone > 0
      ? Math.round(profile.challengeXp / profile.tasksDone)
      : 0;

  return (
    <div className="space-y-8">
      <p className="text-sm text-[var(--muted)]">
        <Link
          href="/feed"
          className="font-medium text-violet-600 hover:underline dark:text-violet-300"
        >
          ← {t("backToCommunity")}
        </Link>
      </p>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/90 p-6 shadow-xl shadow-violet-500/10 backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-300">
              {t("publicLearner")}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              {profile.displayName ?? t("anon")}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {t("memberSince", { date: since })}
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <Link
                  href={`/community/u/${userId}/followers`}
                  className="text-[var(--foreground)]/90 hover:text-violet-600 hover:underline dark:hover:text-violet-300"
                >
                  <span className="text-lg font-semibold tabular-nums">
                    {social.followerCount}
                  </span>{" "}
                  <span className="text-[var(--muted)]">
                    {t("statFollowers")}
                  </span>
                </Link>
                <Link
                  href={`/community/u/${userId}/following`}
                  className="text-[var(--foreground)]/90 hover:text-violet-600 hover:underline dark:hover:text-violet-300"
                >
                  <span className="text-lg font-semibold tabular-nums">
                    {social.followingCount}
                  </span>{" "}
                  <span className="text-[var(--muted)]">
                    {t("statFollowing")}
                  </span>
                </Link>
              </div>
              <ProfileFollowControls
                targetUserId={userId}
                initialFollowing={social.viewerIsFollowing}
                isSelf={isSelf}
                isSignedIn={Boolean(viewerId)}
                viewerIsFollowedBy={social.viewerIsFollowedBy}
              />
            </div>
            {profile.publicBio ? (
              <p className="mt-4 max-w-prose text-pretty text-[var(--foreground)]/90">
                {profile.publicBio}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatBox
              label={t("statLessons")}
              value={String(profile.tasksDone)}
            />
            <StatBox
              label={t("statRigor")}
              value={String(avgRigor)}
              hint={t("statRigorHint")}
            />
            <StatBox label={t("statXp")} value={String(profile.xpTotal)} />
            <StatBox
              label={t("statBreadth")}
              value={String(profile.topicBreadth)}
            />
            <StatBox
              label={t("statStreak")}
              value={String(profile.streakDays)}
            />
            <StatBox
              label={t("statRoadmaps")}
              value={String(profile.roadmapsDone)}
            />
            <StatBox label={t("statBadges")} value={String(profile.achCount)} />
          </div>
        </div>

        <Card className="w-full max-w-[380px] shrink-0 border-violet-500/25 bg-gradient-to-b from-violet-500/15 via-transparent to-cyan-500/5 lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle>{t("radarCardTitle")}</CardTitle>
            <CardDescription>{t("radarCardBody")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SkillRadarSvg axes={axes} axesMeta={axisMeta} size={240} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] bg-[var(--background)]/60 px-4 py-3"
      title={hint}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
