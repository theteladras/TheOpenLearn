import { notFound } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
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
            },
          },
        },
      },
    },
  });

  if (!roadmap) notFound();

  const continuedFromParentId = roadmap.continuedFromRoadmapId ?? null;
  const continuedFrom =
    continuedFromParentId ?
      await prisma.roadmap.findFirst({
        where: { id: continuedFromParentId, userId: user.id },
        select: { id: true, title: true },
      })
    : null;

  const phases = roadmap.phases.map((ph) => ({
    id: ph.id,
    title: ph.title,
    summary: ph.summary,
    order: ph.order,
    tasks: ph.tasks.map((task) => ({
      id: task.id,
      title: task.title,
      order: task.order,
      status: task.progress[0]?.status ?? ("LOCKED" as const),
    })),
  }));

  return (
    <RoadmapView
      roadmapId={roadmap.id}
      title={roadmap.title}
      goal={roadmap.goal}
      description={roadmap.description}
      estDurationLabel={roadmap.estDurationLabel}
      phases={phases}
      continuedFrom={continuedFrom}
    />
  );
}
