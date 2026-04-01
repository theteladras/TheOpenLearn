import { Award, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { CommunityActivityItem } from "@/lib/community-data";
import { activityToCommentTarget } from "@/lib/feed-comments";
import { FeedActivityComments } from "@/components/community/feed-activity-comments";
import type { FeedCommentClientModel } from "@/components/community/feed-activity-comments";
import { cn } from "@/lib/utils";

export type CommunityFeedCardModel = CommunityActivityItem & {
  rel: string;
  comments: FeedCommentClientModel[];
};

function initials(name: string | null, anon: string): string {
  const s = (name ?? anon).trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return s.slice(0, 2).toUpperCase();
}

export function CommunityFeedCards({
  items,
  selfUserId,
  i18n,
}: {
  items: CommunityFeedCardModel[];
  selfUserId: string | null;
  i18n: {
    anon: string;
    you: string;
    verbLesson: string;
    verbBadge: string;
    profile: string;
    openOwnLesson: string;
    journeyLabel: string;
    commentsHeading: string;
    commentPlaceholder: string;
    commentSubmit: string;
    commentPosting: string;
    commentEmpty: string;
    signInToComment: string;
    attachLessons: string;
    refPickerTitle: string;
    refPickerHint: string;
    refPickerDone: string;
    yourLessonChip: string;
    referencedLesson: string;
    sharedTakeaway: string;
  };
}) {
  return (
    <ul className="flex flex-col gap-4">
      {items.map((item) => {
        const name = item.displayName ?? i18n.anon;
        const ini = initials(item.displayName, i18n.anon);
        const self = selfUserId === item.userId;
        const task = item.kind === "task";
        const target = activityToCommentTarget(item);
        const stableKey = task
          ? `task-${item.progressId}`
          : `badge-${item.userAchievementId}`;

        return (
          <li key={stableKey}>
            <article
              className={cn(
                "relative overflow-hidden rounded-[1.35rem] border border-[var(--border)]/80",
                "bg-gradient-to-br from-violet-500/[0.07] via-[var(--card)]/92 to-cyan-500/[0.05]",
                "p-5 shadow-lg shadow-violet-500/[0.07] backdrop-blur-md",
                "transition duration-300 hover:border-violet-500/30 hover:shadow-violet-500/12",
              )}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="relative flex gap-4">
                <div
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sm font-bold tracking-tight text-white shadow-lg",
                    task
                      ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-violet-600/20"
                      : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-orange-600/15",
                  )}
                >
                  {ini}
                </div>
                <div className="min-w-0 flex-1 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                    <p className="text-[15px] leading-snug text-[var(--foreground)]">
                      <Link
                        href={`/community/u/${item.userId}`}
                        className="font-semibold text-violet-600 hover:underline dark:text-violet-300"
                      >
                        {name}
                      </Link>
                      {self ? (
                        <Badge
                          variant="default"
                          className="ml-2 align-middle text-[10px]"
                        >
                          {i18n.you}
                        </Badge>
                      ) : null}
                      <span className="font-normal text-[var(--muted)]">
                        {" "}
                        {task ? i18n.verbLesson : i18n.verbBadge}
                      </span>
                    </p>
                    <time
                      dateTime={item.at.toISOString()}
                      className="shrink-0 text-[11px] font-semibold tabular-nums uppercase tracking-wide text-[var(--muted)]"
                    >
                      {item.rel}
                    </time>
                  </div>

                  <div
                    className={cn(
                      "flex flex-col gap-2 rounded-2xl border border-[var(--border)]/60 bg-[var(--background)]/35 p-3.5 sm:flex-row sm:items-start sm:gap-3",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
                        task
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {task ? (
                        <CheckCircle2 className="size-4" aria-hidden />
                      ) : (
                        <Award className="size-4" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      {task ? (
                        <>
                          <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">
                            {item.taskTitle}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            <span className="font-medium text-[var(--foreground)]/75">
                              {i18n.journeyLabel}
                            </span>{" "}
                            {item.roadmapTitle}
                          </p>
                          {item.feedCaption ? (
                            <div className="mt-2.5 rounded-xl border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700/90 dark:text-violet-300/90">
                                {i18n.sharedTakeaway}
                              </p>
                              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]/95">
                                {item.feedCaption}
                              </p>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p className="text-sm font-semibold leading-snug text-[var(--foreground)]">
                          {item.badgeIcon ? (
                            <span className="mr-1.5" aria-hidden>
                              {item.badgeIcon}
                            </span>
                          ) : null}
                          {item.badgeTitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/community/u/${item.userId}`}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border)]/80 bg-[var(--background)]/40 px-3 py-1.5 text-xs font-semibold text-violet-700 transition hover:border-violet-500/35 hover:bg-violet-500/10 dark:text-violet-300"
                    >
                      {i18n.profile}
                      <ArrowUpRight className="size-3.5 opacity-70" />
                    </Link>
                    {task && self ? (
                      <Link
                        href={`/roadmap/${item.roadmapId}/task/${item.taskId}`}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-700"
                      >
                        {i18n.openOwnLesson}
                        <ArrowUpRight className="size-3.5 opacity-90" />
                      </Link>
                    ) : null}
                  </div>

                  <FeedActivityComments
                    targetKind={target.targetKind}
                    targetId={target.targetId}
                    initialComments={item.comments}
                    viewerUserId={selfUserId}
                    anonLabel={i18n.anon}
                    labels={{
                      heading: i18n.commentsHeading,
                      placeholder: i18n.commentPlaceholder,
                      submit: i18n.commentSubmit,
                      posting: i18n.commentPosting,
                      empty: i18n.commentEmpty,
                      signInToComment: i18n.signInToComment,
                      attachLessons: i18n.attachLessons,
                      refPickerTitle: i18n.refPickerTitle,
                      refPickerHint: i18n.refPickerHint,
                      refPickerDone: i18n.refPickerDone,
                      yourLessonChip: i18n.yourLessonChip,
                      referencedLesson: i18n.referencedLesson,
                    }}
                  />
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
