import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import type { User } from "@prisma/client";
import { COIN_INITIAL_BALANCE } from "@/lib/coin-economy";
import { ensureMonthlyCoinsForFreeUser } from "@/lib/monthly-coins";
import { generateUniqueReferralCode } from "@/lib/referral-code";

export async function requireAuthUserId(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHORIZED");
  }
  return userId;
}

/** App user id if signed in, without creating a row (safe for public pages). */
export async function getOptionalAppUserId(): Promise<string | null> {
  const { userId: clerkId } = await auth();
  if (!clerkId) return null;
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { id: true },
  });
  return user?.id ?? null;
}

function proEmailList(): string[] {
  const raw = process.env.PRO_LEARNER_EMAILS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export async function getOrCreateAppUser(): Promise<User> {
  const clerkId = await requireAuthUserId();
  const clerkUser = await currentUser();
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? null;
  const displayName =
    clerkUser?.fullName ?? clerkUser?.username ?? email ?? "Learner";

  let user = await prisma.user.upsert({
    where: { clerkId },
    create: {
      clerkId,
      email,
      displayName,
      lastActiveAt: new Date(),
      coins: COIN_INITIAL_BALANCE,
    },
    update: {
      email: email ?? undefined,
      displayName,
      lastActiveAt: new Date(),
    },
  });

  const proEmails = proEmailList();
  if (email && proEmails.includes(email.toLowerCase()) && user.plan !== "PRO") {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { plan: "PRO" },
    });
  }

  if (!user.referralCode) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { referralCode: await generateUniqueReferralCode() },
    });
  }

  if (user.plan === "FREE") {
    await ensureMonthlyCoinsForFreeUser(user.id, user.lastMonthlyCoinPeriod);
    user = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  }

  return user;
}
