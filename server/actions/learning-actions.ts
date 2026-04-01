"use server";

import { revalidatePath } from "next/cache";
import { SourceType } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import {
  analyzeSource,
  answerTaskCoach,
  generateContinuationSuggestions,
  generateRoadmap,
} from "@/server/ai/ai-service";
import { continuationSuggestionsSchema } from "@/server/ai/llm";
import { getOrCreateAppUser, requireAuthUserId } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { gradeQuiz, parseTaskQuizQuestions } from "@/lib/task-quiz";
import { normalizeTopic, topicsLikelyDuplicate } from "@/lib/normalize-topic";
import {
  buildLinkSourceAppendix,
  truncatePackedSource,
} from "@/lib/link-source-enrichment";
import {
  clusterAchievementSlug,
  countCompletedTasksPerCategory,
} from "@/lib/cluster-achievements";
import {
  collectMilestoneKeysFromGenerated,
  ensureClusterMilestoneAchievements,
  ensureSkillMilestoneAchievements,
} from "@/lib/ensure-milestone-achievements";
import {
  countCompletedTasksPerSkillKey,
  skillAchievementSlug,
} from "@/lib/skill-achievements";
import { continuationRowSignature } from "@/lib/continuation-signature";
import { countRoadmapTasks } from "@/lib/journey-stats";
import {
  inferTopicCluster,
  normalizeClusterKey,
  TOPIC_CLUSTER_KEYS,
} from "@/lib/topic-cluster";
import type {
  ContinuationStartedStatus,
  ContinuationSuggestionRow,
  ContinuationSuggestionRowWithSig,
  RoadmapGenerationInput,
  SourceAnalysisResult,
  SourceType as AISource,
} from "@/types/ai";
import {
  COIN_EXCELLENCE_BONUS,
  COIN_JOURNEY_COMPLETE,
  COIN_REFLECTION_BONUS,
  COIN_START_JOURNEY_FREE,
  COIN_TASK_AI_MESSAGE,
  COIN_TOPIC_COMPLETE,
  REFLECTION_MIN_CHARS,
  coinsForSingleTaskPhaseComplete,
  skipsCoinEconomy,
} from "@/lib/coin-economy";
import { routing } from "@/i18n/routing";

const analyzeSchema = z
  .object({
    sourceType: z.enum(["LINK", "PDF", "TEXT"]),
    linkUrl: z.string().max(2048).optional(),
    sourceContent: z.string().max(120_000),
    sourceFileName: z.string().max(500).optional(),
    userGoal: z.string().max(2000).optional(),
    targetLanguage: z.string().min(2).max(12),
    experienceLevel: z.string().max(80).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.sourceType === "LINK") {
      const url = data.linkUrl?.trim();
      if (!url) {
        ctx.addIssue({
          code: "custom",
          message: "LINK_URL_REQUIRED",
          path: ["linkUrl"],
        });
        return;
      }
      try {
        new URL(url);
      } catch {
        ctx.addIssue({
          code: "custom",
          message: "LINK_URL_INVALID",
          path: ["linkUrl"],
        });
      }
    } else if (!data.sourceContent.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "CONTENT_REQUIRED",
        path: ["sourceContent"],
      });
    }
  });

function packedContentForAnalysis(
  input: z.infer<typeof analyzeSchema>,
): string {
  if (input.sourceType === "LINK") {
    const url = input.linkUrl!.trim();
    const notes = input.sourceContent.trim();
    const label = input.sourceFileName
      ? `\n\nLabel / filename: ${input.sourceFileName}`
      : "";
    return notes
      ? `Primary link: ${url}${label}\n\nNotes / pasted excerpts:\n${notes}`
      : `Primary link: ${url}${label}`;
  }
  const fileNote = input.sourceFileName
    ? `[Uploaded file name: ${input.sourceFileName}]\n\n`
    : "";
  return fileNote + input.sourceContent.trim();
}

async function buildPackedSourceContent(
  input: z.infer<typeof analyzeSchema>,
): Promise<string> {
  const base = packedContentForAnalysis(input);
  if (input.sourceType !== "LINK") {
    return truncatePackedSource(base);
  }
  const appendix = await buildLinkSourceAppendix(input.linkUrl!.trim());
  return truncatePackedSource(base + appendix);
}

const confirmSchema = z.object({
  topicTitle: z.string().min(1).max(200),
  sourceType: z.enum(["LINK", "PDF", "TEXT"]),
  sourceContent: z.string().min(1).max(120_000),
  sourceFileName: z.string().max(500).optional(),
  userGoal: z.string().max(2000).optional(),
  /** Appended to source for roadmap generation when the learner completed scope Q&A. */
  alignmentTranscript: z.string().max(60_000).optional(),
  understanding: z.object({
    interpretedSubject: z.string(),
    intentSummary: z.string(),
    targetOutcome: z.string(),
    difficulty: z.string(),
    scopeSuggestion: z.string(),
    recommendedLanguage: z.string(),
    readingLevel: z.string(),
    roadmapDepth: z.enum(["shallow", "standard", "deep"]),
  }),
  forceNew: z.boolean().optional(),
});

export type DuplicateMatch = {
  intentId: string;
  roadmapId: string | null;
  title: string;
  createdAt: Date;
};

