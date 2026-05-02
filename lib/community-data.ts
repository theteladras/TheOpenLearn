import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { CommunityMemberStats } from "@/lib/community-metrics";

type RawRow = {
  id: string;
  displayName: string | null;
  publicBio: string | null;
  xpTotal: number;
  streakDays: number;
  createdAt: Date;
  tasks_done: number;
  challenge_xp: number;
  topic_breadth: number;
  ach_count: number;
  roadmaps_done: number;
};

function toNum(n: unknown): number {
  if (typeof n === "bigint") return Number(n);
  if (typeof n === "number") return n;
  return Number(n ?? 0);
}

const taskCoachActivitySelect = {
  id: true,
  createdAt: true,
  userId: true,
  roadmapId: true,
  userMessageExcerpt: true,
  assistantExcerpt: true,
  user: { select: { displayName: true } },
  task: {
    select: {
      id: true,
      title: true,
      phase: {
        select: {
          roadmap: { select: { id: true, title: true } },
        },
      },
    },
  },
} as const;

type CoachRow = {
  id: string;
  createdAt: Date;
  userId: string;
  roadmapId: string;
  userMessageExcerpt: string;
  assistantExcerpt: string;
  user: { displayName: string | null };
  task: {
    id: string;
    title: string;
    phase: { roadmap: { id: string; title: string } };
  };
};

/**
 * Handles dev caches where `prisma generate` ran after the server started: delegate can be missing until reload.
 */
async function findTaskCoachActivities(
  where: { user: Prisma.UserWhereInput } | { userId: string },
  take: number,
): Promise<CoachRow[]> {
  const delegate = (
    prisma as unknown as {
      taskCoachActivity?: {
        findMany: (args: {
          where: typeof where;
          orderBy: { createdAt: "desc" };
          take: number;
          select: typeof taskCoachActivitySelect;
        }) => Promise<CoachRow[]>;
      };
    }
  ).taskCoachActivity;
  if (!delegate) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[TheOpenLearn] Prisma client has no taskCoachActivity model. Run `npx prisma generate`, remove `.next`, then `npm run dev`.",
      );
    }
    return [];
  }
  return delegate.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    select: taskCoachActivitySelect,
  });
}

function rowToMember(r: RawRow): CommunityMemberStats {
  return {
    userId: r.id,
    displayName: r.displayName,
    publicBio: r.publicBio,
    xpTotal: Number(r.xpTotal),
    streakDays: Number(r.streakDays),
    createdAt: r.createdAt,
    tasksDone: toNum(r.tasks_done),
    challengeXp: toNum(r.challenge_xp),
    topicBreadth: toNum(r.topic_breadth),
    achCount: toNum(r.ach_count),
    roadmapsDone: toNum(r.roadmaps_done),
  };
}

/**
 * Public learners + aggregate stats (single round-trip).
 */
