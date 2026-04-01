import { FeedActivityTarget } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CommunityActivityItem } from "@/lib/community-data";

export type FeedLessonRefStored = {
  roadmapId: string;
  taskId: string;
  title: string;
};

export type FeedCommentPublic = {
  id: string;
  body: string;
  createdAt: Date;
  authorId: string;
  displayName: string | null;
  lessonRefs: FeedLessonRefStored[] | null;
};

export function activityToCommentTarget(item: CommunityActivityItem): {
  targetKind: FeedActivityTarget;
  targetId: string;
} {
  if (item.kind === "task") {
    return {
      targetKind: FeedActivityTarget.TASK_COMPLETION,
      targetId: item.progressId,
    };
  }
  return {
    targetKind: FeedActivityTarget.BADGE_EARNED,
    targetId: item.userAchievementId,
  };
}

export function commentTargetStorageKey(
  targetKind: FeedActivityTarget,
  targetId: string,
): string {
  return `${targetKind}:${targetId}`;
}

function parseLessonRefs(raw: unknown): FeedLessonRefStored[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: FeedLessonRefStored[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const roadmapId = typeof r.roadmapId === "string" ? r.roadmapId : null;
    const taskId = typeof r.taskId === "string" ? r.taskId : null;
    const title = typeof r.title === "string" ? r.title : null;
    if (roadmapId && taskId && title) {
      out.push({ roadmapId, taskId, title });
    }
  }
  return out.length ? out : null;
}

/**
 * Loads comments for feed cards (batched). Values are sorted oldest-first per target.
 */
export async function getFeedCommentsForTargets(
  targets: { targetKind: FeedActivityTarget; targetId: string }[],
): Promise<Map<string, FeedCommentPublic[]>> {
  const map = new Map<string, FeedCommentPublic[]>();
  if (targets.length === 0) return map;

  const rows = await prisma.feedComment.findMany({
    where: { OR: targets },
    orderBy: { createdAt: "asc" },
    take: 800,
    select: {
      id: true,
      targetKind: true,
      targetId: true,
      body: true,
      lessonRefs: true,
      createdAt: true,
      authorId: true,
      author: { select: { displayName: true } },
    },
  });

  for (const row of rows) {
    const key = commentTargetStorageKey(row.targetKind, row.targetId);
    const list = map.get(key) ?? [];
    list.push({
      id: row.id,
      body: row.body,
      createdAt: row.createdAt,
      authorId: row.authorId,
      displayName: row.author.displayName,
      lessonRefs: parseLessonRefs(row.lessonRefs),
    });
    map.set(key, list);
  }

  return map;
}
