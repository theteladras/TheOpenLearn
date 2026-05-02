import { Award, ArrowUpRight, CheckCircle2, MessageCircle } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import type { CommunityActivityItem } from "@/lib/community-data";
import { activityToCommentTarget } from "@/lib/activity-comments";
import { ActivityTimelineComments } from "@/components/community/activity-timeline-comments";
import type { ActivityCommentClientModel } from "@/components/community/activity-timeline-comments";
import { cn } from "@/lib/utils";

export type ActivityTimelineItemModel = CommunityActivityItem & {
  rel: string;
  comments: ActivityCommentClientModel[];
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

export function ActivityTimeline({
  items,
  selfUserId,
  i18n,
}: {
  items: ActivityTimelineItemModel[];
  selfUserId: string | null;
  i18n: {
    anon: string;
    you: string;
    verbLesson: string;
    verbBadge: string;
    verbCoach: string;
    coachYourQuestion: string;
    coachGuideReply: string;
    coachPublicBlurb: string;
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
    <ol className="relative flex flex-col">
      {items.map((item, index) => {
        const name = item.displayName ?? i18n.anon;
        const ini = initials(item.displayName, i18n.anon);
        const self = selfUserId === item.userId;
        const isTask = item.kind === "task";
        const isCoach = item.kind === "coach";
        const isBadge = item.kind === "badge";
        const target = activityToCommentTarget(item);
        const stableKey = isTask
          ? `task-${item.progressId}`
          : isCoach
            ? `coach-${item.coachActivityId}`
            : `badge-${item.userAchievementId}`;
        const isLast = index === items.length - 1;

        return (
          <li
            key={stableKey}
            className={cn(
              "relative flex gap-0",
              !isLast && "mb-6 sm:mb-8",
            )}
          >
            <div
              className="flex w-9 shrink-0 flex-col items-center pt-1 sm:w-10"
              aria-hidden
            >
              <span
                className={cn(
                  "z-[1] size-3 rounded-full shadow-md ring-4 ring-[var(--background)] sm:size-3.5",
                  isTask
                    ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-violet-500/30"
                    : isCoach
                      ? "bg-gradient-to-br from-cyan-500 to-sky-600 shadow-cyan-500/25"
                      : "bg-gradient-to-br from-amber-400 to-orange-600 shadow-orange-500/25",
                )}
              />
              {!isLast ? (
                <span className="mt-1 w-px flex-1 min-h-8 bg-gradient-to-b from-violet-500/35 via-violet-500/12 to-transparent dark:from-violet-400/25" />
              ) : null}
            </div>

            <article
              className={cn(
                "min-w-0 flex-1 pl-3 sm:pl-4",
                "relative overflow-hidden rounded-[1.35rem] border border-[var(--border)]/80",
                "bg-gradient-to-br from-violet-500/[0.06] via-[var(--card)]/92 to-cyan-500/[0.04]",
                "px-5 pb-5 pt-5 shadow-lg shadow-violet-500/[0.06] backdrop-blur-md",
                "transition duration-300 hover:border-violet-500/28 hover:shadow-violet-500/10",
              )}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
              <div className="relative flex gap-4">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold tracking-tight text-white shadow-lg sm:h-12 sm:w-12",
                    isTask
                      ? "bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-violet-600/20"
                      : isCoach
                        ? "bg-gradient-to-br from-cyan-500 to-sky-600 shadow-cyan-600/20"
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
                        {isTask
                          ? i18n.verbLesson
                          : isCoach
                            ? i18n.verbCoach
                            : i18n.verbBadge}
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
                        isTask
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : isCoach
                            ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {isTask ? (
                        <CheckCircle2 className="size-4" aria-hidden />
                      ) : isCoach ? (
                        <MessageCircle className="size-4" aria-hidden />
                      ) : (
                        <Award className="size-4" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      {isTask ? (
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
                      ) : isCoach ? (
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
                          {item.userMessageExcerpt || item.assistantExcerpt ? (
                            <div className="mt-2.5 space-y-2">
                              {item.userMessageExcerpt ? (
                                <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-3 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-800/90 dark:text-cyan-300/90">
                                    {i18n.coachYourQuestion}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]/95">
                                    {item.userMessageExcerpt}
                                  </p>
                                </div>
                              ) : null}
                              {item.assistantExcerpt ? (
                                <div className="rounded-xl border border-[var(--border)]/80 bg-[var(--background)]/40 px-3 py-2">
                                  <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                                    {i18n.coachGuideReply}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]/95">
                                    {item.assistantExcerpt}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
                              {i18n.coachPublicBlurb}
                            </p>
                          )}
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
                    {(isTask || isCoach) && self ? (
                      <Link
                        href={`/roadmap/${item.roadmapId}/task/${item.taskId}`}
                        className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-violet-600/25 transition hover:bg-violet-700"
                      >
                        {i18n.openOwnLesson}
                        <ArrowUpRight className="size-3.5 opacity-90" />
                      </Link>
                    ) : null}
                  </div>

                  <ActivityTimelineComments
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
    </ol>
  );
}
