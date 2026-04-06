"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { LOCALE_FLAGS } from "@/components/locale-switcher";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useRouter } from "@/i18n/navigation";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DuplicateMatch } from "@/server/actions/learning-actions";
import {
  analyzeLearningInput,
  confirmAndCreateRoadmap,
  refineLearningAlignment,
  startDeeperChapterFromPriorRoadmap,
} from "@/server/actions/learning-actions";
import type {
  AlignmentClarification,
  ProposedJourney,
  RoadmapDepth,
  SourceAnalysisResult,
  SourceScale,
} from "@/types/ai";

type PendingBase = {
  sourceType: "LINK" | "PDF" | "TEXT";
  packedSourceContent: string;
  sourceFileName?: string;
  userGoal?: string;
  targetLanguage: string;
  experienceLevel?: string;
  /** Accrued scope Q&A; passed through to roadmap generation. */
  alignmentTranscript?: string;
};

type JourneyDraft = ProposedJourney & {
  enabled: boolean;
  draftKey: string;
};

const understandingShape = z.object({
  interpretedSubject: z.string(),
  intentSummary: z.string(),
  targetOutcome: z.string(),
  difficulty: z.string(),
  scopeSuggestion: z.string(),
  recommendedLanguage: z.string(),
  readingLevel: z.string(),
  roadmapDepth: z.enum(["shallow", "standard", "deep"]),
});

function toUnderstanding(d: JourneyDraft): z.infer<typeof understandingShape> {
  return {
    interpretedSubject: d.interpretedSubject,
    intentSummary: d.intentSummary,
    targetOutcome: d.targetOutcome,
    difficulty: d.difficulty,
    scopeSuggestion: d.scopeSuggestion,
    recommendedLanguage: d.recommendedLanguage,
    readingLevel: d.readingLevel,
    roadmapDepth: d.roadmapDepth,
  };
}

function readFileAsUtf8(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ""));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

const appLocales = [...routing.locales] as [string, ...string[]];

const formSchema = z
  .object({
    sourceMode: z.enum(["link", "text", "file"]),
    linkUrl: z.string().max(2048).optional(),
    linkNotes: z.string().max(120_000).optional(),
    sourceContent: z.string().max(120_000),
    userGoal: z.string().max(2000).optional(),
    targetLanguage: z.enum(appLocales),
    experienceLevel: z
      .enum(["beginner", "intermediate", "advanced"])
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sourceMode === "link") {
      const url = data.linkUrl?.trim();
      if (!url) {
        ctx.addIssue({
          code: "custom",
          message: "linkRequired",
          path: ["linkUrl"],
        });
        return;
      }
      try {
        new URL(url);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "linkInvalid",
          path: ["linkUrl"],
        });
      }
    } else if (data.sourceMode === "text") {
      if (!data.sourceContent.trim()) {
        ctx.addIssue({
          code: "custom",
          message: "contentRequired",
          path: ["sourceContent"],
        });
      }
    }
  });

type FormValues = z.infer<typeof formSchema>;

function proposalsToDrafts(proposals: ProposedJourney[]): JourneyDraft[] {
  return proposals.map((p, i) => ({
    ...p,
    enabled: true,
    draftKey: `j-${i}-${p.suggestedTitle.slice(0, 24)}`,
  }));
}

