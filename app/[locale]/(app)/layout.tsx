import { auth } from "@clerk/nextjs/server";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
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
      <AppSidebar
        plan={user.plan}
        coins={user.coins}
        xpTotal={user.xpTotal}
        labels={{
          dashboard: t("title"),
          newLearning: t("newRoadmap"),
          activities: tAct("navTitle"),
          rankings: tRank("navTitle"),
          achievements: tProfile("navAchievements"),
          menu: t("navMenu"),
          menuTitle: t("navMenuTitle"),
          openWallet: t("openWalletAria"),
          walletBalance: t("walletBalance"),
        }}
      />
      <div className="min-h-screen lg:pl-64">
        <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