export async function analyzeLearningInput(
  raw: z.infer<typeof analyzeSchema>,
): Promise<
  | { ok: true; data: SourceAnalysisResult; packedSourceContent: string }
  | { ok: false; error: string }
> {
  try {
    await requireAuthUserId();
    const input = analyzeSchema.parse(raw);
    const packedSourceContent = await buildPackedSourceContent(input);
    const data = await analyzeSource({
      sourceType: input.sourceType as AISource,
      sourceContent: packedSourceContent,
      userGoal: input.userGoal,
      targetLanguage: input.targetLanguage,
      experienceLevel: input.experienceLevel,
    });
    return { ok: true, data, packedSourceContent };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return {
        ok: false,
        error: e.issues.map((i) => i.message).join(", "),
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Analysis failed.",
    };
  }
}

const refineAlignmentSchema = z.object({
  packedSourceContent: z.string().min(1).max(120_000),
  sourceType: z.enum(["LINK", "PDF", "TEXT"]),
  userGoal: z.string().max(2000).optional(),
  targetLanguage: z.string().min(2).max(12),
  experienceLevel: z.string().max(80).optional(),
  alignmentTranscript: z.string().max(60_000),
  lastQuestions: z.array(z.string()).max(12),
  userAnswers: z.string().min(1).max(16_000),
});

/**
 * Multi-turn scope alignment: appends Q&A to the transcript and re-runs analysis.
 * The model returns updated proposals and may issue further clarification questions.
 */
export async function refineLearningAlignment(
  raw: z.infer<typeof refineAlignmentSchema>,
): Promise<
  | {
      ok: true;
      data: SourceAnalysisResult;
      alignmentTranscript: string;
    }
  | { ok: false; error: string }
> {
  try {
    await requireAuthUserId();
    const input = refineAlignmentSchema.parse(raw);
    const qaBlock = [
      input.lastQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n"),
      "",
      input.userAnswers.trim(),
    ].join("\n");
    const alignmentTranscript = [
      input.alignmentTranscript.trim(),
      "",
      "### Alignment round",
      qaBlock,
    ]
      .filter((s) => s.length > 0)
      .join("\n\n");

    const data = await analyzeSource({
      sourceType: input.sourceType as AISource,
      sourceContent: input.packedSourceContent,
      userGoal: input.userGoal,
      targetLanguage: input.targetLanguage,
      experienceLevel: input.experienceLevel,
      alignmentTranscript,
    });
    return { ok: true, data, alignmentTranscript };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return {
        ok: false,
        error: e.issues.map((i) => i.message).join(", "),
      };
    }
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not refine scope.",
    };
  }
}

