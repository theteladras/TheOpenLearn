import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Legacy URL → settings. */
export default async function ProfileAccountRedirect({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/profile/settings", locale });
}
