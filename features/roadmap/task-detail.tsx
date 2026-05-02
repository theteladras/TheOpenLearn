"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookMarked,
  ChevronDown,
  Clock,
  Coins,
  Lightbulb,
  Loader2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import {
  CelebrationOverlay,
  type CelebrationKind,
} from "@/components/rewards/celebration-overlay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { LearningRichText } from "@/components/learning/learning-rich-text";
import { parseTaskQuizQuestions } from "@/lib/task-quiz";
import type { TaskQuizQuestion } from "@/types/ai";
import { createLessonHandbookPurchase } from "@/server/actions/lesson-handbook-actions";
import {
  markTaskComplete,
  saveTaskNotes,
  submitTaskQuiz,
} from "@/server/actions/learning-actions";
import { TaskCoachChat } from "@/features/roadmap/task-coach-chat";
import { TaskAchievementChips } from "@/features/roadmap/task-achievement-chips";
import { TaskKeywordLinks } from "@/features/roadmap/task-keyword-links";
import { TaskTopicWalkthrough } from "@/features/roadmap/task-topic-walkthrough";
import { pickLearningSideFacts } from "@/lib/task-side-facts";
import { cn } from "@/lib/utils";

const writingsSchema = z.object({
  notes: z.string().max(8000),
  feedCaption: z.string().max(2000),
});

function resourceTypeLabel(type: string, tr: (key: string) => string) {
  switch (type.trim().toLowerCase()) {
    case "primary":
      return tr("resourceRolePrimary");
    case "alternate":
      return tr("resourceRoleAlternate");
    case "video":
      return tr("resourceRoleVideo");
    case "article":
      return tr("resourceRoleArticle");
    case "doc":
      return tr("resourceRoleDoc");
    case "link":
      return tr("resourceRoleLink");
    default:
      return type;
  }
}

type Resource = { id: string; title: string; url: string | null; type: string };
type Evaluation = {
  summary: string | null;
  checkpointDescription: string | null;
  quizQuestions: unknown;
};

type Props = {
  roadmapId: string;
  /** Free users pay per coach message; PRO does not. */
  coachChargePerMessage: boolean;
  handbookOwned: boolean;
  handbookCoinCost: number;
  task: {
    id: string;
    title: string;
    explanation: string | null;
    whyMatters: string | null;
    mentorPerspective: string | null;
    instructions: string | null;
    recap: string | null;
    funFacts: string[];
    keyTerms: string[];
    xpReward: number;
    resources: Resource[];
    evaluation: Evaluation | null;
    status: "LOCKED" | "AVAILABLE" | "COMPLETED";
    notes: string | null;
    feedCaption: string | null;
    quizSubmissionCount: number;
    quizFailCount: number;
    quizPassedAt: string | null;
    achievementKeys: string[];
    lessonTimeMinutes: number;
  };
};