async function findDuplicateIntentions(
  userId: string,
  subject: string,
): Promise<DuplicateMatch[]> {
  const intents = await prisma.learningIntent.findMany({
    where: { userId },
    include: { roadmap: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
    take: 40,
  });
  return intents
    .filter((i) => topicsLikelyDuplicate(subject, i.topicTitle))
    .map((i) => ({
      intentId: i.id,
      roadmapId: i.roadmap?.id ?? null,
      title: i.topicTitle,
      createdAt: i.createdAt,
    }));
}

export async function checkDuplicateSubject(
  subject: string,
): Promise<DuplicateMatch[]> {
  const user = await getOrCreateAppUser();
  return findDuplicateIntentions(user.id, subject);
}

export async function confirmAndCreateRoadmap(
  raw: z.infer<typeof confirmSchema>,
): Promise<
  | { ok: true; roadmapId: string; duplicates?: DuplicateMatch[] }
  | { ok: false; error: string; duplicates?: DuplicateMatch[] }
> {
  try {
    const user = await getOrCreateAppUser();
    const input = confirmSchema.parse(raw);
    const subject = input.understanding.interpretedSubject || input.topicTitle;
    const duplicates = await findDuplicateIntentions(user.id, subject);
    if (duplicates.length && !input.forceNew) {
      return { ok: false, error: "DUPLICATE", duplicates };
    }

    const topicNorm = normalizeTopic(input.topicTitle);
    const alignedNotes = input.alignmentTranscript?.trim();
    const genInput: RoadmapGenerationInput = {
      ...input.understanding,
      topicTitle: input.topicTitle,
      sourceType: input.sourceType as AISource,
      sourceContent:
        alignedNotes ?
          `${input.sourceContent}\n\n--- Scope alignment (learner Q&A) ---\n${alignedNotes}`
        : input.sourceContent,
      userGoal: input.userGoal,
    };
    const generated = await generateRoadmap(genInput);

    const topicClusterKey = inferTopicCluster(
      input.understanding.interpretedSubject,
      input.topicTitle,
    );

    const roadmapId = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: user.id },
        select: { id: true, coins: true, plan: true },
      });
      if (!u) throw new Error("NO_USER");
      if (u.plan === "FREE" && u.coins < COIN_START_JOURNEY_FREE) {
      throw new Error("INSUFFICIENT_COINS");
      }
      if (u.plan === "FREE") {
        await tx.user.update({
          where: { id: u.id },
          data: { coins: { decrement: COIN_START_JOURNEY_FREE } },
        });
      }

      const intent = await tx.learningIntent.create({
        data: {
          userId: user.id,
          topicTitle: input.topicTitle,
          topicNormalized: topicNorm,
          topicClusterKey,
          userGoal: input.userGoal,
          sourceType: input.sourceType as SourceType,
          sourceContent: input.sourceContent,
          sourceFileName: input.sourceFileName,
          targetLanguage: input.understanding.recommendedLanguage,
          experienceLevel: input.understanding.readingLevel,
        },
      });

      const roadmap = await tx.roadmap.create({
        data: {
          userId: user.id,
          learningIntentId: intent.id,
          title: generated.title,
          description: generated.description,
          goal: generated.goal,
          estDurationLabel: generated.estDurationLabel,
          language: generated.language,
          status: "ACTIVE",
        },
      });

      const flatTaskIds: string[] = [];

      for (let pi = 0; pi < generated.phases.length; pi++) {
        const ph = generated.phases[pi];
        const phase = await tx.roadmapPhase.create({
          data: {
            roadmapId: roadmap.id,
            title: ph.title,
            summary: ph.summary,
            order: pi,
          },
        });
        for (let ti = 0; ti < ph.tasks.length; ti++) {
          const t = ph.tasks[ti];
          const task = await tx.roadmapTask.create({
            data: {
              phaseId: phase.id,
              title: t.title,
              explanation: t.explanation,
              whyMatters: t.whyMatters,
              mentorPerspective: t.mentorPerspective,
              instructions: t.instructions,
              lessonCategory: t.lessonCategory,
              achievementKeys: t.achievementKeys,
              order: ti,
              xpReward: t.xpReward,
              estimatedMinutes: t.estimatedMinutes,
            },
          });
          flatTaskIds.push(task.id);
          for (let ri = 0; ri < t.resources.length; ri++) {
            const r = t.resources[ri];
            await tx.taskResource.create({
              data: {
                taskId: task.id,
                title: r.title,
                url: r.url ?? null,
                type: r.type,
                order: ri,
              },
            });
          }
          await tx.taskEvaluation.create({
            data: {
              taskId: task.id,
              summary: t.evaluation.summary,
              checklist: [],
              quizQuestions: t.evaluation.quiz as unknown as Prisma.InputJsonValue,
              checkpointDescription: t.evaluation.checkpointDescription,
            },
          });
        }
      }

      for (let i = 0; i < flatTaskIds.length; i++) {
        await tx.userTaskProgress.create({
          data: {
            userId: user.id,
            taskId: flatTaskIds[i],
            status: i === 0 ? "AVAILABLE" : "LOCKED",
          },
        });
      }

      return roadmap.id;
    });

    const { clusters, skills } = collectMilestoneKeysFromGenerated(generated);
    await ensureClusterMilestoneAchievements(clusters);
    await ensureSkillMilestoneAchievements(skills);

    revalidatePath("/dashboard");
    revalidatePath(`/roadmap/${roadmapId}`);
    return { ok: true, roadmapId };
  } catch (e) {
    if (e instanceof Error && e.message === "INSUFFICIENT_COINS") {
      return { ok: false, error: "INSUFFICIENT_COINS" };
    }
    const msg = e instanceof Error ? e.message : "Could not create roadmap.";
    return { ok: false, error: msg };
  }
}

const startContinuationSchema = z.object({
  parentRoadmapId: z.string().min(1),
  nextFocus: z.string().min(1).max(500),
  buildsOn: z.string().min(1).max(500),
  rationale: z.string().min(1).max(2000),
  roadmapDepth: z.enum(["shallow", "standard", "deep"]),
});

function attachSuggestionSignatures(
  rows: ContinuationSuggestionRow[],
): ContinuationSuggestionRowWithSig[] {
  return rows.map((r) => ({
    ...r,
    signature: continuationRowSignature(r),
  }));
}

