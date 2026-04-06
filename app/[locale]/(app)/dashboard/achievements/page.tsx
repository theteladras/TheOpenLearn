import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Previous route; settings is the home for account-adjacent pages including badges. */
export default async function LegacyAchievementsRedirect({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/profile/achievements", locale });
}
