import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Legacy URL: account lives under profile. */
export default async function SettingsRedirect({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/profile/account", locale });
}
