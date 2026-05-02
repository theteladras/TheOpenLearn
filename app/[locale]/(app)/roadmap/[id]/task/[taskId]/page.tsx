import { notFound } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { COIN_LESSON_HANDBOOK, skipsCoinEconomy } from "@/lib/coin-economy";
import { prisma } from "@/lib/db";
import { resolveTaskLessonMinutes } from "@/lib/lesson-time-estimate";
import { parseTaskQuizBank, quizBankMaxQuestionCount } from "@/lib/task-quiz";
import { TaskDetail } from "@/features/roadmap/task-detail";

type Props = {
  params: Promise<{ locale: string; id: string; taskId: string }>;
};

export default async function TaskPage({ params }: Props) {
  const { id: roadmapId, taskId } = await params;
  const user = await getOrCreateAppUser();

  const task = await prisma.roadmapTask.findFirst({
    where: {
      id: taskId,
      phase: { roadmapId, roadmap: { userId: user.id } },
    },
    include: {
      resources: { orderBy: { order: "asc" } },
      evaluation: true,
      progress: { where: { userId: user.id } },
      _count: { select: { resources: true } },
    },
  });

  if (!task) notFound();

  const handbookRow = await prisma.lessonHandbook.findUnique({
    where: { userId_taskId: { userId: user.id, taskId: task.id } },
    select: { id: true },
  });

  const progress = task.progress[0];
  const status = progress?.status ?? "LOCKED";
  const quizLen = quizBankMaxQuestionCount(
    parseTaskQuizBank(task.evaluation?.quizQuestions ?? null),
  );
  const lessonTimeMinutes = resolveTaskLessonMinutes({
    explanation: task.explanation,
    mentorPerspective: task.mentorPerspective,
    instructions: task.instructions,
    whyMatters: task.whyMatters,
    quizCount: quizLen,
    resourceCount: task._count.resources,
    storedEstimatedMinutes: task.estimatedMinutes,
    xpReward: task.xpReward,
  });

  return (
    <TaskDetail
      roadmapId={roadmapId}
      coachChargePerMessage={!skipsCoinEconomy(user.plan)}
      handbookOwned={Boolean(handbookRow)}
      handbookCoinCost={COIN_LESSON_HANDBOOK}
      task={{
        id: task.id,
        title: task.title,
        explanation: task.explanation,
        whyMatters: task.whyMatters,
        mentorPerspective: task.mentorPerspective,
        instructions: task.instructions,
        recap: task.recap,
        funFacts: task.funFacts ?? [],
        keyTerms: task.keyTerms ?? [],
        xpReward: task.xpReward,
        resources: task.resources,
        evaluation: task.evaluation
          ? {
              summary: task.evaluation.summary,
              checkpointDescription: task.evaluation.checkpointDescription,
              quizQuestions: task.evaluation.quizQuestions,
            }
          : null,
        status,
        notes: progress?.notes ?? null,
        feedCaption: progress?.feedCaption ?? null,
        quizSubmissionCount: progress?.quizSubmissionCount ?? 0,
        quizFailCount: progress?.quizFailCount ?? 0,
        quizPassedAt: progress?.quizPassedAt?.toISOString() ?? null,
        achievementKeys: task.achievementKeys,
        lessonTimeMinutes,
      }}
    />
  );
}
