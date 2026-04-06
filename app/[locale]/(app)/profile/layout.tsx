import { getTranslations } from "next-intl/server";
import { ProfileSubnav } from "@/components/profile/profile-subnav";

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Profile" });

  return (
    <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
      <ProfileSubnav
        ariaLabel={t("subnavAria")}
        labels={{
          overview: t("navOverview"),
          account: t("navAccount"),
          handbooks: t("navHandbooks"),
          achievements: t("navAchievements"),
        }}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
