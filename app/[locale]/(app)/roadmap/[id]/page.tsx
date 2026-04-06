import { notFound } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { resolveTaskLessonMinutes } from "@/lib/lesson-time-estimate";
import { parseTaskQuizQuestions } from "@/lib/task-quiz";
import { RoadmapView } from "@/features/roadmap/roadmap-view";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function RoadmapPage({ params }: Props) {
  const { id } = await params;
  const user = await getOrCreateAppUser();

  const roadmap = await prisma.roadmap.findFirst({
    where: { id, userId: user.id },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
            include: {
              progress: { where: { userId: user.id } },
              evaluation: { select: { quizQuestions: true } },
              _count: { select: { resources: true } },
            },
          },
        },
      },
    },
  });

  if (!roadmap) notFound();

  const continuedFromParentId = roadmap.continuedFromRoadmapId ?? null;
  const continuedFrom = continuedFromParentId
    ? await prisma.roadmap.findFirst({
        where: { id: continuedFromParentId, userId: user.id },
        select: { id: true, title: true },
      })
    : null;

  const followUpChapters = await prisma.roadmap.findMany({
    where: { continuedFromRoadmapId: roadmap.id, userId: user.id },
    select: { id: true, title: true },
    orderBy: { createdAt: "asc" },
  });

  let totalLessonMinutes = 0;
  const phases = roadmap.phases.map((ph) => ({
    id: ph.id,
    title: ph.title,
    summary: ph.summary,
    order: ph.order,
    tasks: ph.tasks.map((task) => {
      const quizLen = parseTaskQuizQuestions(
        task.evaluation?.quizQuestions ?? null,
      ).length;
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
      totalLessonMinutes += lessonTimeMinutes;
      return {
        id: task.id,
        title: task.title,
        order: task.order,
        status: task.progress[0]?.status ?? ("LOCKED" as const),
        quizPassedAt: task.progress[0]?.quizPassedAt?.toISOString() ?? null,
        achievementKeys: task.achievementKeys,
        lessonTimeMinutes,
      };
    }),
  }));

  const activeTimeHoursRounded =
    Math.round((totalLessonMinutes / 60) * 10) / 10;

  return (
    <RoadmapView
      roadmapId={roadmap.id}
      title={roadmap.title}
      goal={roadmap.goal}
      description={roadmap.description}
      estDurationLabel={roadmap.estDurationLabel}
      totalLessonMinutes={totalLessonMinutes}
      activeTimeHoursRounded={activeTimeHoursRounded}
      phases={phases}
      continuedFrom={continuedFrom}
      followUpChapters={followUpChapters}
    />
  );
}
