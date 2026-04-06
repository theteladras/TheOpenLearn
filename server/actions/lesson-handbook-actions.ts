"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { generateLessonHandbook } from "@/server/ai/ai-service";
import { getOrCreateAppUser } from "@/lib/auth-user";
import {
  COIN_LESSON_HANDBOOK,
  skipsCoinEconomy,
} from "@/lib/coin-economy";
import { prisma } from "@/lib/db";
import { isLessonFinishedWithExam } from "@/lib/lesson-finished";
import { normalizeClusterKey } from "@/lib/topic-cluster";

export async function createLessonHandbookPurchase(taskId: string): Promise<
  | { ok: true; downloadPath: string }
  | {
      ok: false;
      error:
        | "NOT_FOUND"
        | "LESSON_NOT_COMPLETE"
        | "INSUFFICIENT_COINS"
        | "GENERATION_FAILED";
    }
> {
  let debited = false;
  let refundUserId: string | undefined;
  try {
    const user = await getOrCreateAppUser();
    refundUserId = user.id;

    const existing = await prisma.lessonHandbook.findUnique({
      where: { userId_taskId: { userId: user.id, taskId } },
    });
    if (existing) {
      return { ok: true, downloadPath: `/api/lesson-handbook/${taskId}` };
    }

    const task = await prisma.roadmapTask.findFirst({
      where: { id: taskId, phase: { roadmap: { userId: user.id } } },
      include: {
        resources: { orderBy: { order: "asc" } },
        evaluation: true,
        phase: {
          include: {
            roadmap: { include: { learningIntent: true } },
          },
        },
        progress: { where: { userId: user.id } },
      },
    });
    if (!task) return { ok: false, error: "NOT_FOUND" };

    const progress = task.progress[0];
    if (!isLessonFinishedWithExam(progress)) {
      return { ok: false, error: "LESSON_NOT_COMPLETE" };
    }

    const shouldCharge = !skipsCoinEconomy(user.plan);
    const wallet = await prisma.user.findUnique({
      where: { id: user.id },
      select: { coins: true },
    });
    if (!wallet) return { ok: false, error: "NOT_FOUND" };

    if (shouldCharge && wallet.coins < COIN_LESSON_HANDBOOK) {
      return { ok: false, error: "INSUFFICIENT_COINS" };
    }

    if (shouldCharge) {
      await prisma.user.update({
        where: { id: user.id },
        data: { coins: { decrement: COIN_LESSON_HANDBOOK } },
      });
      debited = true;
    }

    const resourcesLines =
      task.resources.length > 0 ?
        task.resources
          .map((r) => `- ${r.title}${r.url ? ` — ${r.url}` : ""}`)
          .join("\n")
      : "(none listed)";

    const lessonCategory =
      normalizeClusterKey(task.lessonCategory) ||
      normalizeClusterKey(
        task.phase.roadmap.learningIntent?.topicClusterKey ?? null,
      ) ||
      "general";

    const doc = await generateLessonHandbook({
      roadmapTitle: task.phase.roadmap.title,
      lessonCategory,
      achievementKeys: task.achievementKeys,
      taskTitle: task.title,
      explanation: task.explanation,
      whyMatters: task.whyMatters,
      mentorPerspective: task.mentorPerspective,
      instructions: task.instructions,
      recap: task.recap,
      resourcesLines,
      evaluationSummary: task.evaluation?.summary ?? null,
      checkpointDescription: task.evaluation?.checkpointDescription ?? null,
    });

    try {
      await prisma.lessonHandbook.create({
        data: {
          userId: user.id,
          taskId,
          handbookJson: doc as unknown as Prisma.InputJsonValue,
          coinsSpent: shouldCharge ? COIN_LESSON_HANDBOOK : 0,
        },
      });
    } catch (createErr) {
      if (
        createErr instanceof Prisma.PrismaClientKnownRequestError &&
        createErr.code === "P2002"
      ) {
        /* Concurrent double-submit: another request created the row first. */
        if (debited && refundUserId) {
          try {
            await prisma.user.update({
              where: { id: refundUserId },
              data: { coins: { increment: COIN_LESSON_HANDBOOK } },
            });
          } catch {
            /* best-effort refund */
          }
        }
        debited = false;
      } else {
        throw createErr;
      }
    }

    const roadmapId = task.phase.roadmapId;
    revalidatePath("/dashboard");
    revalidatePath("/profile/handbooks");
    revalidatePath(`/roadmap/${roadmapId}`);
    revalidatePath(`/roadmap/${roadmapId}/task/${taskId}`);

    return { ok: true, downloadPath: `/api/lesson-handbook/${taskId}` };
  } catch (e) {
    console.error("createLessonHandbookPurchase", e);
    if (debited && refundUserId) {
      try {
        await prisma.user.update({
          where: { id: refundUserId },
          data: { coins: { increment: COIN_LESSON_HANDBOOK } },
        });
      } catch {
        /* best-effort refund */
      }
    }
    return { ok: false, error: "GENERATION_FAILED" };
  }
}
