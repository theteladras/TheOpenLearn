import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Old URL; community visibility lives under Profile → Account. */
export default async function CommunitySettingsRedirect({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/profile/settings#visibility", locale });
}