export async function getPublicCommunityCohort(
  topicClusterFilter?: string | null,
): Promise<CommunityMemberStats[]> {
  const clusterSql = topicClusterFilter
    ? Prisma.sql`AND EXISTS (
        SELECT 1 FROM "LearningIntent" li
        WHERE li."userId" = u.id AND li."topicClusterKey" = ${topicClusterFilter}
      )`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<RawRow[]>`
    WITH completed AS (
      SELECT upt."userId",
        COUNT(*)::int AS tasks_done,
        COALESCE(SUM(rt."xpReward"), 0)::int AS challenge_xp
      FROM "UserTaskProgress" upt
      INNER JOIN "RoadmapTask" rt ON rt.id = upt."taskId"
      WHERE upt.status = 'COMPLETED'
      GROUP BY upt."userId"
    ),
    breadth AS (
      SELECT "userId", COUNT(DISTINCT "topicClusterKey")::int AS topic_breadth
      FROM "LearningIntent"
      GROUP BY "userId"
    ),
    achievements AS (
      SELECT "userId", COUNT(*)::int AS ach_count
      FROM "UserAchievement"
      GROUP BY "userId"
    ),
    finished_maps AS (
      SELECT r."userId", COUNT(*)::int AS roadmaps_done
      FROM "Roadmap" r
      WHERE EXISTS (SELECT 1 FROM "RoadmapPhase" ph WHERE ph."roadmapId" = r.id)
      AND (
        SELECT COUNT(*)::bigint FROM "RoadmapTask" t
        INNER JOIN "RoadmapPhase" ph ON ph.id = t."phaseId"
        WHERE ph."roadmapId" = r.id
      ) > 0
      AND (
        SELECT COUNT(*)::bigint FROM "RoadmapTask" t
        INNER JOIN "RoadmapPhase" ph ON ph.id = t."phaseId"
        WHERE ph."roadmapId" = r.id
      ) = (
        SELECT COUNT(*)::bigint FROM "RoadmapTask" t
        INNER JOIN "RoadmapPhase" ph ON ph.id = t."phaseId"
        INNER JOIN "UserTaskProgress" upt ON upt."taskId" = t.id
          AND upt."userId" = r."userId" AND upt.status = 'COMPLETED'
        WHERE ph."roadmapId" = r.id
      )
      GROUP BY r."userId"
    )
    SELECT
      u.id,
      u."displayName",
      u."publicBio",
      u."xpTotal",
      u."streakDays",
      u."createdAt",
      COALESCE(c.tasks_done, 0) AS tasks_done,
      COALESCE(c.challenge_xp, 0) AS challenge_xp,
      COALESCE(b.topic_breadth, 0) AS topic_breadth,
      COALESCE(a.ach_count, 0) AS ach_count,
      COALESCE(f.roadmaps_done, 0) AS roadmaps_done
    FROM "User" u
    LEFT JOIN completed c ON c."userId" = u.id
    LEFT JOIN breadth b ON b."userId" = u.id
    LEFT JOIN achievements a ON a."userId" = u.id
    LEFT JOIN finished_maps f ON f."userId" = u.id
    WHERE u."profilePublic" = true
    ${clusterSql}
  `;

  return rows.map(rowToMember);
}

export async function getPublicProfileOrNull(
  userId: string,
): Promise<CommunityMemberStats | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePublic: true },
  });
  if (!u?.profilePublic) return null;
  const cohort = await getPublicCommunityCohort();
  return cohort.find((m) => m.userId === userId) ?? null;
}

export type CommunityActivityItem =
  | {
      kind: "task";
      at: Date;
      userId: string;
      displayName: string | null;
      taskTitle: string;
      roadmapTitle: string;
      progressId: string;
      roadmapId: string;
      taskId: string;
      /** Optional public caption; private task notes are never exposed. */
      feedCaption: string | null;
    }
  | {
      kind: "badge";
      at: Date;
      userId: string;
      displayName: string | null;
      badgeTitle: string;
      badgeIcon: string | null;
      userAchievementId: string;
    }
  | {
      kind: "coach";
      at: Date;
      userId: string;
      displayName: string | null;
      taskTitle: string;
      roadmapTitle: string;
      roadmapId: string;
      taskId: string;
      coachActivityId: string;
      /**
       * Only included for the viewer’s own coach rows. Omitted on the public timeline
       * so other learners never see chat content.
       */
      userMessageExcerpt: string | null;
      assistantExcerpt: string | null;
    };

export type CommunityFeedScope = "all" | "following";
export type CommunityFeedKind = "all" | "task" | "badge" | "coach";

/**
 * Activity feed: public learners only. `following` limits to user IDs the viewer follows (intersected with profilePublic).
 */
