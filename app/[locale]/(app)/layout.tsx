import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AppHeader } from "@/components/app/app-header";
import { getOrCreateAppUser } from "@/lib/auth-user";

export default async function AppLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { userId } = await auth();
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const tAct = await getTranslations({ locale, namespace: "Activities" });
  const tRank = await getTranslations({ locale, namespace: "Rankings" });
  const tProfile = await getTranslations({ locale, namespace: "Profile" });

  if (!userId) {
    redirect({ href: "/sign-in", locale });
  }

  const user = await getOrCreateAppUser();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <AppHeader
        plan={user.plan}
        coins={user.coins}
        labels={{
          dashboard: t("title"),
          activities: tAct("navTitle"),
          rankings: tRank("navTitle"),
          profile: tProfile("navTitle"),
          menu: t("navMenu"),
          menuTitle: t("navMenuTitle"),
          openWallet: t("openWalletAria"),
        }}
      />
      <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
    </div>
  );
}
