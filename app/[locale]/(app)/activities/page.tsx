import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { ActivityTimeline } from "@/components/community/activity-timeline";
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
import { ACTIVITY_TIMELINE_EVENT_TYPES } from "@/lib/activity-events";
import {
  formatCommunityRelativeTime,
  getCommunityActivityFeed,
  getPublicCommunityCohort,
} from "@/lib/community-data";
import {
  activitiesHref,
  parseActivityKind,
  parseActivityScope,
  rankingsHref,
} from "@/lib/activities-url";
import {
  activityToCommentTarget,
  commentTargetStorageKey,
  getActivityCommentsForTargets,
  type ActivityCommentPublic,
} from "@/lib/activity-comments";
import { prisma } from "@/lib/db";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ feed?: string; act?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Activities" });
  return { title: `${t("metaTitle")} · TheOpenLearn` };
}

export default async function ActivitiesPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const feedScopeRaw = parseActivityScope(sp.feed);
  const act = parseActivityKind(sp.act);

  const t = await getTranslations({ locale, namespace: "Activities" });
  const tCom = await getTranslations({ locale, namespace: "Community" });

  const { userId } = await auth();
  const appUser = userId
    ? await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      })
    : null;

  const feedScope =
    feedScopeRaw === "following" && !appUser ? "all" : feedScopeRaw;

  const activity = await getCommunityActivityFeed({
    scope: feedScope,
    kind: act,
    viewerAppUserId: appUser?.id ?? null,
    limit: 28,
  });

  const cohort = await getPublicCommunityCohort(null);
  const commentTargets = activity.map(activityToCommentTarget);
  const commentsMap =
    commentTargets.length > 0
      ? await getActivityCommentsForTargets(commentTargets)
      : new Map();

  const timelineItems = activity.map((item) => {
    const target = activityToCommentTarget(item);
    const key = commentTargetStorageKey(target.targetKind, target.targetId);
    const rawComments = commentsMap.get(key) ?? [];
    return {
      ...item,
      rel: formatCommunityRelativeTime(item.at, locale),
      comments: rawComments.map((c: ActivityCommentPublic) => ({
        id: c.id,
        body: c.body,
        rel: formatCommunityRelativeTime(c.createdAt, locale),
        createdAtIso: c.createdAt.toISOString(),
        authorId: c.authorId,
        displayName: c.displayName,
        lessonRefs: c.lessonRefs,
      })),
    };
  });

  const axisMeta: { key: keyof SkillRadarAxes; label: string; hint: string }[] =
    [
      { key: "volume", label: tCom("axisVolume"), hint: tCom("axisVolumeHint") },
      { key: "rigor", label: tCom("axisRigor"), hint: tCom("axisRigorHint") },
      {
        key: "breadth",
        label: tCom("axisBreadth"),
        hint: tCom("axisBreadthHint"),
      },
      { key: "drive", label: tCom("axisDrive"), hint: tCom("axisDriveHint") },
      {
        key: "mastery",
        label: tCom("axisMastery"),
        hint: tCom("axisMasteryHint"),
      },
    ];

  const previewAxes: SkillRadarAxes | null =
    cohort.length > 0 ? buildSkillRadarAxes(cohort[0], cohort) : null;

  const chipToolbar =
    "rounded-full px-3 py-1 text-[11px] font-semibold leading-none transition-all duration-200 sm:px-3.5 sm:py-1.5 sm:text-xs";
  const chipBase =
    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200";
  const chipIdle =
    "border border-[var(--border)]/90 bg-[var(--background)]/40 text-[var(--muted)] hover:border-[var(--foreground)]/15 hover:text-[var(--foreground)]";
  const chipActive =
    "border border-violet-500/50 bg-violet-500/15 text-violet-800 shadow-md shadow-violet-500/10 dark:text-violet-100";
  const chipRankCta =
    "border border-cyan-500/45 bg-cyan-500/12 text-cyan-900 shadow-md shadow-cyan-500/10 dark:text-cyan-100";
  const tabShell =
    "inline-flex shrink-0 rounded-full border border-[var(--border)]/80 bg-[var(--card)]/50 p-1 shadow-sm backdrop-blur-md";

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600/90 dark:text-violet-300">
              {t("timelineKicker")}
            </p>
            <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              {t("headline")}
            </h1>
            <p className="max-w-xl text-pretty text-sm text-[var(--muted)]">
              {t("intro")}
            </p>
            <p className="max-w-xl border-l-2 border-violet-500/35 pl-3 text-xs leading-relaxed text-[var(--muted)]">
              {t("postingHint")}
            </p>
            <p className="max-w-xl text-xs leading-relaxed text-[var(--muted)]/90">
              {t("scopeHelp")}
            </p>
          </div>
          <div className={cn(tabShell, "self-start overflow-x-auto")}>
            <Link
              href={rankingsHref({})}
              className={cn(chipBase, chipRankCta, "inline-flex items-center")}
            >
              {t("linkRankings")}
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-4">
          <div
            className={cn(
              "flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl border border-[var(--border)]/80",
              "bg-[var(--card)]/35 px-3 py-2.5 backdrop-blur-sm",
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                {t("scopeLabel")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                <Link
                  href={activitiesHref({ act })}
                  className={cn(
                    chipToolbar,
                    feedScope === "all" ? chipActive : chipIdle,
                  )}
                >
                  {t("filterEveryone")}
                </Link>
                {appUser ? (
                  <Link
                    href={activitiesHref({ feedScope: "following", act })}
                    className={cn(
                      chipToolbar,
                      feedScope === "following" ? chipActive : chipIdle,
                    )}
                  >
                    {t("filterFollowing")}
                  </Link>
                ) : (
                  <Link
                    href="/sign-in"
                    className={cn(
                      chipToolbar,
                      chipIdle,
                      "border-dashed opacity-90",
                    )}
                    title={t("signInFollowingTitle")}
                  >
                    {t("filterFollowing")}
                  </Link>
                )}
              </div>
            </div>
            <span
              className="hidden h-5 w-px shrink-0 bg-[var(--border)] sm:block"
              aria-hidden
            />
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                {t("typeLabel")}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["all", t("typeAll")] as const,
                    ["task", t("typeLessons")] as const,
                    ["badge", t("typeBadges")] as const,
                  ] as const
                ).map(([kind, label]) => (
                  <Link
                    key={kind}
                    href={activitiesHref({
                      feedScope: feedScopeRaw,
                      act: kind === "all" ? "all" : kind,
                    })}
                    className={cn(
                      chipToolbar,
                      act === kind ? chipActive : chipIdle,
                    )}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Card className="border-[var(--border)]/80 bg-[var(--card)]/50 shadow-md shadow-violet-500/[0.04] backdrop-blur-md">
            <CardHeader className="pb-2 pt-5">
              <CardTitle className="text-base">{t("eventsHeading")}</CardTitle>
              <CardDescription>{t("eventsIntro")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 pb-5 sm:grid-cols-2">
              {ACTIVITY_TIMELINE_EVENT_TYPES.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-xl border border-[var(--border)]/70 bg-[var(--background)]/25 px-3.5 py-3"
                >
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {evt.id === "task"
                      ? t("eventLessonTitle")
                      : t("eventBadgeTitle")}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
                    {evt.id === "task"
                      ? t("eventLessonBody")
                      : t("eventBadgeBody")}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          {timelineItems.length === 0 ? (
            <div
              className={cn(
                "rounded-3xl border border-[var(--border)]/80 bg-[var(--card)]/60 px-6 py-16 text-center backdrop-blur-md",
                "shadow-inner shadow-violet-500/[0.03]",
              )}
            >
              <p className="text-sm font-medium text-[var(--foreground)]">
                {feedScope === "following" && appUser
                  ? t("emptyFollowing")
                  : t("activityEmpty")}
              </p>
              {feedScope === "following" && appUser ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  {t("emptyFollowingHint")}
                </p>
              ) : null}
              {!appUser && feedScope === "all" ? (
                <p className="mt-4 text-sm">
                  <Link
                    href="/sign-in"
                    className="font-medium text-violet-600 hover:underline dark:text-violet-300"
                  >
                    {t("signInCta")}
                  </Link>
                </p>
              ) : null}
            </div>
          ) : (
            <ActivityTimeline
              items={timelineItems}
              selfUserId={appUser?.id ?? null}
              i18n={{
                anon: tCom("anon"),
                you: tCom("you"),
                verbLesson: t("activityVerbLesson"),
                verbBadge: t("activityVerbBadge"),
                profile: tCom("profile"),
                openOwnLesson: t("openOwnLesson"),
                journeyLabel: t("journeyLabel"),
                commentsHeading: t("commentsHeading"),
                commentPlaceholder: t("commentPlaceholder"),
                commentSubmit: t("commentSubmit"),
                commentPosting: t("commentPosting"),
                commentEmpty: t("commentEmpty"),
                signInToComment: t("signInToComment"),
                attachLessons: t("attachLessons"),
                refPickerTitle: t("refPickerTitle"),
                refPickerHint: t("refPickerHint"),
                refPickerDone: t("refPickerDone"),
                yourLessonChip: t("yourLessonChip"),
                referencedLesson: t("referencedLesson"),
                sharedTakeaway: t("sharedTakeaway"),
              }}
            />
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-b from-violet-500/[0.12] via-[var(--card)]/90 to-cyan-500/[0.06] shadow-xl shadow-violet-500/10 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{t("radarPreviewTitle")}</CardTitle>
              <CardDescription className="text-xs">
                {t("radarPreviewBody")}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pt-0 pb-6">
              {previewAxes ? (
                <SkillRadarSvg
                  axes={previewAxes}
                  axesMeta={axisMeta}
                  size={220}
                />
              ) : (
                <p className="py-10 text-center text-sm text-[var(--muted)]">
                  {t("emptyCohort")}
                </p>
              )}
            </CardContent>
          </Card>
          <p className="text-center text-xs text-[var(--muted)]">
            <Link
              href="/profile/settings#visibility"
              className="font-medium text-violet-600 hover:underline dark:text-violet-300"
            >
              {tCom("optInCta")}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