export function CreateLearningWizard() {
  const t = useTranslations("Learn");
  const tLocale = useTranslations("Locale");
  const tUnd = useTranslations("Understanding");
  const tDup = useTranslations("Duplicate");
  const router = useRouter();
  const [planOpen, setPlanOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [dupResume, setDupResume] = useState<{
    remaining: JourneyDraft[];
    base: PendingBase;
    accumulatedIds: string[];
  } | null>(null);
  const [dupDeeperOpen, setDupDeeperOpen] = useState(false);
  const [deeperParentRoadmapId, setDeeperParentRoadmapId] = useState("");
  const [deeperRoadmapDepth, setDeeperRoadmapDepth] =
    useState<RoadmapDepth>("deep");
  const [journeys, setJourneys] = useState<JourneyDraft[]>([]);
  const [splitReason, setSplitReason] = useState<string | undefined>();
  const [pendingBase, setPendingBase] = useState<PendingBase | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [sourceScale, setSourceScale] = useState<SourceScale | undefined>();
  const [scopeClarification, setScopeClarification] =
    useState<AlignmentClarification | null>(null);
  const [scopeStepActive, setScopeStepActive] = useState(false);
  const [scopeAnswers, setScopeAnswers] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sourceMode: "text",
      linkUrl: "",
      linkNotes: "",
      sourceContent: "",
      userGoal: "",
      targetLanguage: "en",
      experienceLevel: "intermediate",
    },
  });

  const sourceMode = form.watch("sourceMode");

  const updateJourney = useCallback(
    (index: number, patch: Partial<JourneyDraft>) => {
      setJourneys((prev) =>
        prev.map((j, i) => (i === index ? { ...j, ...patch } : j)),
      );
    },
    [],
  );

  const openPlanFromAnalysis = useCallback(
    (
      packedSourceContent: string,
      meta: {
        sourceType: PendingBase["sourceType"];
        sourceFileName?: string;
        userGoal?: string;
        targetLanguage: string;
        experienceLevel?: string;
      },
      data: SourceAnalysisResult,
    ) => {
      setPendingBase({
        ...meta,
        packedSourceContent,
        alignmentTranscript: "",
      });
      setSplitReason(data.splitReason);
      setSourceScale(data.sourceScale);
      setJourneys(proposalsToDrafts(data.proposals));
      const clar = data.clarification;
      const needsScope = Boolean(clar?.questions?.length);
      setScopeClarification(needsScope ? clar! : null);
      setScopeStepActive(needsScope);
      setScopeAnswers("");
      setPlanOpen(true);
    },
    [],
  );

  const finishSuccess = useCallback(
    (ids: string[]) => {
      toast.success(t("success"));
      setPlanOpen(false);
      setDupResume(null);
      setPendingBase(null);
      setJourneys([]);
      setSplitReason(undefined);
      setSourceScale(undefined);
      setScopeClarification(null);
      setScopeStepActive(false);
      setScopeAnswers("");
      if (ids.length === 1) {
        router.push(`/roadmap/${ids[0]}`);
      } else {
        router.push("/dashboard");
      }
    },
    [router, t],
  );

  const runCreates = useCallback(
    async (
      active: JourneyDraft[],
      base: PendingBase,
      opts: { forceNew: boolean; accumulatedIds: string[] },
    ) => {
      let forceNew = opts.forceNew;
      const ids = [...opts.accumulatedIds];
      for (const d of active) {
        if (!d.enabled) continue;
        const parsed = understandingShape.safeParse(toUnderstanding(d));
        if (!parsed.success) {
          toast.error(t("errors.invalidJourney"));
          return;
        }
        const res = await confirmAndCreateRoadmap({
          topicTitle: d.suggestedTitle.trim() || d.interpretedSubject,
          sourceType: base.sourceType,
          sourceContent: base.packedSourceContent,
          sourceFileName: base.sourceFileName,
          userGoal: base.userGoal,
          alignmentTranscript: base.alignmentTranscript?.trim() || undefined,
          understanding: parsed.data,
          forceNew,
        });
        if (!res.ok) {
          if (res.error === "DUPLICATE" && res.duplicates?.length) {
            const idx = active.indexOf(d);
            const rest = active.slice(idx);
            setDuplicates(res.duplicates);
            setDupResume({ remaining: rest, base, accumulatedIds: ids });
            setDupOpen(true);
            return;
          }
          if (res.error === "INSUFFICIENT_COINS") {
            toast.error(t("errors.insufficientCoins"));
            return;
          }
          toast.error(res.error);
          return;
        }
        ids.push(res.roadmapId);
        forceNew = false;
      }
      finishSuccess(ids);
    },
    [finishSuccess, t],
  );

  async function onAnalyze(values: FormValues) {
    setSubmitting(true);
    try {
      let packedSourceContent = "";
      let sourceType: "LINK" | "PDF" | "TEXT" = "TEXT";
      let sourceFileName: string | undefined;
      const userGoal = values.userGoal?.trim() || undefined;

      if (values.sourceMode === "link") {
        const res = await analyzeLearningInput({
          sourceType: "LINK",
          linkUrl: values.linkUrl!.trim(),
          sourceContent: values.linkNotes?.trim() ?? "",
          sourceFileName: undefined,
          userGoal,
          targetLanguage: values.targetLanguage,
          experienceLevel: values.experienceLevel,
        });
        if (!res.ok) {
          toast.error(mapAnalyzeError(res.error, t));
          return;
        }
        openPlanFromAnalysis(
          res.packedSourceContent,
          {
            sourceType: "LINK",
            userGoal,
            targetLanguage: values.targetLanguage,
            experienceLevel: values.experienceLevel,
          },
          res.data,
        );
        return;
      }

      if (values.sourceMode === "text") {
        const res = await analyzeLearningInput({
          sourceType: "TEXT",
          sourceContent: values.sourceContent.trim(),
          userGoal,
          targetLanguage: values.targetLanguage,
          experienceLevel: values.experienceLevel,
        });
        if (!res.ok) {
          toast.error(mapAnalyzeError(res.error, t));
          return;
        }
        openPlanFromAnalysis(
          res.packedSourceContent,
          {
            sourceType: "TEXT",
            userGoal,
            targetLanguage: values.targetLanguage,
            experienceLevel: values.experienceLevel,
          },
          res.data,
        );
        return;
      }

      const file = selectedFile;
      sourceFileName = file?.name;
      let body = values.sourceContent.trim();

      if (!file && !body) {
        toast.error(t("errors.fileOrTextRequired"));
        return;
      }

      if (!file) {
        const resText = await analyzeLearningInput({
          sourceType: "TEXT",
          sourceContent: body,
          userGoal,
          targetLanguage: values.targetLanguage,
          experienceLevel: values.experienceLevel,
        });
        if (!resText.ok) {
          toast.error(mapAnalyzeError(resText.error, t));
          return;
        }
        openPlanFromAnalysis(
          resText.packedSourceContent,
          {
            sourceType: "TEXT",
            userGoal,
            targetLanguage: values.targetLanguage,
            experienceLevel: values.experienceLevel,
          },
          resText.data,
        );
        return;
      }

      const lower = file.name.toLowerCase();
      if (lower.endsWith(".pdf")) {
        sourceType = "PDF";
        if (!body) {
          toast.error(t("errors.pdfNeedsExcerpt"));
          return;
        }
      } else if (lower.endsWith(".txt") || lower.endsWith(".md")) {
        try {
          const fileText = await readFileAsUtf8(file);
          body = fileText + (body ? `\n\n${body}` : "");
        } catch {
          toast.error(t("errors.fileRead"));
          return;
        }
        sourceType = "TEXT";
      } else {
        toast.error(t("errors.unsupportedFile"));
        return;
      }

      const res = await analyzeLearningInput({
        sourceType,
        sourceContent: body,
        sourceFileName,
        userGoal,
        targetLanguage: values.targetLanguage,
        experienceLevel: values.experienceLevel,
      });
      if (!res.ok) {
        toast.error(mapAnalyzeError(res.error, t));
        return;
      }
      openPlanFromAnalysis(
        res.packedSourceContent,
        {
          sourceType,
          sourceFileName,
          userGoal,
          targetLanguage: values.targetLanguage,
          experienceLevel: values.experienceLevel,
        },
        res.data,
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function onSubmitScopeAnswers() {
    if (!pendingBase || !scopeClarification?.questions.length) return;
    const trimmed = scopeAnswers.trim();
    if (!trimmed) {
      toast.error(t("scopeAnswersRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const r = await refineLearningAlignment({
        packedSourceContent: pendingBase.packedSourceContent,
        sourceType: pendingBase.sourceType,
        userGoal: pendingBase.userGoal,
        targetLanguage: pendingBase.targetLanguage,
        experienceLevel: pendingBase.experienceLevel,
        alignmentTranscript: pendingBase.alignmentTranscript ?? "",
        lastQuestions: scopeClarification.questions,
        userAnswers: trimmed,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setPendingBase((b) =>
        b ? { ...b, alignmentTranscript: r.alignmentTranscript } : b,
      );
      setSplitReason(r.data.splitReason);
      setSourceScale(r.data.sourceScale);
      setJourneys(proposalsToDrafts(r.data.proposals));
      const nextClar = r.data.clarification;
      const stillNeeds = Boolean(nextClar?.questions?.length);
      setScopeClarification(stillNeeds ? nextClar! : null);
      setScopeStepActive(stillNeeds);
      setScopeAnswers("");
      if (!stillNeeds) {
        toast.success(t("scopeAligned"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function onSkipScope() {
    setScopeStepActive(false);
    setScopeClarification(null);
    setScopeAnswers("");
  }

  async function onConfirmGenerate() {
    if (!pendingBase) return;
    const active = journeys.filter((j) => j.enabled);
    if (active.length === 0) {
      toast.error(t("selectAtLeastOne"));
      return;
    }
    setSubmitting(true);
    try {
      await runCreates(active, pendingBase, {
        forceNew: false,
        accumulatedIds: [],
      });
    } finally {
      setSubmitting(false);
    }
  }

  function onDupCreateNew() {
    if (!dupResume) return;
    setDupOpen(false);
    const { remaining, base, accumulatedIds } = dupResume;
    setSubmitting(true);
    void (async () => {
      try {
        await runCreates(remaining, base, {
          forceNew: true,
          accumulatedIds,
        });
      } finally {
        setSubmitting(false);
      }
    })();
  }

  function openDeeperChapterFlow() {
    const eligible = duplicates.filter(
      (d) => d.roadmapId && d.completedLessons > 0,
    );
    if (!eligible.length) {
      toast.error(tDup("deeperNeedProgress"));
      return;
    }
    const nextId =
      eligible.find((e) => e.roadmapId === deeperParentRoadmapId)?.roadmapId ??
      eligible[0]!.roadmapId!;
    setDeeperParentRoadmapId(nextId);
    setDeeperRoadmapDepth("deep");
    setDupDeeperOpen(true);
  }

  async function onSubmitDeeperChapter() {
    if (!dupResume || !deeperParentRoadmapId) return;
    const blocked = dupResume.remaining[0];
    if (!blocked) return;
    const parentMeta = duplicates.find(
      (d) => d.roadmapId === deeperParentRoadmapId,
    );
    if (!parentMeta?.roadmapId || parentMeta.completedLessons < 1) {
      toast.error(tDup("deeperNeedProgress"));
      return;
    }

    const nextFocus =
      blocked.suggestedTitle.trim() || blocked.interpretedSubject.trim();
    const buildsOn = tDup("buildsOnTemplate", {
      done: parentMeta.completedLessons,
      total: parentMeta.totalLessons,
      title: parentMeta.title,
    });
    const rationaleParts = [
      blocked.targetOutcome.trim(),
      dupResume.base.userGoal?.trim(),
    ].filter(Boolean);
    const rationale =
      rationaleParts.join(" — ") || tDup("deeperRationaleDefault");

    setSubmitting(true);
    try {
      const res = await startDeeperChapterFromPriorRoadmap({
        parentRoadmapId: deeperParentRoadmapId,
        nextFocus,
        buildsOn,
        rationale,
        roadmapDepth: deeperRoadmapDepth,
        additionalSource: dupResume.base.packedSourceContent,
      });
      if (!res.ok) {
        if (res.error === "INSUFFICIENT_COINS") {
          toast.error(t("errors.insufficientCoins"));
          return;
        }
        if (res.error === "NO_COMPLETED_LESSONS_ON_PRIOR") {
          toast.error(tDup("deeperNeedProgress"));
          return;
        }
        if (res.error === "CONTINUATION_ALREADY_FINISHED" && res.roadmapId) {
          toast.info(tDup("deeperAlreadyFinished"));
          setDupDeeperOpen(false);
          setDupOpen(false);
          setDupResume(null);
          router.push(`/roadmap/${res.roadmapId}`);
          return;
        }
        toast.error(res.error);
        return;
      }
      toast.success(res.reused ? tDup("deeperReused") : tDup("deeperStarted"));
      setDupDeeperOpen(false);
      setDupOpen(false);
      setDupResume(null);
      router.push(`/roadmap/${res.roadmapId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Card className="max-w-2xl border-[var(--border)]">
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("subtitleNoTitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(onAnalyze)}
            className="flex flex-col gap-5"
          >
            <div className="space-y-2">
              <Label>{t("sourceMode")}</Label>
              <Select
                value={sourceMode}
                onValueChange={(v) =>
                  form.setValue("sourceMode", v as FormValues["sourceMode"])
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">{t("sourceModeLink")}</SelectItem>
                  <SelectItem value="text">{t("sourceModeText")}</SelectItem>
                  <SelectItem value="file">{t("sourceModeFile")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sourceMode === "link" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="linkUrl">{t("linkUrl")}</Label>
                  <Input
                    id="linkUrl"
                    type="url"
                    placeholder="https://…"
                    {...form.register("linkUrl")}
                  />
                  {form.formState.errors.linkUrl && (
                    <p className="text-xs text-red-500">
                      {t(
                        `errors.${form.formState.errors.linkUrl.message}` as Parameters<
                          typeof t
                        >[0],
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkNotes">{t("linkNotes")}</Label>
                  <Textarea
                    id="linkNotes"
                    rows={5}
                    {...form.register("linkNotes")}
                  />
                  <p className="text-xs text-[var(--muted)]">
                    {t("linkNotesHint")}
                  </p>
                </div>
              </>
            )}

            {sourceMode === "text" && (
              <div className="space-y-2">
                <Label htmlFor="sourceContent">{t("textBody")}</Label>
                <Textarea
                  id="sourceContent"
                  rows={10}
                  {...form.register("sourceContent")}
                />
                <p className="text-xs text-[var(--muted)]">
                  {t("textBodyHint")}
                </p>
                {form.formState.errors.sourceContent && (
                  <p className="text-xs text-red-500">
                    {t(
                      `errors.${form.formState.errors.sourceContent.message}` as Parameters<
                        typeof t
                      >[0],
                    )}
                  </p>
                )}
              </div>
            )}

            {sourceMode === "file" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fileInput">{t("fileUpload")}</Label>
                  <Input
                    id="fileInput"
                    type="file"
                    accept=".pdf,.txt,.md,text/plain,text/markdown,application/pdf"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      setSelectedFile(f);
                    }}
                  />
                  <p className="text-xs text-[var(--muted)]">
                    {t("fileTypesHint")}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sourceContent">{t("fileExtraNotes")}</Label>
                  <Textarea
                    id="sourceContent"
                    rows={6}
                    {...form.register("sourceContent")}
                    placeholder={t("fileExtraPlaceholder")}
                  />
                  {form.formState.errors.sourceContent && (
                    <p className="text-xs text-red-500">
                      {t(
                        `errors.${form.formState.errors.sourceContent.message}` as Parameters<
                          typeof t
                        >[0],
                      )}
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>{t("fields.language")}</Label>
                <Select
                  value={form.watch("targetLanguage")}
                  onValueChange={(v) =>
                    form.setValue(
                      "targetLanguage",
                      v as FormValues["targetLanguage"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {routing.locales.map((loc) => (
                      <SelectItem
                        key={loc}
                        value={loc}
                        textValue={tLocale(`${loc}Name`)}
                      >
                        <span className="whitespace-nowrap">
                          <span
                            aria-hidden
                            className="mr-1.5 text-base leading-none"
                          >
                            {LOCALE_FLAGS[loc] ?? loc.toUpperCase()}
                          </span>
                          {tLocale(`${loc}Name`)}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("fields.level")}</Label>
                <Select
                  value={form.watch("experienceLevel") ?? "intermediate"}
                  onValueChange={(v) =>
                    form.setValue(
                      "experienceLevel",
                      v as FormValues["experienceLevel"],
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">
                      {t("levels.beginner")}
                    </SelectItem>
                    <SelectItem value="intermediate">
                      {t("levels.intermediate")}
                    </SelectItem>
                    <SelectItem value="advanced">
                      {t("levels.advanced")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userGoal">{t("fields.goal")}</Label>
              <Textarea id="userGoal" rows={3} {...form.register("userGoal")} />
              <p className="text-xs text-[var(--muted)]">
                {t("fields.goalHint")}
              </p>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? (
                <>
                  <Loader2 className="animate-spin" />
                  {t("analyzing")}
                </>
              ) : (
                t("analyze")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Dialog
        open={planOpen}
        onOpenChange={(open) => {
          setPlanOpen(open);
          if (!open) {
            setDupResume(null);
            setSourceScale(undefined);
            setScopeClarification(null);
            setScopeStepActive(false);
            setScopeAnswers("");
          }
        }}
      >
        <DialogContent className="flex h-[min(82vh,640px)] max-h-[85vh] w-[calc(100%-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="shrink-0 space-y-1 border-b border-[var(--border)]/80 px-4 py-3 pr-12 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {scopeStepActive ? t("scopeTitle") : t("proposalsTitle")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug">
              {scopeStepActive
                ? t("scopeDescription")
                : t("proposalsDescription")}
            </DialogDescription>
            {sourceScale ? (
              <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
                {t("sourceScaleLabel")}: {t(`sourceScale.${sourceScale}`)}
              </p>
            ) : null}
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
            <div className="space-y-3 px-4 py-3">
              {splitReason ? (
                <div className="rounded-lg border border-[var(--accent)]/20 bg-[var(--accent-soft)]/45 px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap text-[var(--foreground)] dark:border-[var(--accent)]/25">
                  {splitReason}
                </div>
              ) : null}

              {scopeStepActive && scopeClarification ? (
                <div className="space-y-4 rounded-xl border border-[var(--border)]/80 bg-[var(--card)] p-4">
                  <p className="text-sm leading-relaxed text-[var(--foreground)]">
                    {scopeClarification.preamble}
                  </p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[var(--muted)]">
                      {t("scopeQuestionsLabel")}
                    </p>
                    <ol className="list-inside list-decimal space-y-1.5 text-sm leading-snug text-[var(--foreground)]">
                      {scopeClarification.questions.map((q, idx) => (
                        <li key={`${idx}-${q.slice(0, 24)}`}>{q}</li>
                      ))}
                    </ol>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scopeAnswers" className="text-xs">
                      {t("scopeYourAnswers")}
                    </Label>
                    <Textarea
                      id="scopeAnswers"
                      rows={8}
                      value={scopeAnswers}
                      onChange={(e) => setScopeAnswers(e.target.value)}
                      placeholder={t("scopeAnswersPlaceholder")}
                      className="resize-y text-sm"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={submitting}
                      onClick={onSkipScope}
                    >
                      {t("scopeSkip")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting}
                      onClick={() => void onSubmitScopeAnswers()}
                    >
                      {submitting ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        t("scopeSubmit")
                      )}
                    </Button>
                  </div>
                </div>
              ) : null}

              <div
                className={`flex flex-col gap-3 ${scopeStepActive ? "hidden" : ""}`}
              >
                {journeys.map((j, i) => (
                  <div
                    key={j.draftKey}
                    className="rounded-xl border border-[var(--border)]/80 bg-[var(--card)] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset]"
                  >
                    <div className="flex gap-3">
                      <input
                        type="checkbox"
                        aria-label={t("journeyInclude")}
                        className="mt-1.5 size-4 shrink-0 cursor-pointer rounded-md border-[var(--border)] bg-[var(--background)] accent-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] dark:bg-[var(--card)]"
                        checked={j.enabled}
                        onChange={(e) =>
                          updateJourney(i, { enabled: e.target.checked })
                        }
                      />
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="space-y-1">
                          <Label
                            htmlFor={`title-${i}`}
                            className="text-xs text-[var(--muted)]"
                          >
                            {t("journeyTitle")}
                          </Label>
                          <Input
                            id={`title-${i}`}
                            className="h-8 text-xs"
                            value={j.suggestedTitle}
                            onChange={(e) =>
                              updateJourney(i, {
                                suggestedTitle: e.target.value,
                              })
                            }
                          />
                        </div>
                        <p className="line-clamp-2 text-xs leading-snug text-[var(--muted)]">
                          <span className="font-medium text-[var(--foreground)]/80">
                            {t("journeyFocus")}{" "}
                          </span>
                          {j.sourceFocus}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 grid gap-2 border-t border-dashed border-[var(--border)]/70 pt-2.5 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2">
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">{tUnd("subject")}</Label>
                        <Input
                          className="h-8 text-xs"
                          value={j.interpretedSubject}
                          onChange={(e) =>
                            updateJourney(i, {
                              interpretedSubject: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">{tUnd("goal")}</Label>
                        <Textarea
                          rows={2}
                          className="min-h-[4.25rem] resize-y py-1.5 text-xs leading-snug"
                          value={j.targetOutcome}
                          onChange={(e) =>
                            updateJourney(i, { targetOutcome: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{tUnd("difficulty")}</Label>
                        <Input
                          className="h-8 text-xs"
                          value={j.difficulty}
                          onChange={(e) =>
                            updateJourney(i, { difficulty: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{tUnd("depth")}</Label>
                        <Select
                          value={j.roadmapDepth}
                          onValueChange={(v) =>
                            updateJourney(i, {
                              roadmapDepth: v as JourneyDraft["roadmapDepth"],
                            })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shallow">
                              {tUnd("depthShallow")}
                            </SelectItem>
                            <SelectItem value="standard">
                              {tUnd("depthStandard")}
                            </SelectItem>
                            <SelectItem value="deep">
                              {tUnd("depthDeep")}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs">{tUnd("scope")}</Label>
                        <Textarea
                          rows={2}
                          className="min-h-[4.25rem] resize-y py-1.5 text-xs leading-snug"
                          value={j.scopeSuggestion}
                          onChange={(e) =>
                            updateJourney(i, {
                              scopeSuggestion: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{tUnd("language")}</Label>
                        <Input
                          className="h-8 text-xs"
                          value={j.recommendedLanguage}
                          onChange={(e) =>
                            updateJourney(i, {
                              recommendedLanguage: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">
                          {tUnd("readingLevel")}
                        </Label>
                        <Input
                          className="h-8 text-xs"
                          value={j.readingLevel}
                          onChange={(e) =>
                            updateJourney(i, { readingLevel: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1 sm:col-span-2">
                        <Label className="text-xs text-[var(--muted)]">
                          {tUnd("intentRef")}
                        </Label>
                        <Textarea
                          rows={2}
                          className="min-h-[4.25rem] resize-y py-1.5 text-xs leading-snug text-[var(--muted)]"
                          value={j.intentSummary}
                          onChange={(e) =>
                            updateJourney(i, {
                              intentSummary: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-[var(--border)]/80 bg-[var(--card)] px-4 py-2.5">
            <Button
              variant="secondary"
              type="button"
              size="sm"
              onClick={() => setPlanOpen(false)}
            >
              {tUnd("cancel")}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={submitting || scopeStepActive}
              title={scopeStepActive ? t("scopeFinishFirstHint") : undefined}
              onClick={() => void onConfirmGenerate()}
            >
              {submitting ? (
                <Loader2 className="animate-spin" />
              ) : (
                t("generateRoadmaps")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={dupOpen}
        onOpenChange={(open) => {
          setDupOpen(open);
          if (!open) {
            setDupResume(null);
            setDupDeeperOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-md gap-3 p-4 sm:p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {tDup("title")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug">
              {tDup("body")}
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-[13px]">
            {duplicates.map((d) => (
              <li
                key={d.intentId}
                className="rounded-md border border-[var(--border)]/80 px-2.5 py-2"
              >
                <div className="font-medium text-[var(--foreground)]">
                  {d.title}
                </div>
                <div className="mt-1 text-[var(--muted)]">
                  {d.roadmapId ? (
                    <>
                      {tDup("progressLine", {
                        done: d.completedLessons,
                        total: d.totalLessons,
                      })}
                      {" · "}
                      <Link
                        className="text-[var(--accent)] underline"
                        href={`/roadmap/${d.roadmapId}`}
                      >
                        {tDup("continue")}
                      </Link>
                    </>
                  ) : (
                    tDup("noRoadmapYet")
                  )}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDupOpen(false)}
            >
              {tUnd("cancel")}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={
                submitting ||
                !duplicates.some((d) => d.roadmapId && d.completedLessons > 0)
              }
              title={
                duplicates.some((d) => d.roadmapId && d.completedLessons > 0)
                  ? undefined
                  : tDup("deeperNeedProgress")
              }
              onClick={openDeeperChapterFlow}
            >
              {tDup("deeperShort")}
            </Button>
            <Button size="sm" disabled={submitting} onClick={onDupCreateNew}>
              {tDup("createNew")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dupDeeperOpen} onOpenChange={setDupDeeperOpen}>
        <DialogContent className="max-w-md gap-3 p-4 sm:p-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {tDup("deeperTitle")}
            </DialogTitle>
            <DialogDescription className="text-[13px] leading-snug">
              {tDup("deeperBody")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">{tDup("deeperPriorJourney")}</Label>
              <Select
                value={deeperParentRoadmapId}
                onValueChange={setDeeperParentRoadmapId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={tDup("deeperPriorPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {duplicates
                    .filter((d) => d.roadmapId && d.completedLessons > 0)
                    .map((d) => (
                      <SelectItem key={d.roadmapId!} value={d.roadmapId!}>
                        {d.title} ({d.completedLessons}/{d.totalLessons})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">{tDup("deeperDepth")}</Label>
              <Select
                value={deeperRoadmapDepth}
                onValueChange={(v) => setDeeperRoadmapDepth(v as RoadmapDepth)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="shallow">
                    {tUnd("depthShallow")}
                  </SelectItem>
                  <SelectItem value="standard">
                    {tUnd("depthStandard")}
                  </SelectItem>
                  <SelectItem value="deep">{tUnd("depthDeep")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDupDeeperOpen(false)}
            >
              {tUnd("cancel")}
            </Button>
            <Button
              size="sm"
              disabled={submitting || !deeperParentRoadmapId}
              onClick={() => void onSubmitDeeperChapter()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                tDup("deeperStart")
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function mapAnalyzeError(err: string, t: (key: string) => string): string {
  if (err.includes("LINK_URL_REQUIRED")) return t("errors.linkRequired");
  if (err.includes("LINK_URL_INVALID")) return t("errors.linkInvalid");
  if (err.includes("CONTENT_REQUIRED")) return t("errors.contentRequired");
  return err;
}
