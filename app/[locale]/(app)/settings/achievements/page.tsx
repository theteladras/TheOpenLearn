import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Legacy URL. */
export default async function SettingsAchievementsRedirect({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/profile/achievements", locale });
}
