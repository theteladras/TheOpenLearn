"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

const schema = z.object({ targetUserId: z.string().min(1) });

function revalidateFollowPaths(profileUserId: string, viewerId: string) {
  for (const loc of routing.locales) {
    const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
    revalidatePath(`${prefix}/activities`);
    revalidatePath(`${prefix}/rankings`);
    revalidatePath(`${prefix}/feed`);
    revalidatePath(`${prefix}/community/u/${profileUserId}`);
    revalidatePath(`${prefix}/community/u/${profileUserId}/followers`);
    revalidatePath(`${prefix}/community/u/${profileUserId}/following`);
    revalidatePath(`${prefix}/community/u/${viewerId}`);
    revalidatePath(`${prefix}/community/u/${viewerId}/followers`);
    revalidatePath(`${prefix}/community/u/${viewerId}/following`);
  }
}

export async function toggleFollow(
  raw: z.infer<typeof schema>,
): Promise<
  { ok: true; following: boolean } | { ok: false; error: string }
> {
  try {
    const viewer = await getOrCreateAppUser();
    const { targetUserId } = schema.parse(raw);

    if (viewer.id === targetUserId) {
      return { ok: false, error: "Cannot follow yourself." };
    }

    const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { profilePublic: true },
    });
    if (!target?.profilePublic) {
      return { ok: false, error: "Profile is not public." };
    }

    const existing = await prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewer.id,
          followingId: targetUserId,
        },
      },
    });

    if (existing) {
      await prisma.userFollow.delete({ where: { id: existing.id } });
      revalidateFollowPaths(targetUserId, viewer.id);
      return { ok: true, following: false };
    }

    await prisma.userFollow.create({
      data: {
        followerId: viewer.id,
        followingId: targetUserId,
      },
    });
    revalidateFollowPaths(targetUserId, viewer.id);
    return { ok: true, following: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not update follow.",
    };
  }
}
