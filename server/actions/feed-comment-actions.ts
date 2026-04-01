"use server";

import { FeedActivityTarget } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

const lessonRefInputSchema = z.object({
  roadmapId: z.string().min(1),
  taskId: z.string().min(1),
});

const addCommentSchema = z.object({
  targetKind: z.nativeEnum(FeedActivityTarget),
  targetId: z.string().min(1),
  body: z.string().min(1).max(4000),
  lessonRefs: z.array(lessonRefInputSchema).max(4).optional(),
});

function revalidateFeedPaths() {
  for (const loc of routing.locales) {
    const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
    revalidatePath(`${prefix}/feed`);
    revalidatePath(`${prefix}/community`);
  }
}

async function assertPublicFeedTarget(
  targetKind: FeedActivityTarget,
  targetId: string,
): Promise<boolean> {
  if (targetKind === FeedActivityTarget.TASK_COMPLETION) {
    const row = await prisma.userTaskProgress.findFirst({
      where: {
        id: targetId,
        status: "COMPLETED",
        user: { profilePublic: true },
      },
      select: { id: true },
    });
    return Boolean(row);
  }
  const row = await prisma.userAchievement.findFirst({
    where: {
      id: targetId,
      user: { profilePublic: true },
    },
    select: { id: true },
  });
  return Boolean(row);
}

async function resolveLessonRefsForAuthor(
  authorId: string,
  raw: z.infer<typeof lessonRefInputSchema>[],
): Promise<{ roadmapId: string; taskId: string; title: string }[]> {
  const out: { roadmapId: string; taskId: string; title: string }[] = [];
  const seen = new Set<string>();
  for (const ref of raw) {
    const dedupe = `${ref.roadmapId}:${ref.taskId}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    const task = await prisma.roadmapTask.findFirst({
      where: {
        id: ref.taskId,
        phase: { roadmapId: ref.roadmapId, roadmap: { userId: authorId } },
      },
      select: { title: true },
    });
    if (task) {
      out.push({
        roadmapId: ref.roadmapId,
        taskId: ref.taskId,
        title: task.title,
      });
    }
  }
  return out;
}

export async function getMyLessonsForReference(): Promise<
  {
    roadmapId: string;
    roadmapTitle: string;
    taskId: string;
    taskTitle: string;
  }[]
> {
  const user = await getOrCreateAppUser();
  const roadmaps = await prisma.roadmap.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 24,
    select: {
      id: true,
      title: true,
      phases: {
        orderBy: { order: "asc" },
        select: {
          tasks: {
            orderBy: { order: "asc" },
            select: { id: true, title: true },
          },
        },
      },
    },
  });

  const flat: {
    roadmapId: string;
    roadmapTitle: string;
    taskId: string;
    taskTitle: string;
  }[] = [];

  for (const r of roadmaps) {
    for (const ph of r.phases) {
      for (const t of ph.tasks) {
        flat.push({
          roadmapId: r.id,
          roadmapTitle: r.title,
          taskId: t.id,
          taskTitle: t.title,
        });
      }
    }
  }

  return flat.slice(0, 200);
}

export async function addFeedComment(
  raw: z.infer<typeof addCommentSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getOrCreateAppUser();
    const input = addCommentSchema.parse(raw);

    const targetOk = await assertPublicFeedTarget(
      input.targetKind,
      input.targetId,
    );
    if (!targetOk) {
      return { ok: false, error: "This activity is not available to comment on." };
    }

    const lessonRefs =
      input.lessonRefs?.length ?
        await resolveLessonRefsForAuthor(user.id, input.lessonRefs)
      : null;

    await prisma.feedComment.create({
      data: {
        targetKind: input.targetKind,
        targetId: input.targetId,
        authorId: user.id,
        body: input.body.trim(),
        lessonRefs: lessonRefs?.length ? lessonRefs : undefined,
      },
    });

    revalidateFeedPaths();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not post comment.",
    };
  }
}
