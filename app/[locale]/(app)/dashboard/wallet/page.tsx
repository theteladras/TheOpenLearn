import { getTranslations } from "next-intl/server";
import { Coins } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReferralCard } from "@/features/dashboard/referral-card";
import { getOrCreateAppUser } from "@/lib/auth-user";
import { skipsCoinEconomy } from "@/lib/coin-economy";

type Props = { params: Promise<{ locale: string }> };

export default async function WalletPage({ params }: Props) {
  const { locale } = await params;
  const user = await getOrCreateAppUser();
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const pro = skipsCoinEconomy(user.plan);

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <p className="text-sm text-[var(--muted)]">
        <Link
          href="/dashboard"
          className="font-medium text-violet-600 hover:underline dark:text-violet-300"
        >
          {t("walletBack")}
        </Link>
      </p>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("walletPageTitle")}
        </h1>
        <p className="mt-2 text-pretty text-[var(--muted)]">
          {t("walletPageIntro")}
        </p>
      </div>

      {pro ? (
        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/8 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("walletProTitle")}</CardTitle>
            <CardDescription>{t("walletProBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/8 to-transparent">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Coins
                className="h-4 w-4 text-amber-700 dark:text-amber-300"
                aria-hidden
              />
              {t("walletBalance")}
            </CardTitle>
            <p className="text-3xl font-semibold tabular-nums text-amber-950 dark:text-amber-100">
              {user.coins}
            </p>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <p className="text-sm font-medium text-[var(--foreground)]">
              {t("walletHowTitle")}
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-[var(--muted)]">
              <li>{t("walletBullet1")}</li>
              <li>{t("walletBullet2")}</li>
              <li>{t("walletBullet3")}</li>
              <li>{t("walletBullet4")}</li>
            </ul>
          </CardContent>
        </Card>
      )}

      <ReferralCard
        referredByUserId={user.referredByUserId}
        myCode={user.referralCode}
      />
    </div>
  );
}