async function loadStartedContinuations(
  parentRoadmapId: string,
  userId: string,
): Promise<Record<string, ContinuationStartedStatus>> {
  const children = await prisma.roadmap.findMany({
    where: {
      userId,
      continuedFromRoadmapId: parentRoadmapId,
    },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              progress: { where: { userId } },
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const out: Record<string, ContinuationStartedStatus> = {};
  for (const child of children) {
    const pick = child.continuationPick as { signature?: string } | null;
    const sig =
      child.continuationSignature ??
      (typeof pick?.signature === "string" ? pick.signature : null);
    if (!sig) continue;

    const { total, completed } = countRoadmapTasks(child);
    const progressPercent =
      total === 0 ? 0 : Math.round((completed / total) * 100);
    const status: ContinuationStartedStatus["status"] =
      total > 0 && completed === total ? "completed" : "in_progress";

    if (out[sig]) continue;

    out[sig] = {
      childRoadmapId: child.id,
      childTitle: child.title,
      tasksDone: completed,
      tasksTotal: total,
      progressPercent,
      status,
    };
  }
  return out;
}

export async function fetchRoadmapContinuationSuggestions(
  roadmapId: string,
): Promise<
  | {
      ok: true;
      rows: ContinuationSuggestionRowWithSig[];
      startedBySignature: Record<string, ContinuationStartedStatus>;
      suggestionsFromCache: boolean;
    }
  | { ok: false; error: string }
> {
  try {
    await requireAuthUserId();
    const user = await getOrCreateAppUser();
    const roadmap = await prisma.roadmap.findFirst({
      where: { id: roadmapId, userId: user.id },
      include: {
        phases: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                progress: { where: { userId: user.id } },
              },
            },
          },
        },
      },
    });
    if (!roadmap) return { ok: false, error: "NOT_FOUND" };

    let total = 0;
    let done = 0;
    const lines: string[] = [];
    for (let pi = 0; pi < roadmap.phases.length; pi++) {
      const ph = roadmap.phases[pi];
      const taskParts: string[] = [];
      for (const task of ph.tasks) {
        total++;
        const st = task.progress[0]?.status;
        if (st === "COMPLETED") done++;
        taskParts.push(task.title);
      }
      lines.push(
        `Phase ${pi + 1}: ${ph.title} — tasks: ${taskParts.join("; ")}`,
      );
    }
    if (total === 0 || done < total) {
      return { ok: false, error: "JOURNEY_NOT_COMPLETE" };
    }

    const startedBySignature = await loadStartedContinuations(
      roadmap.id,
      user.id,
    );

    const cached = roadmap.continuationSuggestionsJson;
    if (
      cached &&
      typeof cached === "object" &&
      cached !== null &&
      "rows" in cached
    ) {
      const parsed = continuationSuggestionsSchema.safeParse(cached);
      if (parsed.success) {
        return {
          ok: true,
          rows: attachSuggestionSignatures(parsed.data.rows),
          startedBySignature,
          suggestionsFromCache: true,
        };
      }
    }

    const completedSummary = lines.join("\n");
    const rows = await generateContinuationSuggestions({
      journeyTitle: roadmap.title,
      journeyGoal: roadmap.goal,
      language: roadmap.language,
      completedSummary,
    });

    try {
      await prisma.roadmap.update({
        where: { id: roadmapId },
        data: {
          continuationSuggestionsJson: {
            rows,
          } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (cacheErr) {
      console.warn(
        "[fetchRoadmapContinuationSuggestions] Could not persist cached suggestions. Run `npx prisma generate`, restart the dev server, and `npx prisma db push` if needed.",
        cacheErr,
      );
    }

    return {
      ok: true,
      rows: attachSuggestionSignatures(rows),
      startedBySignature,
      suggestionsFromCache: false,
    };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not load suggestions.",
    };
  }
}

export async function startContinuationFromRoadmap(
  raw: z.infer<typeof startContinuationSchema>,
): Promise<
  | { ok: true; roadmapId: string; reused?: boolean }
  | { ok: false; error: string; roadmapId?: string }
> {
  try {
    const user = await getOrCreateAppUser();
    const input = startContinuationSchema.parse(raw);
    const parent = await prisma.roadmap.findFirst({
      where: { id: input.parentRoadmapId, userId: user.id },
      include: {
        learningIntent: true,
        phases: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                progress: { where: { userId: user.id } },
              },
            },
          },
        },
      },
    });
    if (!parent) return { ok: false, error: "NOT_FOUND" };

    const allTasks = parent.phases.flatMap((p) => p.tasks);
    if (allTasks.length === 0) return { ok: false, error: "EMPTY_ROADMAP" };
    for (const t of allTasks) {
      if (t.progress[0]?.status !== "COMPLETED") {
        return { ok: false, error: "JOURNEY_NOT_COMPLETE" };
      }
    }

    const completedSummary = parent.phases
      .map((ph, pi) => {
        const tt = ph.tasks.map((task) => task.title).join("; ");
        return `${pi + 1}. ${ph.title}: ${tt}`;
      })
      .join("\n");

    const continuationFrom = {
      parentRoadmapTitle: parent.title,
      parentGoal: parent.goal,
      completedSummary,
      nextFocus: input.nextFocus,
      buildsOn: input.buildsOn,
      rationale: input.rationale,
    };

    const baseContent =
      parent.learningIntent?.sourceContent?.trim() ||
      [
        "The learner completed this roadmap on-platform; rely on the completion summary when the original source is thin.",
        "",
        "Completed work:",
        completedSummary,
        "",
        `Topic: ${parent.learningIntent?.topicTitle ?? parent.title}`,
      ].join("\n");

    const shortParent =
      parent.title.length > 72 ?
        `${parent.title.slice(0, 72)}…`
      : parent.title;
    const topicTitle = `${input.nextFocus} — after “${shortParent}”`;

    const signature = continuationRowSignature({
      nextFocus: input.nextFocus,
      buildsOn: input.buildsOn,
      rationale: input.rationale,
      roadmapDepth: input.roadmapDepth,
    });

    const existingChild = await prisma.roadmap.findFirst({
      where: {
        userId: user.id,
        continuedFromRoadmapId: parent.id,
        continuationSignature: signature,
      },
      include: {
        phases: {
          orderBy: { order: "asc" },
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                progress: { where: { userId: user.id } },
              },
            },
          },
        },
      },
    });

    if (existingChild) {
      const { total, completed } = countRoadmapTasks(existingChild);
      if (total > 0 && completed === total) {
        revalidatePath(`/roadmap/${parent.id}`);
        return {
          ok: false,
          error: "CONTINUATION_ALREADY_FINISHED",
          roadmapId: existingChild.id,
        };
      }
      revalidatePath(`/roadmap/${parent.id}`);
      revalidatePath(`/roadmap/${existingChild.id}`);
      return { ok: true, roadmapId: existingChild.id, reused: true };
    }

    const pickJson = {
      signature,
      nextFocus: input.nextFocus,
      buildsOn: input.buildsOn,
      rationale: input.rationale,
      roadmapDepth: input.roadmapDepth,
    };

    const genInput: RoadmapGenerationInput = {
      interpretedSubject: input.nextFocus,
      intentSummary: input.rationale,
      targetOutcome: `After this journey, the learner can apply: ${input.nextFocus}`,
      difficulty: "Continuing from a completed structured path",
      scopeSuggestion: `Builds on: ${input.buildsOn}. ${input.rationale}`,
      recommendedLanguage: parent.language,
      readingLevel:
        parent.learningIntent?.experienceLevel ??
        "Learner continuing from a finished journey",
      roadmapDepth: input.roadmapDepth,
      topicTitle,
      sourceType: (parent.learningIntent?.sourceType as AISource) ?? "TEXT",
      sourceContent: baseContent.slice(0, 120_000),
      userGoal: input.nextFocus,
      continuationFrom,
    };

    const generated = await generateRoadmap(genInput);
    const topicNorm = normalizeTopic(topicTitle);
    const topicClusterKey = inferTopicCluster(
      input.nextFocus,
      topicTitle,
    );

    const roadmapId = await prisma.$transaction(async (tx) => {
      const u = await tx.user.findUnique({
        where: { id: user.id },
        select: { id: true, coins: true, plan: true },
      });
      if (!u) throw new Error("NO_USER");
      if (u.plan === "FREE" && u.coins < COIN_START_JOURNEY_FREE) {
        throw new Error("INSUFFICIENT_COINS");
      }
      if (u.plan === "FREE") {
        await tx.user.update({
          where: { id: u.id },
          data: { coins: { decrement: COIN_START_JOURNEY_FREE } },
        });
      }

      const intent = await tx.learningIntent.create({
        data: {
          userId: user.id,
          topicTitle,
          topicNormalized: topicNorm,
          topicClusterKey,
          userGoal: input.nextFocus,
          sourceType: (parent.learningIntent?.sourceType ?? "TEXT") as SourceType,
          sourceContent: baseContent.slice(0, 120_000),
          sourceFileName: parent.learningIntent?.sourceFileName,
          targetLanguage: parent.language,
          experienceLevel: parent.learningIntent?.experienceLevel,
        },
      });

      const roadmap = await tx.roadmap.create({
        data: {
          userId: user.id,
          learningIntentId: intent.id,
          title: generated.title,
          description: generated.description,
          goal: generated.goal,
          estDurationLabel: generated.estDurationLabel,
          language: generated.language,
          status: "ACTIVE",
          continuedFromRoadmapId: parent.id,
          continuationSignature: signature,
          continuationPick: pickJson as unknown as Prisma.InputJsonValue,
        },
      });

      const flatTaskIds: string[] = [];

      for (let pi = 0; pi < generated.phases.length; pi++) {
        const ph = generated.phases[pi];
        const phase = await tx.roadmapPhase.create({
          data: {
            roadmapId: roadmap.id,
            title: ph.title,
            summary: ph.summary,
            order: pi,
          },
        });
        for (let ti = 0; ti < ph.tasks.length; ti++) {
          const t = ph.tasks[ti];
          const task = await tx.roadmapTask.create({
            data: {
              phaseId: phase.id,
              title: t.title,
              explanation: t.explanation,
              whyMatters: t.whyMatters,
              mentorPerspective: t.mentorPerspective,
              instructions: t.instructions,
              lessonCategory: t.lessonCategory,
              achievementKeys: t.achievementKeys,
              order: ti,
              xpReward: t.xpReward,
              estimatedMinutes: t.estimatedMinutes,
            },
          });
          flatTaskIds.push(task.id);
          for (let ri = 0; ri < t.resources.length; ri++) {
            const r = t.resources[ri];
            await tx.taskResource.create({
              data: {
                taskId: task.id,
                title: r.title,
                url: r.url ?? null,
                type: r.type,
                order: ri,
              },
            });
          }
          await tx.taskEvaluation.create({
            data: {
              taskId: task.id,
              summary: t.evaluation.summary,
              checklist: [],
              quizQuestions: t.evaluation.quiz as unknown as Prisma.InputJsonValue,
              checkpointDescription: t.evaluation.checkpointDescription,
            },
          });
        }
      }

      for (let i = 0; i < flatTaskIds.length; i++) {
        await tx.userTaskProgress.create({
          data: {
            userId: user.id,
            taskId: flatTaskIds[i],
            status: i === 0 ? "AVAILABLE" : "LOCKED",
          },
        });
      }

      return roadmap.id;
    });

    const { clusters, skills } = collectMilestoneKeysFromGenerated(generated);
    await ensureClusterMilestoneAchievements(clusters);
    await ensureSkillMilestoneAchievements(skills);

    revalidatePath("/dashboard");
    revalidatePath(`/roadmap/${roadmapId}`);
    revalidatePath(`/roadmap/${parent.id}`);
    return { ok: true, roadmapId };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return {
        ok: false,
        error: e.issues.map((i) => i.message).join(", "),
      };
    }
    if (e instanceof Error && e.message === "INSUFFICIENT_COINS") {
      return { ok: false, error: "INSUFFICIENT_COINS" };
    }
    const msg =
      e instanceof Error ? e.message : "Could not start continuation.";
    return { ok: false, error: msg };
  }
}

