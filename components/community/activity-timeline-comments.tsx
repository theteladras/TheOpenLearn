"use client";

import type { FeedActivityTarget } from "@prisma/client";
import { useEffect, useState, useTransition } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  addActivityComment,
  getMyLessonsForReference,
} from "@/server/actions/activity-comment-actions";
import { cn } from "@/lib/utils";
import { Paperclip } from "lucide-react";

export type ActivityCommentClientModel = {
  id: string;
  body: string;
  rel: string;
  createdAtIso: string;
  authorId: string;
  displayName: string | null;
  lessonRefs: { roadmapId: string; taskId: string; title: string }[] | null;
};

type LessonOption = {
  roadmapId: string;
  roadmapTitle: string;
  taskId: string;
  taskTitle: string;
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

export function ActivityTimelineComments({
  targetKind,
  targetId,
  initialComments,
  viewerUserId,
  anonLabel,
  labels,
}: {
  targetKind: FeedActivityTarget;
  targetId: string;
  initialComments: ActivityCommentClientModel[];
  viewerUserId: string | null;
  anonLabel: string;
  labels: {
    heading: string;
    placeholder: string;
    submit: string;
    posting: string;
    empty: string;
    signInToComment: string;
    attachLessons: string;
    refPickerTitle: string;
    refPickerHint: string;
    refPickerDone: string;
    yourLessonChip: string;
    referencedLesson: string;
  };
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [lessonsOpen, setLessonsOpen] = useState(false);
  const [lessonOptions, setLessonOptions] = useState<LessonOption[]>([]);
  const [lessonsLoading, setLessonsLoading] = useState(false);
  const [picked, setPicked] = useState<
    {
      roadmapId: string;
      taskId: string;
      taskTitle: string;
      roadmapTitle: string;
    }[]
  >([]);

  useEffect(() => {
    if (!lessonsOpen || !viewerUserId) return;
    setLessonsLoading(true);
    getMyLessonsForReference()
      .then(setLessonOptions)
      .catch(() => setLessonOptions([]))
      .finally(() => setLessonsLoading(false));
  }, [lessonsOpen, viewerUserId]);

  function togglePick(opt: LessonOption) {
    const key = `${opt.roadmapId}:${opt.taskId}`;
    setPicked((prev) => {
      const exists = prev.some(
        (p) => p.roadmapId === opt.roadmapId && p.taskId === opt.taskId,
      );
      if (exists) {
        return prev.filter((p) => `${p.roadmapId}:${p.taskId}` !== key);
      }
      if (prev.length >= 4) return prev;
      return [
        ...prev,
        {
          roadmapId: opt.roadmapId,
          taskId: opt.taskId,
          taskTitle: opt.taskTitle,
          roadmapTitle: opt.roadmapTitle,
        },
      ];
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = body.trim();
    if (!trimmed) return;
    startTransition(async () => {
      const res = await addActivityComment({
        targetKind,
        targetId,
        body: trimmed,
        lessonRefs:
          picked.length > 0
            ? picked.map((p) => ({ roadmapId: p.roadmapId, taskId: p.taskId }))
            : undefined,
      });
      if (res.ok) {
        setBody("");
        setPicked([]);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-4 border-t border-[var(--border)]/70 pt-4">
      <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {labels.heading}{" "}
        <span className="font-semibold tabular-nums text-[var(--foreground)]/80">
          ({initialComments.length})
        </span>
      </p>

      {initialComments.length > 0 ? (
        <ul className="mb-4 space-y-3">
          {initialComments.map((c) => {
            const name = c.displayName ?? anonLabel;
            const ini = initials(c.displayName, anonLabel);
            const selfViewer = viewerUserId === c.authorId;
            return (
              <li
                key={c.id}
                className="rounded-xl border border-[var(--border)]/50 bg-[var(--background)]/40 px-3 py-2.5"
              >
                <div className="flex gap-2">
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white",
                      "bg-gradient-to-br from-slate-500 to-slate-700 dark:from-slate-600 dark:to-slate-800",
                    )}
                  >
                    {ini}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                      <span className="text-xs font-semibold text-[var(--foreground)]">
                        {name}
                      </span>
                      <time
                        className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]"
                        dateTime={c.createdAtIso}
                      >
                        {c.rel}
                      </time>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-[var(--foreground)]/90">
                      {c.body}
                    </p>
                    {c.lessonRefs?.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {c.lessonRefs.map((ref) => (
                          <span
                            key={`${ref.roadmapId}-${ref.taskId}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-[11px] text-violet-800 dark:text-violet-200"
                          >
                            {selfViewer && viewerUserId ? (
                              <Link
                                href={`/roadmap/${ref.roadmapId}/task/${ref.taskId}`}
                                className="font-medium hover:underline"
                              >
                                {labels.yourLessonChip}: {ref.title}
                              </Link>
                            ) : (
                              <span>
                                {labels.referencedLesson}: {ref.title}
                              </span>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-[var(--muted)]">{labels.empty}</p>
      )}

      {viewerUserId ? (
        <form onSubmit={onSubmit} className="space-y-2">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={labels.placeholder}
            className="min-h-[88px] resize-y border-[var(--border)]/80 bg-[var(--background)]/50 text-sm"
            maxLength={4000}
            disabled={pending}
          />
          {picked.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {picked.map((p) => (
                <button
                  key={`${p.roadmapId}:${p.taskId}`}
                  type="button"
                  onClick={() =>
                    setPicked((prev) =>
                      prev.filter(
                        (x) =>
                          !(
                            x.roadmapId === p.roadmapId && x.taskId === p.taskId
                          ),
                      ),
                    )
                  }
                  className="rounded-full border border-violet-400/40 bg-violet-500/10 px-2.5 py-0.5 text-[11px] font-medium text-violet-800 hover:bg-violet-500/20 dark:text-violet-200"
                >
                  {p.taskTitle} ×
                </button>
              ))}
            </div>
          ) : null}
          {error ? (
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="submit"
              size="sm"
              disabled={pending || !body.trim()}
              className="rounded-full"
            >
              {pending ? labels.posting : labels.submit}
            </Button>
            <Dialog open={lessonsOpen} onOpenChange={setLessonsOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full border-dashed"
                  disabled={pending}
                >
                  <Paperclip className="mr-1.5 size-3.5 opacity-80" />
                  {labels.attachLessons}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[min(420px,80vh)] gap-0 overflow-hidden border-[var(--border)]/90 bg-[var(--card)] p-0 sm:max-w-md">
                <DialogHeader className="border-b border-[var(--border)]/70 px-4 py-3">
                  <DialogTitle className="text-base">
                    {labels.refPickerTitle}
                  </DialogTitle>
                  <p className="text-xs font-normal text-[var(--muted)]">
                    {labels.refPickerHint}
                  </p>
                </DialogHeader>
                <div className="max-h-[280px] overflow-y-auto px-2 py-2">
                  {lessonsLoading ? (
                    <p className="px-2 py-6 text-center text-sm text-[var(--muted)]">
                      …
                    </p>
                  ) : lessonOptions.length === 0 ? (
                    <p className="px-2 py-6 text-center text-sm text-[var(--muted)]">
                      —
                    </p>
                  ) : (
                    <ul className="space-y-0.5">
                      {lessonOptions.map((opt) => {
                        const on = picked.some(
                          (p) =>
                            p.roadmapId === opt.roadmapId &&
                            p.taskId === opt.taskId,
                        );
                        return (
                          <li key={`${opt.roadmapId}-${opt.taskId}`}>
                            <button
                              type="button"
                              onClick={() => togglePick(opt)}
                              className={cn(
                                "flex w-full flex-col items-start rounded-lg px-3 py-2 text-left text-sm transition",
                                on
                                  ? "bg-violet-500/15 text-[var(--foreground)]"
                                  : "hover:bg-[var(--accent-soft)]",
                              )}
                            >
                              <span className="font-medium">
                                {opt.taskTitle}
                              </span>
                              <span className="text-[11px] text-[var(--muted)]">
                                {opt.roadmapTitle}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <div className="border-t border-[var(--border)]/70 px-4 py-3">
                  <Button
                    type="button"
                    className="w-full rounded-xl"
                    onClick={() => setLessonsOpen(false)}
                  >
                    {labels.refPickerDone}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </form>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          <Link
            href="/sign-in"
            className="font-medium text-violet-600 hover:underline dark:text-violet-300"
          >
            {labels.signInToComment}
          </Link>
        </p>
      )}
    </div>
  );
}