export function TaskDetail({
  roadmapId,
  coachChargePerMessage,
  handbookOwned: handbookOwnedProp,
  handbookCoinCost,
  task,
}: Props) {
  const router = useRouter();
  const t = useTranslations("Task");
  const tRoad = useTranslations("Roadmap");
  const [busy, setBusy] = useState(false);
  const [quizBusy, setQuizBusy] = useState(false);
  const [status, setStatus] = useState(task.status);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebration, setCelebration] = useState<{
    kind: CelebrationKind;
    xp: number;
    coins: number;
    title: string;
    subtitle?: string;
    levelUp: { from: number; to: number } | null;
  } | null>(null);
  const [writingsOpen, setWritingsOpen] = useState(false);
  const [writingTab, setWritingTab] = useState<"note" | "comment">("note");
  const [handbookOwned, setHandbookOwned] = useState(handbookOwnedProp);
  const [handbookBusy, setHandbookBusy] = useState(false);

  useEffect(() => {
    setHandbookOwned(handbookOwnedProp);
  }, [handbookOwnedProp, task.id]);

  const questions: TaskQuizQuestion[] = useMemo(
    () => parseTaskQuizQuestions(task.evaluation?.quizQuestions ?? null),
    [task.evaluation?.quizQuestions],
  );
  const hasQuiz = questions.length > 0;

  const keywordTerms = useMemo(
    () => task.keyTerms.map((s) => s.trim()).filter(Boolean),
    [task.keyTerms],
  );
  const sideFactLines = useMemo(() => {
    const fromTask = task.funFacts
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    if (fromTask.length >= 2) return fromTask;
    const fallbackPool = pickLearningSideFacts(task.id, 4);
    if (fromTask.length === 1) {
      const second =
        fallbackPool.find((f) => f !== fromTask[0]) ?? fallbackPool[0];
      return second ? [fromTask[0]!, second] : [fromTask[0]!];
    }
    return fallbackPool.slice(0, 2);
  }, [task.funFacts, task.id]);
  const hasTaskSidebar =
    Boolean(task.whyMatters?.trim()) ||
    task.resources.length > 0 ||
    Boolean(task.evaluation?.checkpointDescription?.trim()) ||
    keywordTerms.length > 0 ||
    sideFactLines.length > 0;

  const [quizPassed, setQuizPassed] = useState(() =>
    Boolean(task.quizPassedAt),
  );
  const [submissionCount, setSubmissionCount] = useState(
    task.quizSubmissionCount,
  );
  const [failCount, setFailCount] = useState(task.quizFailCount);
  /** Question indices (0-based) marked wrong after the last graded submit. */
  const [wrongIndicesAfterSubmit, setWrongIndicesAfterSubmit] = useState<
    number[] | null
  >(null);
  const [selections, setSelections] = useState<number[]>(() =>
    questions.map(() => -1),
  );

  const onCelebrationClose = useCallback(() => {
    setCelebrationOpen(false);
    setCelebration(null);
    router.push(`/roadmap/${roadmapId}`);
  }, [router, roadmapId]);

  const quizErrorMessage = (code: string) => {
    switch (code) {
      case "QUIZ_ANSWERS_INVALID":
        return t("quizErrorInvalid");
      case "QUIZ_INCOMPLETE":
        return t("quizAnswerEvery");
      case "QUIZ_INVALID_CHOICE":
        return t("quizErrorInvalidChoice");
      case "Task not available.":
        return t("quizErrorNotAvailable");
      case "No quiz for this task.":
        return t("quizErrorNoQuiz");
      default:
        return code;
    }
  };

  useEffect(() => {
    setQuizPassed(Boolean(task.quizPassedAt));
    setSubmissionCount(task.quizSubmissionCount);
    setFailCount(task.quizFailCount);
    setSelections(
      parseTaskQuizQuestions(task.evaluation?.quizQuestions ?? null).map(
        () => -1,
      ),
    );
    setWrongIndicesAfterSubmit(null);
  }, [
    task.id,
    task.quizPassedAt,
    task.quizSubmissionCount,
    task.quizFailCount,
    task.evaluation?.quizQuestions,
  ]);

  const canComplete = hasQuiz && quizPassed;
  const completeHint = canComplete
    ? t("completeReady")
    : !hasQuiz
      ? t("completeBlockedNoExam")
      : t("completeBlockedQuiz");

  const form = useForm<{ notes: string; feedCaption: string }>({
    resolver: zodResolver(writingsSchema),
    defaultValues: {
      notes: task.notes ?? "",
      feedCaption: task.feedCaption ?? "",
    },
  });

  useEffect(() => {
    form.reset({
      notes: task.notes ?? "",
      feedCaption: task.feedCaption ?? "",
    });
  }, [task.id, task.notes, task.feedCaption]);

  async function onSaveWritings(values: {
    notes: string;
    feedCaption: string;
  }) {
    const r = await saveTaskNotes(task.id, values.notes, values.feedCaption);
    if (r.ok) toast.success(t("saveNotes"));
    else toast.error(r.error);
  }

  async function onQuizSubmit() {
    if (!hasQuiz) return;
    const missing = selections.some((s) => s < 0);
    if (missing) {
      toast.error(t("quizPickOne"));
      return;
    }
    setQuizBusy(true);
    setWrongIndicesAfterSubmit(null);
    try {
      const r = await submitTaskQuiz(task.id, selections);
      if (!r.ok) {
        toast.error(quizErrorMessage(r.error));
        return;
      }
      setSubmissionCount(r.submissionCount);
      setFailCount(r.failCount);
      if (r.passed) {
        setQuizPassed(true);
        setWrongIndicesAfterSubmit(null);
        toast.success(t("quizPassed"));
      } else {
        const wrong = r.wrongIndices ?? [];
        setWrongIndicesAfterSubmit(wrong);
        const total = r.total ?? questions.length;
        const correct = r.correctCount ?? 0;
        toast.error(t("quizFailedToastTitle"), {
          description:
            wrong.length > 0
              ? `${t("quizFailed", { correct, total })} ${t("quizFailedHint", { numbers: wrong.map((i) => i + 1).join(", ") })}`
              : t("quizFailed", { correct, total }),
        });
      }
    } finally {
      setQuizBusy(false);
    }
  }

  async function onComplete() {
    setBusy(true);
    try {
      const { notes: notesVal, feedCaption: capVal } = form.getValues();
      await saveTaskNotes(task.id, notesVal, capVal);
      const r = await markTaskComplete(task.id);
      if (!r.ok) {
        if (r.error === "QUIZ_NOT_PASSED")
          toast.error(t("completeBlockedQuiz"));
        else if (r.error === "EXAM_REQUIRED")
          toast.error(t("completeBlockedNoExam"));
        else toast.error(r.error);
        return;
      }
      setStatus("COMPLETED");
      const title =
        r.celebration === "roadmap"
          ? t("celebrationRoadmap")
          : r.celebration === "phase"
            ? t("celebrationPhase")
            : t("celebrationTask");
      const subtitle =
        r.coinsEarned > 0
          ? t("celebrationCoins", { n: r.coinsEarned })
          : undefined;
      setCelebration({
        kind: r.celebration,
        xp: r.xpGained,
        coins: r.coinsEarned,
        title,
        subtitle,
        levelUp: r.levelUp,
      });
      setCelebrationOpen(true);
      if (r.newAchievements.length) {
        toast.message(`Achievement: ${r.newAchievements.join(", ")}`);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {celebration && (
        <CelebrationOverlay
          open={celebrationOpen}
          onClose={onCelebrationClose}
          kind={celebration.kind}
          xpGained={celebration.xp}
          coinsEarned={celebration.coins}
          title={celebration.title}
          subtitle={celebration.subtitle}
          levelUp={celebration.levelUp}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/roadmap/${roadmapId}`}>{t("backToRoadmap")}</Link>
        </Button>
        {status === "COMPLETED" && (
          <motion.span
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-sm font-medium text-emerald-600 dark:text-emerald-400"
          >
            {tRoad("done")}
          </motion.span>
        )}
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{task.title}</h1>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted)]">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
            {t("lessonTime", { minutes: task.lessonTimeMinutes })}
          </span>
          <span className="text-xs opacity-80">· {t("lessonTimeHelp")}</span>
        </p>
      </div>

      <TaskAchievementChips
        keys={task.achievementKeys}
        label={tRoad("achievementTracks")}
        className="mt-2"
      />

      {task.explanation?.trim() && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-[var(--foreground)]">
              {t("overview")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-[var(--muted)] leading-relaxed">
            <LearningRichText content={task.explanation} />
          </CardContent>
        </Card>
      )}

      <TaskTopicWalkthrough
        mentorPerspective={task.mentorPerspective}
        instructions={task.instructions}
      />

      {task.recap?.trim() && (
        <Card className="border-emerald-600/20 bg-emerald-600/[0.06] dark:border-emerald-500/25 dark:bg-emerald-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-[var(--foreground)]">
              {t("recapTitle")}
            </CardTitle>
            <p className="text-xs font-normal leading-relaxed text-[var(--muted)]">
              {t("recapHint")}
            </p>
          </CardHeader>
          <CardContent className="text-[var(--foreground)] leading-relaxed">
            <LearningRichText content={task.recap} />
          </CardContent>
        </Card>
      )}

      <TaskCoachChat
        taskId={task.id}
        status={status}
        chargePerMessage={coachChargePerMessage}
      />

      {status === "COMPLETED" && (
        <Card className="border-indigo-500/25 bg-gradient-to-br from-indigo-500/[0.07] to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookMarked
                className="size-5 text-indigo-600 dark:text-indigo-400"
                aria-hidden
              />
              {t("handbookTitle")}
            </CardTitle>
            <p className="text-sm font-normal leading-relaxed text-[var(--muted)]">
              {handbookOwned
                ? t("handbookOwnedHint")
                : coachChargePerMessage
                  ? t("handbookTeaserPaid", { n: handbookCoinCost })
                  : t("handbookTeaserPro")}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3 pt-0">
            {handbookOwned ? (
              <Button variant="secondary" className="gap-2" asChild>
                <a
                  href={`/api/lesson-handbook/${task.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("handbookDownload")}
                </a>
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  className="gap-2"
                  disabled={handbookBusy}
                  onClick={() => {
                    void (async () => {
                      setHandbookBusy(true);
                      try {
                        const r = await createLessonHandbookPurchase(task.id);
                        if (!r.ok) {
                          const msg =
                            r.error === "INSUFFICIENT_COINS"
                              ? t("handbookErrorCoins")
                              : r.error === "LESSON_NOT_COMPLETE"
                                ? t("handbookErrorIncomplete")
                                : r.error === "NOT_FOUND"
                                  ? t("handbookErrorNotFound")
                                  : t("handbookErrorFailed");
                          toast.error(msg);
                          return;
                        }
                        setHandbookOwned(true);
                        toast.success(t("handbookReadyToast"));
                        window.open(
                          r.downloadPath,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      } finally {
                        setHandbookBusy(false);
                      }
                    })();
                  }}
                >
                  {handbookBusy ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t("handbookGenerating")}
                    </>
                  ) : (
                    <>
                      {coachChargePerMessage && (
                        <Coins
                          className="size-4 text-amber-700 dark:text-amber-300"
                          aria-hidden
                        />
                      )}
                      {coachChargePerMessage
                        ? t("handbookCreateWithCoins", { n: handbookCoinCost })
                        : t("handbookCreateFree")}
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div
        className={
          hasTaskSidebar
            ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_min(100%,18rem)] lg:items-start lg:gap-8"
            : "contents"
        }
      >
        {hasTaskSidebar && (
          <aside className="order-1 space-y-4 lg:sticky lg:top-24 lg:order-2 lg:self-start">
            {task.whyMatters?.trim() && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("why")}</CardTitle>
                </CardHeader>
                <CardContent className="text-[var(--muted)] leading-relaxed">
                  <LearningRichText content={task.whyMatters} />
                </CardContent>
              </Card>
            )}
            <TaskKeywordLinks terms={keywordTerms} />
            {task.resources.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {tRoad("resources")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {task.resources.map((r) => (
                      <li key={r.id}>
                        {r.url ? (
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[var(--accent)] hover:underline"
                          >
                            {r.title}
                          </a>
                        ) : (
                          <span>{r.title}</span>
                        )}
                        <span className="text-[var(--muted)]">
                          {" · "}
                          {resourceTypeLabel(r.type, t)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {sideFactLines.length > 0 && (
              <Card className="border-amber-500/25 bg-amber-500/[0.06] dark:bg-amber-500/[0.08]">
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Lightbulb
                      className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
                      aria-hidden
                    />
                    {t("funFactsTitle")}
                  </CardTitle>
                  <p className="text-xs font-normal leading-relaxed text-[var(--muted)]">
                    {t("funFactsHint")}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="list-disc space-y-2.5 pl-4 text-sm leading-relaxed text-[var(--foreground)] marker:text-amber-600/70 dark:marker:text-amber-400/70">
                    {sideFactLines.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
            {task.evaluation?.checkpointDescription?.trim() && (
              <Card className="border-[var(--border)]/90 bg-[var(--card)] ring-1 ring-[var(--border)]/50">
                <CardHeader className="space-y-1 pb-2">
                  <CardTitle className="text-base">
                    {t("checkpointHintTitle")}
                  </CardTitle>
                  <p className="text-xs font-normal leading-relaxed text-[var(--muted)]">
                    {t("checkpointHintNotQuiz")}
                  </p>
                </CardHeader>
                <CardContent className="pt-0 text-sm text-[var(--foreground)] leading-relaxed">
                  <LearningRichText
                    content={task.evaluation.checkpointDescription}
                  />
                </CardContent>
              </Card>
            )}
          </aside>
        )}

        <div
          className={
            hasTaskSidebar
              ? "order-2 min-w-0 space-y-6 lg:order-1"
              : "space-y-6"
          }
        >
          {task.evaluation && (hasQuiz || task.evaluation.summary) && (
            <Card className="overflow-hidden border-[var(--border)] shadow-none ring-1 ring-[var(--border)]/60">
              <CardHeader className="space-y-2 border-b border-[var(--border)]/80 bg-[var(--accent-soft)]/25 pb-4">
                <CardTitle className="text-base tracking-tight">
                  {tRoad("evaluation")}
                </CardTitle>
                {hasQuiz ? (
                  <p className="text-sm font-normal leading-relaxed text-[var(--muted)]">
                    {t("selfCheckIntro")}
                  </p>
                ) : (
                  <p className="text-sm font-normal leading-relaxed text-[var(--muted)]">
                    {t("quizLegacyNoQuiz")}
                  </p>
                )}
                {task.evaluation.summary && (
                  <LearningRichText
                    className="text-sm font-medium leading-relaxed text-[var(--foreground)]"
                    content={task.evaluation.summary}
                  />
                )}
              </CardHeader>
              <CardContent className="space-y-4 pt-5">
                {hasQuiz && (
                  <>
                    {(status === "AVAILABLE" || status === "COMPLETED") && (
                      <p className="text-xs text-[var(--muted)]">
                        {t("quizAttemptsLine", {
                          submissions: submissionCount,
                          fails: failCount,
                        })}
                      </p>
                    )}
                    <div className="space-y-6">
                      {questions.map((q, qi) => {
                        const showWrongHint =
                          wrongIndicesAfterSubmit?.includes(qi) ?? false;
                        return (
                          <div key={qi} className="space-y-3">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                                {t("quizQuestion", { n: qi + 1 })}
                              </p>
                              <div className="mt-1.5 text-sm leading-snug text-[var(--foreground)]">
                                <LearningRichText content={q.question} />
                              </div>
                            </div>
                            <div className="space-y-2" role="radiogroup">
                              {q.choices.map((choice, ci) => {
                                const isCorrect = ci === q.correctIndex;
                                const selected = selections[qi] === ci;
                                const showReview =
                                  status === "COMPLETED" || quizPassed;
                                return (
                                  <label
                                    key={ci}
                                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition-colors ${
                                      showReview && isCorrect
                                        ? "border-emerald-500/50 bg-emerald-500/10"
                                        : showReview && selected && !isCorrect
                                          ? "border-rose-500/40 bg-rose-500/10"
                                          : selected
                                            ? "border-[var(--accent)]/50 bg-[var(--accent-soft)]/25"
                                            : "border-[var(--border)]/90 bg-[var(--card)] hover:border-[var(--accent)]/30"
                                    } ${status === "COMPLETED" || (quizPassed && showReview) ? "cursor-default" : ""}`}
                                  >
                                    <input
                                      type="radio"
                                      className="mt-1 size-4 shrink-0 accent-[var(--accent)]"
                                      name={`q-${task.id}-${qi}`}
                                      checked={selected}
                                      disabled={
                                        status === "COMPLETED" || quizPassed
                                      }
                                      onChange={() => {
                                        setWrongIndicesAfterSubmit(null);
                                        setSelections((prev) => {
                                          const next = [...prev];
                                          next[qi] = ci;
                                          return next;
                                        });
                                      }}
                                    />
                                    <span className="leading-snug">
                                      {choice}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                            {showWrongHint &&
                              status === "AVAILABLE" &&
                              !quizPassed && (
                                <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-800 dark:text-rose-200">
                                  {t("quizQuestionWrong", {
                                    n: qi + 1,
                                    correct: q.choices[q.correctIndex] ?? "",
                                  })}
                                </p>
                              )}
                          </div>
                        );
                      })}
                    </div>
                    {status === "AVAILABLE" && !quizPassed && (
                      <div className="space-y-2">
                        <p className="text-xs text-[var(--muted)]">
                          {t("quizSubmitHelp")}
                        </p>
                        <Button
                          type="button"
                          variant="secondary"
                          className="gap-2"
                          disabled={quizBusy}
                          onClick={() => void onQuizSubmit()}
                        >
                          {quizBusy ? (
                            <>
                              <Loader2 className="size-4 shrink-0 animate-spin" />
                              {t("quizChecking")}
                            </>
                          ) : (
                            t("quizSubmit")
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <AnimatePresence mode="wait">
            {status === "AVAILABLE" && (
              <motion.div
                key={canComplete ? "ready" : "blocked"}
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              >
                <Card
                  className={`border-2 transition-colors ${
                    canComplete
                      ? "border-[var(--accent)]/35 bg-[var(--accent-soft)]/20"
                      : "border-[var(--border)] bg-[var(--card)]"
                  }`}
                >
                  <CardContent className="space-y-4 pt-6 pb-6">
                    <p
                      className={`text-sm ${canComplete ? "text-[var(--foreground)]" : "text-[var(--muted)]"}`}
                    >
                      {completeHint}
                    </p>
                    <motion.div
                      whileHover={canComplete ? { scale: 1.02 } : undefined}
                      whileTap={canComplete ? { scale: 0.98 } : undefined}
                    >
                      <Button
                        size="lg"
                        className="w-full min-h-12 text-base font-semibold shadow-md"
                        disabled={busy || !canComplete}
                        onClick={() => void onComplete()}
                      >
                        {busy ? (
                          <Loader2 className="size-5 animate-spin" />
                        ) : (
                          t("complete")
                        )}
                      </Button>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="overflow-hidden">
            <button
              type="button"
              className={cn(
                "flex w-full items-start gap-3 border-b px-4 py-4 text-left transition-colors hover:bg-[var(--accent-soft)]/20 sm:px-6 sm:py-5",
                writingsOpen
                  ? "border-[var(--border)]/70"
                  : "border-transparent",
              )}
              aria-expanded={writingsOpen}
              onClick={() => setWritingsOpen((v) => !v)}
            >
              <ChevronDown
                className={cn(
                  "mt-0.5 size-5 shrink-0 text-[var(--muted)] transition-transform duration-200",
                  writingsOpen && "rotate-180",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="text-base leading-snug">
                  {t("writingsTitle")}
                </CardTitle>
                <p className="text-xs leading-relaxed text-[var(--muted)]">
                  {t("writingsCollapsedHint")}
                </p>
              </div>
            </button>
            <AnimatePresence initial={false}>
              {writingsOpen && (
                <motion.div
                  key="writings-panel"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <CardContent className="space-y-5 pt-0 pb-6 sm:px-6">
                    <p className="text-sm leading-relaxed text-[var(--muted)]">
                      {t("writingsIntro")}
                    </p>
                    <div
                      className="flex rounded-full border border-[var(--border)] bg-[var(--accent-soft)]/20 p-1"
                      role="tablist"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={writingTab === "note"}
                        className={cn(
                          "min-w-0 flex-1 rounded-full px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide transition-colors",
                          writingTab === "note"
                            ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]/80"
                            : "text-[var(--muted)] hover:text-[var(--foreground)]",
                        )}
                        onClick={() => setWritingTab("note")}
                      >
                        {t("writingTabNote")}
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={writingTab === "comment"}
                        className={cn(
                          "min-w-0 flex-1 rounded-full px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide transition-colors",
                          writingTab === "comment"
                            ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm ring-1 ring-[var(--border)]/80"
                            : "text-[var(--muted)] hover:text-[var(--foreground)]",
                        )}
                        onClick={() => setWritingTab("comment")}
                      >
                        {t("writingTabComment")}
                      </button>
                    </div>
                    <form
                      onSubmit={form.handleSubmit(onSaveWritings)}
                      className="space-y-5"
                    >
                      <div
                        className={cn(
                          "space-y-2",
                          writingTab !== "note" && "hidden",
                        )}
                        aria-hidden={writingTab !== "note"}
                      >
                        <label
                          className="text-sm font-semibold"
                          htmlFor="task-notes"
                        >
                          {t("notesPrivate")}
                        </label>
                        <p className="text-xs text-[var(--muted)]">
                          {t("notesPrivateHelp")}
                        </p>
                        <Textarea
                          id="task-notes"
                          placeholder={t("notesPlaceholder")}
                          rows={5}
                          {...form.register("notes")}
                        />
                      </div>
                      <div
                        className={cn(
                          "space-y-2",
                          writingTab !== "comment" && "hidden",
                        )}
                        aria-hidden={writingTab !== "comment"}
                      >
                        <label
                          className="text-sm font-semibold"
                          htmlFor="task-feed-caption"
                        >
                          {t("publicTakeawayLabel")}
                        </label>
                        <p className="text-xs text-[var(--muted)]">
                          {t("publicTakeawayHelp")}
                        </p>
                        <Textarea
                          id="task-feed-caption"
                          placeholder={t("publicTakeawayPlaceholder")}
                          rows={5}
                          {...form.register("feedCaption")}
                        />
                      </div>
                      <Button type="submit" variant="secondary">
                        {t("saveNotes")}
                      </Button>
                    </form>
                  </CardContent>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </div>
  );
}