/** Client sends a plain index array; legacy `{ answers: number[] }` still accepted. */
const submitQuizAnswersSchema = z.union([
  z.array(z.number().int().min(0)),
  z
    .object({ answers: z.array(z.number().int().min(0)) })
    .transform((o) => o.answers),
]);

export async function submitTaskQuiz(
  taskId: string,
  answersRaw: unknown,
): Promise<
  | {
      ok: true;
      passed: boolean;
      submissionCount: number;
      failCount: number;
      correctCount?: number;
      total?: number;
      wrongIndices?: number[];
    }
  | { ok: false; error: string }
> {
  try {
    const parsed = submitQuizAnswersSchema.safeParse(answersRaw);
    if (!parsed.success) {
      return { ok: false, error: "QUIZ_ANSWERS_INVALID" };
    }
    const answers = parsed.data;
    const user = await getOrCreateAppUser();
    const progress = await prisma.userTaskProgress.findUnique({
      where: { userId_taskId: { userId: user.id, taskId } },
      include: {
        task: {
          include: {
            phase: { select: { roadmapId: true } },
            evaluation: { select: { quizQuestions: true } },
          },
        },
      },
    });
    if (!progress || progress.status !== "AVAILABLE") {
      return { ok: false, error: "Task not available." };
    }
    const questions = parseTaskQuizQuestions(
      progress.task.evaluation?.quizQuestions,
    );
    if (questions.length === 0) {
      return { ok: false, error: "No quiz for this task." };
    }
    if (progress.quizPassedAt) {
      return {
        ok: true,
        passed: true,
        submissionCount: progress.quizSubmissionCount,
        failCount: progress.quizFailCount,
      };
    }
    if (answers.length !== questions.length) {
      return { ok: false, error: "QUIZ_INCOMPLETE" };
    }
    for (let i = 0; i < questions.length; i++) {
      if (
        typeof answers[i] !== "number" ||
        answers[i]! < 0 ||
        answers[i]! >= questions[i]!.choices.length
      ) {
        return { ok: false, error: "QUIZ_INVALID_CHOICE" };
      }
    }

    const { passed, correctCount, wrongIndices } = gradeQuiz(
      questions,
      answers,
    );
    const submissionNext = progress.quizSubmissionCount + 1;
    const failNext = passed
      ? progress.quizFailCount
      : progress.quizFailCount + 1;

    await prisma.userTaskProgress.update({
      where: { id: progress.id },
      data: {
        quizSubmissionCount: submissionNext,
        quizFailCount: failNext,
        ...(passed ? { quizPassedAt: new Date() } : {}),
      },
    });

    revalidatePath(
      `/roadmap/${progress.task.phase.roadmapId}/task/${taskId}`,
    );

    if (passed) {
      return {
        ok: true,
        passed: true,
        submissionCount: submissionNext,
        failCount: failNext,
      };
    }
    return {
      ok: true,
      passed: false,
      submissionCount: submissionNext,
      failCount: failNext,
      correctCount,
      total: questions.length,
      wrongIndices,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not submit quiz.";
    return { ok: false, error: msg };
  }
}

export async function markTaskComplete(taskId: string): Promise<
  | {
      ok: true;
      xpGained: number;
      phaseCompleted: boolean;
      roadmapCompleted: boolean;
      newAchievements: string[];
      coinsEarned: number;
      celebration: "task" | "phase" | "roadmap";
    }
  | { ok: false; error: string }
> {
  try {
    const user = await getOrCreateAppUser();
    const progress = await prisma.userTaskProgress.findUnique({
      where: { userId_taskId: { userId: user.id, taskId } },
      include: {
        task: {
          include: {
            phase: { include: { roadmap: true } },
            evaluation: { select: { quizQuestions: true } },
          },
        },
      },
    });
    if (!progress || progress.status !== "AVAILABLE") {
      return { ok: false, error: "Task not available." };
    }

    const quiz = parseTaskQuizQuestions(
      progress.task.evaluation?.quizQuestions,
    );
    if (quiz.length > 0 && !progress.quizPassedAt) {
      return { ok: false, error: "QUIZ_NOT_PASSED" };
    }

    const roadmapId = progress.task.phase.roadmapId;
    const xpReward = progress.task.xpReward;

    await prisma.userTaskProgress.update({
      where: { id: progress.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { xpTotal: { increment: xpReward } },
    });

    await prisma.roadmap.update({
      where: { id: roadmapId },
      data: { updatedAt: new Date() },
    });

    const ordered = await prisma.roadmapTask.findMany({
      where: { phase: { roadmapId } },
      orderBy: [{ phase: { order: "asc" } }, { order: "asc" }],
      select: { id: true },
    });
    const ids = ordered.map((t) => t.id);
    const idx = ids.indexOf(taskId);
    const nextId = idx >= 0 && idx < ids.length - 1 ? ids[idx + 1] : null;
    if (nextId) {
      await prisma.userTaskProgress.updateMany({
        where: { userId: user.id, taskId: nextId, status: "LOCKED" },
        data: { status: "AVAILABLE" },
      });
    }

    const phaseTasks = await prisma.roadmapTask.findMany({
      where: { phaseId: progress.task.phaseId },
      select: { id: true },
    });
    const phaseProgress = await prisma.userTaskProgress.findMany({
      where: {
        userId: user.id,
        taskId: { in: phaseTasks.map((t) => t.id) },
      },
    });
    const phaseDone = phaseProgress.every((p) => p.status === "COMPLETED");

    const allProgress = await prisma.userTaskProgress.findMany({
      where: { userId: user.id, task: { phase: { roadmapId } } },
    });
    const roadmapDone = allProgress.every((p) => p.status === "COMPLETED");

    const newAchievements: string[] = [];
    async function grant(slug: string) {
      const ach = await prisma.achievement.findUnique({ where: { slug } });
      if (!ach) return;
      try {
        await prisma.userAchievement.create({
          data: { userId: user.id, achievementId: ach.id },
        });
        newAchievements.push(slug);
        await prisma.user.update({
          where: { id: user.id },
          data: { xpTotal: { increment: ach.xpBonus } },
        });
      } catch {
        /* already earned */
      }
    }

    const completedCount = await prisma.userTaskProgress.count({
      where: { userId: user.id, status: "COMPLETED" },
    });
    if (completedCount >= 1) await grant("first_step");
    if (phaseDone) await grant("phase_crusher");
    if (completedCount >= 5) await grant("consistent_learner");
    if (roadmapDone) await grant("roadmap_finisher");

    const perCategory = await countCompletedTasksPerCategory(user.id);
    for (const key of TOPIC_CLUSTER_KEYS) {
      const n = perCategory[key];
      if (n >= 1) await grant(clusterAchievementSlug(key, "once"));
      if (n >= 2) await grant(clusterAchievementSlug(key, "twice"));
      if (n >= 3) await grant(clusterAchievementSlug(key, "many"));
    }

    const perSkill = await countCompletedTasksPerSkillKey(user.id);
    const skillKeysWithProgress = Object.keys(perSkill).filter(
      (k) => (perSkill[k] ?? 0) > 0,
    );
    await ensureSkillMilestoneAchievements(skillKeysWithProgress);
    for (const key of skillKeysWithProgress) {
      const n = perSkill[key] ?? 0;
      if (n >= 1) await grant(skillAchievementSlug(key, "once"));
      if (n >= 2) await grant(skillAchievementSlug(key, "twice"));
      if (n >= 3) await grant(skillAchievementSlug(key, "many"));
    }

    let coinsEarned = 0;
    const wallet = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });
    if (wallet && !skipsCoinEconomy(wallet.plan)) {
      let delta = 0;
      if (phaseDone) {
        delta +=
          phaseTasks.length > 1 ?
            COIN_TOPIC_COMPLETE
          : coinsForSingleTaskPhaseComplete(xpReward);
      }
      if (roadmapDone) {
        delta += COIN_JOURNEY_COMPLETE;
        delta += COIN_EXCELLENCE_BONUS;
      }
      const noteLen = (progress.notes ?? "").trim().length;
      if (noteLen >= REFLECTION_MIN_CHARS) delta += COIN_REFLECTION_BONUS;
      coinsEarned = delta;
      if (delta > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { coins: { increment: delta } },
        });
      }
    }

    const celebration: "task" | "phase" | "roadmap" = roadmapDone
      ? "roadmap"
      : phaseDone
        ? "phase"
        : "task";

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/achievements");
    revalidatePath(`/roadmap/${roadmapId}`);
    revalidatePath(`/roadmap/${roadmapId}/task/${taskId}`);

    const continuationParent = await prisma.roadmap.findUnique({
      where: { id: roadmapId },
      select: { continuedFromRoadmapId: true },
    });
    if (continuationParent?.continuedFromRoadmapId) {
      revalidatePath(
        `/roadmap/${continuationParent.continuedFromRoadmapId}`,
      );
    }

    if (user.profilePublic) {
      for (const loc of routing.locales) {
        const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
        revalidatePath(`${prefix}/community`);
        revalidatePath(`${prefix}/feed`);
        revalidatePath(`${prefix}/community/u/${user.id}`);
      }
    }

    return {
      ok: true,
      xpGained: xpReward,
      phaseCompleted: phaseDone,
      roadmapCompleted: roadmapDone,
      newAchievements,
      coinsEarned,
      celebration,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not update task.";
    return { ok: false, error: msg };
  }
}

