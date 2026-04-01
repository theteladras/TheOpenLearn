import { auth } from "@clerk/nextjs/server";
import { redirect } from "@/i18n/navigation";
import { LandingPage } from "@/features/landing/landing-page";

type Props = { params: Promise<{ locale: string }> };

export default async function HomePage({ params }: Props) {
  const { userId } = await auth();
  const { locale } = await params;

  if (userId) {
    redirect({ href: "/dashboard", locale });
  }

  return <LandingPage />;
}