export async function getCommunityActivityFeed(opts: {
  scope: CommunityFeedScope;
  kind: CommunityFeedKind;
  viewerAppUserId: string | null;
  limit?: number;
}): Promise<CommunityActivityItem[]> {
  const limit = Math.min(opts.limit ?? 28, 40);
  const take = Math.min(limit * 3, 120);

  let followingIds: string[] | undefined;
  if (opts.scope === "following") {
    if (!opts.viewerAppUserId) return [];
    const rows = await prisma.userFollow.findMany({
      where: { followerId: opts.viewerAppUserId },
      select: { followingId: true },
    });
    followingIds = rows.map((r) => r.followingId);
    if (followingIds.length === 0) return [];
  }

  const userWhere = {
    profilePublic: true,
    ...(followingIds?.length
      ? { id: { in: followingIds } }
      : {}),
  };

  const wantTasks = opts.kind === "all" || opts.kind === "task";
  const wantBadges = opts.kind === "all" || opts.kind === "badge";
  const wantCoach = opts.kind === "all" || opts.kind === "coach";

  const [tasks, badges, coachRows] = await Promise.all([
    wantTasks
      ? prisma.userTaskProgress.findMany({
          where: {
            status: "COMPLETED",
            completedAt: { not: null },
            user: userWhere,
          },
          orderBy: { completedAt: "desc" },
          take,
          select: {
            id: true,
            completedAt: true,
            feedCaption: true,
            userId: true,
            user: { select: { displayName: true } },
            task: {
              select: {
                id: true,
                title: true,
                phase: {
                  select: {
                    roadmap: { select: { id: true, title: true } },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    wantBadges
      ? prisma.userAchievement.findMany({
          where: { user: userWhere },
          orderBy: { earnedAt: "desc" },
          take,
          select: {
            id: true,
            earnedAt: true,
            userId: true,
            user: { select: { displayName: true } },
            achievement: { select: { title: true, icon: true } },
          },
        })
      : Promise.resolve([]),
    wantCoach
      ? findTaskCoachActivities({ user: userWhere }, take)
      : Promise.resolve([]),
  ]);

  const publicItems = [
    ...rowsToActivityItems(tasks, badges),
    ...coachRowsToActivityItems(coachRows, false),
  ];

  /** Viewer always sees their own completions/badges here, even with a private profile. */
  let viewerItems: CommunityActivityItem[] = [];
  if (opts.viewerAppUserId) {
    viewerItems = await fetchActivityItemsForSingleUser({
      userId: opts.viewerAppUserId,
      kind: opts.kind,
      take,
    });
  }

  return mergeActivityItemsByRecency(viewerItems, publicItems, limit);
}

function rowsToActivityItems(
  tasks: {
    id: string;
    completedAt: Date | null;
    feedCaption: string | null;
    userId: string;
    user: { displayName: string | null };
    task: {
      id: string;
      title: string;
      phase: { roadmap: { id: string; title: string } };
    };
  }[],
  badges: {
    id: string;
    earnedAt: Date;
    userId: string;
    user: { displayName: string | null };
    achievement: { title: string; icon: string | null };
  }[],
): CommunityActivityItem[] {
  return [
    ...tasks
      .filter((row) => row.completedAt != null)
      .map((row) => ({
        kind: "task" as const,
        at: row.completedAt as Date,
        userId: row.userId,
        displayName: row.user.displayName,
        taskTitle: row.task.title,
        roadmapTitle: row.task.phase.roadmap.title,
        progressId: row.id,
        roadmapId: row.task.phase.roadmap.id,
        taskId: row.task.id,
        feedCaption: row.feedCaption?.trim() ? row.feedCaption.trim() : null,
      })),
    ...badges.map((row) => ({
      kind: "badge" as const,
      at: row.earnedAt,
      userId: row.userId,
      displayName: row.user.displayName,
      badgeTitle: row.achievement.title,
      badgeIcon: row.achievement.icon,
      userAchievementId: row.id,
    })),
  ];
}

function coachRowsToActivityItems(
  rows: CoachRow[],
  includeExcerpts: boolean,
): CommunityActivityItem[] {
  return rows.map((row) => ({
    kind: "coach" as const,
    at: row.createdAt,
    userId: row.userId,
    displayName: row.user.displayName,
    taskTitle: row.task.title,
    roadmapTitle: row.task.phase.roadmap.title,
    roadmapId: row.roadmapId,
    taskId: row.task.id,
    coachActivityId: row.id,
    userMessageExcerpt:
      includeExcerpts && row.userMessageExcerpt.trim()
        ? row.userMessageExcerpt.trim()
        : null,
    assistantExcerpt:
      includeExcerpts && row.assistantExcerpt.trim()
        ? row.assistantExcerpt.trim()
        : null,
  }));
}

async function fetchActivityItemsForSingleUser(opts: {
  userId: string;
  kind: CommunityFeedKind;
  take: number;
}): Promise<CommunityActivityItem[]> {
  const wantTasks = opts.kind === "all" || opts.kind === "task";
  const wantBadges = opts.kind === "all" || opts.kind === "badge";
  const wantCoach = opts.kind === "all" || opts.kind === "coach";

  const [tasks, badges, coachRows] = await Promise.all([
    wantTasks
      ? prisma.userTaskProgress.findMany({
          where: {
            userId: opts.userId,
            status: "COMPLETED",
            completedAt: { not: null },
          },
          orderBy: { completedAt: "desc" },
          take: opts.take,
          select: {
            id: true,
            completedAt: true,
            feedCaption: true,
            userId: true,
            user: { select: { displayName: true } },
            task: {
              select: {
                id: true,
                title: true,
                phase: {
                  select: {
                    roadmap: { select: { id: true, title: true } },
                  },
                },
              },
            },
          },
        })
      : Promise.resolve([]),
    wantBadges
      ? prisma.userAchievement.findMany({
          where: { userId: opts.userId },
          orderBy: { earnedAt: "desc" },
          take: opts.take,
          select: {
            id: true,
            earnedAt: true,
            userId: true,
            user: { select: { displayName: true } },
            achievement: { select: { title: true, icon: true } },
          },
        })
      : Promise.resolve([]),
    wantCoach
      ? findTaskCoachActivities({ userId: opts.userId }, opts.take)
      : Promise.resolve([]),
  ]);

  return [
    ...rowsToActivityItems(tasks, badges),
    ...coachRowsToActivityItems(coachRows, true),
  ];
}

function itemDedupeKey(item: CommunityActivityItem): string {
  if (item.kind === "task") return `task:${item.progressId}`;
  if (item.kind === "badge") return `badge:${item.userAchievementId}`;
  return `coach:${item.coachActivityId}`;
}

/** Merges lists; primary rows win on duplicate keys so display names stay consistent. */
function mergeActivityItemsByRecency(
  primary: CommunityActivityItem[],
  secondary: CommunityActivityItem[],
  limit: number,
): CommunityActivityItem[] {
  const seen = new Set<string>();
  const out: CommunityActivityItem[] = [];
  for (const item of primary) {
    const k = itemDedupeKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  for (const item of secondary) {
    const k = itemDedupeKey(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  out.sort((a, b) => b.at.getTime() - a.at.getTime());
  return out.slice(0, limit);
}

/** @deprecated Prefer getCommunityActivityFeed */
export async function getPublicCommunityActivity(
  limit = 20,
): Promise<CommunityActivityItem[]> {
  return getCommunityActivityFeed({
    scope: "all",
    kind: "all",
    viewerAppUserId: null,
    limit,
  });
}

export function formatCommunityRelativeTime(date: Date, locale: string): string {
  const loc = locale === "sr" ? "sr-Latn-RS" : locale;
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHr = Math.round(diffSec / 3600);
  if (Math.abs(diffHr) < 24) return rtf.format(diffHr, "hour");
  const diffDay = Math.round(diffSec / 86400);
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, "day");
  const diffWeek = Math.round(diffSec / 604800);
  if (Math.abs(diffWeek) < 5) return rtf.format(diffWeek, "week");
  return rtf.format(Math.round(diffSec / 2592000), "month");
}
