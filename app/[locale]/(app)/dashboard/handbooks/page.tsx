import { redirect } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Handbooks library moved under Profile. */
export default async function DashboardHandbooksRedirect({ params }: Props) {
  const { locale } = await params;
  redirect({ href: "/profile/handbooks", locale });
}
