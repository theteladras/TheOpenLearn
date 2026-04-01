import { notFound } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
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
    },
  });

  if (!task) notFound();

  const progress = task.progress[0];
  const status = progress?.status ?? "LOCKED";

  return (
    <TaskDetail
      roadmapId={roadmapId}
      task={{
        id: task.id,
        title: task.title,
        explanation: task.explanation,
        whyMatters: task.whyMatters,
        mentorPerspective: task.mentorPerspective,
        instructions: task.instructions,
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
      }}
    />
  );
}
