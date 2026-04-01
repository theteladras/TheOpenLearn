import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { CommunityFeedCards } from "@/components/community/community-feed-cards";
import { SkillRadarSvg } from "@/components/community/skill-radar-svg";
import { Badge } from "@/components/ui/badge";
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
import {
  formatCommunityRelativeTime,
  getCommunityActivityFeed,
  getPublicCommunityCohort,
} from "@/lib/community-data";
import {
  feedHref,
  parseCommunityView,
  parseFeedKind,
  parseFeedScope,
} from "@/lib/community-feed-url";
import { parseSortMode, sortMembers, SORT_MODES } from "@/lib/community-sort";
import {
  activityToCommentTarget,
  commentTargetStorageKey,
  getFeedCommentsForTargets,
  type FeedCommentPublic,
} from "@/lib/feed-comments";
import { prisma } from "@/lib/db";
import { TOPIC_CLUSTER_KEYS } from "@/lib/topic-cluster";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    sort?: string;
    cluster?: string;
    view?: string;
    feed?: string;
    act?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Community" });
  return { title: `${t("metaTitle")} · TheOpenLearn` };
}

export default async function FeedPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const view = parseCommunityView(sp.view);
  const sort = parseSortMode(sp.sort);
  const cluster =
    sp.cluster && (TOPIC_CLUSTER_KEYS as readonly string[]).includes(sp.cluster)
      ? sp.cluster
      : null;
  const feedScopeRaw = parseFeedScope(sp.feed);
  const act = parseFeedKind(sp.act);

  const t = await getTranslations({ locale, namespace: "Community" });
  const tCluster = await getTranslations({
    locale,
    namespace: "TopicClusters",
  });

  const { userId } = await auth();
  const appUser = userId
    ? await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { id: true },
      })
    : null;

  const cohort = await getPublicCommunityCohort(
    view === "rank" ? cluster : null,
  );
  const sorted = view === "rank" ? sortMembers(cohort, sort) : [];

  const feedScope =
    feedScopeRaw === "following" && !appUser ? "all" : feedScopeRaw;

  const activity =
    view === "feed"
      ? await getCommunityActivityFeed({
          scope: feedScope,
          kind: act,
          viewerAppUserId: appUser?.id ?? null,
          limit: 28,
        })
      : [];

  const commentTargets = activity.map(activityToCommentTarget);
  const commentsMap =
    view === "feed" && commentTargets.length > 0
      ? await getFeedCommentsForTargets(commentTargets)
      : new Map();

  const activityCards =
    view === "feed"
      ? activity.map((item) => {
          const target = activityToCommentTarget(item);
          const key = commentTargetStorageKey(
            target.targetKind,
            target.targetId,
          );
          const rawComments = commentsMap.get(key) ?? [];
          return {
            ...item,
            rel: formatCommunityRelativeTime(item.at, locale),
            comments: rawComments.map((c: FeedCommentPublic) => ({
              id: c.id,
              body: c.body,
              rel: formatCommunityRelativeTime(c.createdAt, locale),
              createdAtIso: c.createdAt.toISOString(),
              authorId: c.authorId,
              displayName: c.displayName,
              lessonRefs: c.lessonRefs,
            })),
          };
        })
      : [];

  const axisMeta: { key: keyof SkillRadarAxes; label: string; hint: string }[] =
    [
      { key: "volume", label: t("axisVolume"), hint: t("axisVolumeHint") },
      { key: "rigor", label: t("axisRigor"), hint: t("axisRigorHint") },
      { key: "breadth", label: t("axisBreadth"), hint: t("axisBreadthHint") },
      { key: "drive", label: t("axisDrive"), hint: t("axisDriveHint") },
      { key: "mastery", label: t("axisMastery"), hint: t("axisMasteryHint") },
    ];

  const previewAxes: SkillRadarAxes | null =
    cohort.length > 0 ? buildSkillRadarAxes(cohort[0], cohort) : null;

  const chipBase =
    "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200";
  const chipToolbar =
    "rounded-full px-3 py-1 text-[11px] font-semibold leading-none transition-all duration-200 sm:px-3.5 sm:py-1.5 sm:text-xs";
  const chipIdle =
    "border border-[var(--border)]/90 bg-[var(--background)]/40 text-[var(--muted)] hover:border-[var(--foreground)]/15 hover:text-[var(--foreground)]";
  const chipActiveFeed =
    "border border-violet-500/50 bg-violet-500/15 text-violet-800 shadow-md shadow-violet-500/10 dark:text-violet-100";
  const chipActiveRank =
    "border border-cyan-500/45 bg-cyan-500/12 text-cyan-900 shadow-md shadow-cyan-500/10 dark:text-cyan-100";
  const tabShell =
    "inline-flex shrink-0 rounded-full border border-[var(--border)]/80 bg-[var(--card)]/50 p-1 shadow-sm backdrop-blur-md";

  return (
    <div className="space-y-5 md:space-y-6">
      <header className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="min-w-0 space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-violet-600/90 dark:text-violet-300">
              {t("feedKicker")}
            </p>
            <h1 className="text-balance text-2xl font-semibold tracking-tight md:text-3xl">
              {t("headline")}
            </h1>
            <p className="max-w-xl text-pretty text-sm text-[var(--muted)]">
              {t("intro")}
            </p>
            {view === "feed" ? (
              <p className="max-w-xl border-l-2 border-violet-500/35 pl-3 text-xs leading-relaxed text-[var(--muted)]">
                {t("feedPostingHint")}
              </p>
            ) : null}
          </div>
          <div className={cn(tabShell, "self-start overflow-x-auto")}>
            <div className="flex w-max gap-1">
              <Link
                href={feedHref({
                  view: "feed",
                  feedScope: feedScopeRaw,
                  act,
                })}
                className={cn(
                  chipBase,
                  view === "feed" ? chipActiveFeed : chipIdle,
                )}
              >
                {t("tabFeed")}
              </Link>
              <Link
                href={feedHref({ view: "rank", sort, cluster })}
                className={cn(
                  chipBase,
                  view === "rank" ? chipActiveRank : chipIdle,
                )}
              >
                {t("tabRank")}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,300px)] lg:items-start lg:gap-8">
        <div className="min-w-0 space-y-4">
          {view === "feed" ? (
            <>
              <div
                className={cn(
                  "flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-2xl border border-[var(--border)]/80",
                  "bg-[var(--card)]/35 px-3 py-2.5 backdrop-blur-sm",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                    {t("feedScopeLabel")}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Link
                      href={feedHref({ view: "feed", act })}
                      className={cn(
                        chipToolbar,
                        feedScope === "all" ? chipActiveFeed : chipIdle,
                      )}
                    >
                      {t("feedFilterEveryone")}
                    </Link>
                    {appUser ? (
                      <Link
                        href={feedHref({
                          view: "feed",
                          feedScope: "following",
                          act,
                        })}
                        className={cn(
                          chipToolbar,
                          feedScope === "following" ? chipActiveFeed : chipIdle,
                        )}
                      >
                        {t("feedFilterFollowing")}
                      </Link>
                    ) : (
                      <Link
                        href="/sign-in"
                        className={cn(
                          chipToolbar,
                          chipIdle,
                          "border-dashed opacity-90",
                        )}
                        title={t("feedSignInFollowingTitle")}
                      >
                        {t("feedFilterFollowing")}
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
                    {t("feedTypeLabel")}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        ["all", t("feedTypeAll")] as const,
                        ["task", t("feedTypeLessons")] as const,
                        ["badge", t("feedTypeBadges")] as const,
                      ] as const
                    ).map(([kind, label]) => (
                      <Link
                        key={kind}
                        href={feedHref({
                          view: "feed",
                          feedScope: feedScopeRaw,
                          act: kind === "all" ? "all" : kind,
                        })}
                        className={cn(
                          chipToolbar,
                          act === kind ? chipActiveFeed : chipIdle,
                        )}
                      >
                        {label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>

              {activityCards.length === 0 ? (
                <div
                  className={cn(
                    "rounded-3xl border border-[var(--border)]/80 bg-[var(--card)]/60 px-6 py-16 text-center backdrop-blur-md",
                    "shadow-inner shadow-violet-500/[0.03]",
                  )}
                >
                  <p className="text-sm font-medium text-[var(--foreground)]">
                    {feedScope === "following" && appUser
                      ? t("feedEmptyFollowing")
                      : t("activityEmpty")}
                  </p>
                  {feedScope === "following" && appUser ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      {t("feedEmptyFollowingHint")}
                    </p>
                  ) : null}
                  {!appUser && feedScope === "all" ? (
                    <p className="mt-4 text-sm">
                      <Link
                        href="/sign-in"
                        className="font-medium text-violet-600 hover:underline dark:text-violet-300"
                      >
                        {t("feedSignInCta")}
                      </Link>
                    </p>
                  ) : null}
                </div>
              ) : (
                <CommunityFeedCards
                  items={activityCards}
                  selfUserId={appUser?.id ?? null}
                  i18n={{
                    anon: t("anon"),
                    you: t("you"),
                    verbLesson: t("activityVerbLesson"),
                    verbBadge: t("activityVerbBadge"),
                    profile: t("profile"),
                    openOwnLesson: t("feedOpenOwnLesson"),
                    journeyLabel: t("feedJourneyLabel"),
                    commentsHeading: t("feedCommentsHeading"),
                    commentPlaceholder: t("feedCommentPlaceholder"),
                    commentSubmit: t("feedCommentSubmit"),
                    commentPosting: t("feedCommentPosting"),
                    commentEmpty: t("feedCommentEmpty"),
                    signInToComment: t("feedSignInToComment"),
                    attachLessons: t("feedAttachLessons"),
                    refPickerTitle: t("feedRefPickerTitle"),
                    refPickerHint: t("feedRefPickerHint"),
                    refPickerDone: t("feedRefPickerDone"),
                    yourLessonChip: t("feedYourLessonChip"),
                    referencedLesson: t("feedReferencedLesson"),
                    sharedTakeaway: t("feedSharedTakeaway"),
                  }}
                />
              )}
            </>
          ) : (
            <>
              <Card className="border-[var(--border)]/80 bg-[var(--card)]/70 shadow-lg shadow-violet-500/[0.04] backdrop-blur-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{t("filtersTitle")}</CardTitle>
                  <CardDescription>{t("filtersHint")}</CardDescription>
                  <p className="text-xs text-[var(--muted)]">
                    {t("difficultyNote")}
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-5">
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      {t("filterSort")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {SORT_MODES.map((m) => (
                        <Link
                          key={m}
                          href={feedHref({
                            view: "rank",
                            sort: m,
                            cluster,
                          })}
                          className={cn(
                            chipBase,
                            sort === m ? chipActiveRank : chipIdle,
                          )}
                        >
                          {t(`sort_${m}` as "sort_lessons")}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      {t("filterTopic")}
                    </p>
                    <div className="flex max-h-44 flex-wrap gap-2 overflow-y-auto pr-1">
                      <Link
                        href={feedHref({
                          view: "rank",
                          sort,
                          cluster: null,
                        })}
                        className={cn(
                          chipBase,
                          !cluster ? chipActiveRank : chipIdle,
                        )}
                      >
                        {t("clusterAll")}
                      </Link>
                      {TOPIC_CLUSTER_KEYS.map((k) => (
                        <Link
                          key={k}
                          href={feedHref({
                            view: "rank",
                            sort,
                            cluster: k,
                          })}
                          className={cn(
                            chipBase,
                            cluster === k ? chipActiveRank : chipIdle,
                          )}
                        >
                          {tCluster(k)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  {t("tableTitle")}
                </h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {t("tableCount", { count: sorted.length })}
                </p>
                {sorted.length === 0 ? (
                  <p className="mt-8 rounded-2xl border border-dashed border-[var(--border)] px-4 py-12 text-center text-sm text-[var(--muted)]">
                    {t("emptyTable")}
                  </p>
                ) : (
                  <ul className="mt-4 flex flex-col gap-3">
                    {sorted.map((m) => {
                      const rigor =
                        m.tasksDone > 0
                          ? Math.round(m.challengeXp / m.tasksDone)
                          : 0;
                      const self = appUser?.id === m.userId;
                      return (
                        <li key={m.userId}>
                          <div
                            className={cn(
                              "group relative overflow-hidden rounded-2xl border border-[var(--border)]/80",
                              "bg-gradient-to-br from-[var(--card)]/95 via-[var(--card)]/80 to-violet-500/[0.04] p-4",
                              "shadow-md shadow-black/[0.03] backdrop-blur-md transition duration-300",
                              "hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/[0.06]",
                              self && "ring-1 ring-violet-500/25",
                            )}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-semibold">
                                    {m.displayName ?? t("anon")}
                                  </span>
                                  {self ? (
                                    <Badge
                                      variant="default"
                                      className="text-[10px]"
                                    >
                                      {t("you")}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs tabular-nums text-[var(--muted)]">
                                  <span>
                                    {t("colLessons")}:{" "}
                                    <strong className="text-[var(--foreground)]">
                                      {m.tasksDone}
                                    </strong>
                                  </span>
                                  <span>
                                    {t("colRigor")}:{" "}
                                    <strong className="text-[var(--foreground)]">
                                      {rigor}
                                    </strong>
                                  </span>
                                  <span>
                                    {t("colXp")}:{" "}
                                    <strong className="text-[var(--foreground)]">
                                      {m.xpTotal}
                                    </strong>
                                  </span>
                                  <span>
                                    {t("colStreak")}:{" "}
                                    <strong className="text-[var(--foreground)]">
                                      {m.streakDays}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                              <Link
                                href={`/community/u/${m.userId}`}
                                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-700 transition group-hover:bg-violet-500/20 dark:text-violet-200"
                              >
                                {t("profile")}
                              </Link>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <Card className="overflow-hidden border-violet-500/20 bg-gradient-to-b from-violet-500/[0.12] via-[var(--card)]/90 to-cyan-500/[0.06] shadow-xl shadow-violet-500/10 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {t("radarPreviewTitle")}
              </CardTitle>
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
              href="/settings#visibility"
              className="font-medium text-violet-600 hover:underline dark:text-violet-300"
            >
              {t("optInCta")}
            </Link>
          </p>
        </aside>
      </div>
    </div>
  );
}