function revalidatePublicLearningPaths(userId: string, profilePublic: boolean) {
  if (!profilePublic) return;
  for (const loc of routing.locales) {
    const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
    revalidatePath(`${prefix}/feed`);
    revalidatePath(`${prefix}/community`);
    revalidatePath(`${prefix}/community/u/${userId}`);
  }
}

const askTaskCoachSchema = z.object({
  taskId: z.string(),
  message: z.string().min(1).max(4000),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(12_000),
      }),
    )
    .max(24)
    .optional()
    .default([]),
});

function normalizeCoachHistory(
  raw: { role: "user" | "assistant"; content: string }[],
): { role: "user" | "assistant"; content: string }[] {
  const slice = raw.slice(-24);
  const trimmed: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of slice) {
    if (m.role !== "user" && m.role !== "assistant") continue;
    const c = m.content.trim();
    if (!c) continue;
    trimmed.push({ role: m.role, content: c.slice(0, 8000) });
  }
  const firstUser = trimmed.findIndex((m) => m.role === "user");
  if (firstUser < 0) return [];
  let work = trimmed.slice(firstUser);
  while (work.length > 0 && work[work.length - 1]!.role === "user") {
    work.pop();
  }
  let expect: "user" | "assistant" = "user";
  const cleaned: typeof work = [];
  for (const m of work) {
    if (m.role !== expect) break;
    cleaned.push(m);
    expect = expect === "user" ? "assistant" : "user";
  }
  return cleaned;
}

