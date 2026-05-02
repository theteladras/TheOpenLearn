import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Canonical settings UI lives under Profile → Account (`/profile/settings`). */
export default async function SettingsRedirect({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/profile/settings", locale });
}
