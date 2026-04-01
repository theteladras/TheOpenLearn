import { prisma } from "@/lib/db";
import { COIN_MONTHLY_GRANT, currentCalendarPeriod } from "@/lib/coin-economy";

/** FREE users: initialize period without grant, or +30 when a new calendar month starts. */
export async function ensureMonthlyCoinsForFreeUser(
  userId: string,
  lastPeriod: number | null,
): Promise<void> {
  const period = currentCalendarPeriod();
  if (lastPeriod === null) {
    await prisma.user.update({
      where: { id: userId },
      data: { lastMonthlyCoinPeriod: period },
    });
    return;
  }
  if (lastPeriod < period) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        coins: { increment: COIN_MONTHLY_GRANT },
        lastMonthlyCoinPeriod: period,
      },
    });
  }
}