export async function askTaskCoach(
  raw: z.input<typeof askTaskCoachSchema>,
): Promise<
  | { ok: true; reply: string }
  | { ok: false; error: "INSUFFICIENT_COINS" | "NOT_AVAILABLE" | "INVALID" | "COACH_FAILED" }
> {
  const parsed = askTaskCoachSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "INVALID" };
  }
  const { taskId, message, history: historyRaw } = parsed.data;
  const history = normalizeCoachHistory(historyRaw ?? []);

  const user = await getOrCreateAppUser();
  const task = await prisma.roadmapTask.findFirst({
    where: { id: taskId, phase: { roadmap: { userId: user.id } } },
    include: {
      resources: { orderBy: { order: "asc" } },
      evaluation: true,
      progress: { where: { userId: user.id } },
      phase: {
        select: {
          roadmapId: true,
          roadmap: {
            select: {
              title: true,
              learningIntent: {
                select: { topicClusterKey: true },
              },
            },
          },
        },
      },
    },
  });
  if (!task) {
    return { ok: false, error: "NOT_AVAILABLE" };
  }

  const progress = task.progress[0];
  const status = progress?.status ?? "LOCKED";
  if (status === "LOCKED") {
    return { ok: false, error: "NOT_AVAILABLE" };
  }

  const shouldCharge = !skipsCoinEconomy(user.plan);
  if (shouldCharge && user.coins < COIN_TASK_AI_MESSAGE) {
    return { ok: false, error: "INSUFFICIENT_COINS" };
  }

  const journeyCluster =
    task.phase.roadmap.learningIntent?.topicClusterKey ?? "general";
  const lessonCategory = normalizeClusterKey(
    task.lessonCategory ?? journeyCluster,
  );

  const resourcesLines = task.resources.length
    ? task.resources
        .map(
          (r) =>
            `- ${r.title}${r.url ? ` — ${r.url}` : ""} (${r.type})`,
        )
        .join("\n")
    : "";

  const coachInput = {
    roadmapTitle: task.phase.roadmap.title,
    lessonCategory,
    achievementKeys: task.achievementKeys,
    taskTitle: task.title,
    explanation: task.explanation,
    whyMatters: task.whyMatters,
    mentorPerspective: task.mentorPerspective,
    instructions: task.instructions,
    resourcesLines,
    evaluationSummary: task.evaluation?.summary ?? null,
    checkpointDescription: task.evaluation?.checkpointDescription ?? null,
    quizPassed: Boolean(progress?.quizPassedAt),
    priorMessages: history,
    newQuestion: message.trim(),
  };

  let debited = false;
  try {
    if (shouldCharge) {
      await prisma.user.update({
        where: { id: user.id },
        data: { coins: { decrement: COIN_TASK_AI_MESSAGE } },
      });
      debited = true;
    }
    const reply = await answerTaskCoach(coachInput);
    revalidatePath("/dashboard");
    const roadmapId = task.phase.roadmapId;
    revalidatePath(`/roadmap/${roadmapId}`);
    revalidatePath(`/roadmap/${roadmapId}/task/${taskId}`);
    return { ok: true, reply };
  } catch (e) {
    console.error("askTaskCoach", e);
    if (debited) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { coins: { increment: COIN_TASK_AI_MESSAGE } },
        });
      } catch {
        /* best-effort refund */
      }
    }
    return { ok: false, error: "COACH_FAILED" };
  }
}

export async function saveTaskNotes(
  taskId: string,
  notes: string,
  feedCaption?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getOrCreateAppUser();
    const cap =
      feedCaption === undefined ?
        undefined
      : (() => {
          const t = feedCaption.trim();
          return t ? t.slice(0, 2000) : null;
        })();
    await prisma.userTaskProgress.update({
      where: { userId_taskId: { userId: user.id, taskId } },
      data: {
        notes: notes.slice(0, 8000),
        ...(cap !== undefined ? { feedCaption: cap } : {}),
      },
    });
    const pub = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profilePublic: true },
    });
    revalidatePublicLearningPaths(user.id, pub?.profilePublic ?? false);
    revalidatePath("/dashboard");
    const progress = await prisma.userTaskProgress.findFirst({
      where: { userId: user.id, taskId },
      select: { task: { select: { phase: { select: { roadmapId: true } } } } },
    });
    const rid = progress?.task.phase.roadmapId;
    if (rid) {
      revalidatePath(`/roadmap/${rid}`);
      revalidatePath(`/roadmap/${rid}/task/${taskId}`);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not save notes." };
  }
}
