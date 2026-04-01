import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

export async function generateUniqueReferralCode(): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = randomBytes(4).toString("hex").toUpperCase();
    const taken = await prisma.user.findFirst({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!taken) return code;
  }
  throw new Error("REFERRAL_CODE_EXHAUSTED");
}
