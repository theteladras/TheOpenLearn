import { prisma } from "@/lib/db";

export type FollowSocialContext = {
  followerCount: number;
  followingCount: number;
  viewerIsFollowing: boolean;
  viewerIsFollowedBy: boolean;
};

export async function getFollowSocialContext(
  profileUserId: string,
  viewerAppUserId: string | null,
): Promise<FollowSocialContext> {
  const isSelf = viewerAppUserId === profileUserId;
  const [followerCount, followingCount, viewerFollowRow, reverseFollowRow] =
    await Promise.all([
      prisma.userFollow.count({ where: { followingId: profileUserId } }),
      prisma.userFollow.count({ where: { followerId: profileUserId } }),
      !isSelf && viewerAppUserId
        ? prisma.userFollow.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerAppUserId,
                followingId: profileUserId,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
      !isSelf && viewerAppUserId
        ? prisma.userFollow.findUnique({
            where: {
              followerId_followingId: {
                followerId: profileUserId,
                followingId: viewerAppUserId,
              },
            },
            select: { id: true },
          })
        : Promise.resolve(null),
    ]);

  return {
    followerCount,
    followingCount,
    viewerIsFollowing: Boolean(viewerFollowRow),
    viewerIsFollowedBy: Boolean(reverseFollowRow),
  };
}

export type FollowListEntry = {
  userId: string;
  displayName: string | null;
  profilePublic: boolean;
};

export async function getFollowersList(
  profileUserId: string,
): Promise<FollowListEntry[]> {
  const rows = await prisma.userFollow.findMany({
    where: { followingId: profileUserId },
    orderBy: { createdAt: "desc" },
    select: {
      follower: {
        select: { id: true, displayName: true, profilePublic: true },
      },
    },
  });
  return rows.map((r) => ({
    userId: r.follower.id,
    displayName: r.follower.displayName,
    profilePublic: r.follower.profilePublic,
  }));
}

export async function getFollowingList(
  profileUserId: string,
): Promise<FollowListEntry[]> {
  const rows = await prisma.userFollow.findMany({
    where: { followerId: profileUserId },
    orderBy: { createdAt: "desc" },
    select: {
      following: {
        select: { id: true, displayName: true, profilePublic: true },
      },
    },
  });
  return rows.map((r) => ({
    userId: r.following.id,
    displayName: r.following.displayName,
    profilePublic: r.following.profilePublic,
  }));
}
