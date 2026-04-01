"use server";

import { revalidatePath } from "next/cache";
import { COIN_REFERRAL } from "@/lib/coin-economy";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { prisma } from "@/lib/db";
import { routing } from "@/i18n/routing";

export async function applyReferralCode(
  rawCode: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await getOrCreateAppUser();
    if (user.referredByUserId) {
      return { ok: false, error: "ALREADY_REFERRED" };
    }
    const code = rawCode.trim().toUpperCase();
    if (code.length < 4) {
      return { ok: false, error: "INVALID_CODE" };
    }
    const referrer = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!referrer || referrer.id === user.id) {
      return { ok: false, error: "INVALID_CODE" };
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { referredByUserId: referrer.id },
      }),
      prisma.user.update({
        where: { id: referrer.id },
        data: { coins: { increment: COIN_REFERRAL } },
      }),
    ]);

    for (const loc of routing.locales) {
      const prefix = loc === routing.defaultLocale ? "" : `/${loc}`;
      revalidatePath(`${prefix}/dashboard`);
      revalidatePath(`${prefix}/dashboard/wallet`);
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "UNKNOWN" };
  }
}
