import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Old URL; community visibility now lives on Settings. */
export default async function CommunitySettingsRedirect({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/settings#visibility", locale });
}
