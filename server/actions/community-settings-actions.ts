"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

const schema = z.object({
  profilePublic: z.boolean(),
  publicBio: z.string().max(280).optional(),
});

export async function updateCommunityProfile(raw: z.infer<typeof schema>): Promise<
  { ok: true } | { ok: false; error: string }
> {
  try {
    const user = await getOrCreateAppUser();
    const input = schema.parse(raw);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        profilePublic: input.profilePublic,
        publicBio: input.publicBio?.trim() || null,
      },
    });
    revalidatePath("/dashboard");
    for (const loc of routing.locales) {
      const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
      revalidatePath(`${prefix}/settings`);
      revalidatePath(`${prefix}/settings/community`);
      revalidatePath(`${prefix}/profile`);
      revalidatePath(`${prefix}/profile/account`);
      revalidatePath(`${prefix}/profile/settings`);
      revalidatePath(`${prefix}/community`);
      revalidatePath(`${prefix}/activities`);
      revalidatePath(`${prefix}/rankings`);
      revalidatePath(`${prefix}/feed`);
      revalidatePath(`${prefix}/community/u/${user.id}`);
      revalidatePath(`${prefix}/community/u/${user.id}/followers`);
      revalidatePath(`${prefix}/community/u/${user.id}/following`);
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Could not save settings.",
    };
  }
}
