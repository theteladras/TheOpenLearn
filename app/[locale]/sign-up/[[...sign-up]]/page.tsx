import { SignUp } from "@clerk/nextjs";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  return { title: t("signUp") };
}

export default async function SignUpPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Auth" });
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return (
    <div className="flex min-h-screen flex-col bg-[var(--background)]">
      <div className="flex justify-end p-4">
        <Link
          href="/"
          className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          ← TheOpenLearn
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-20">
        <h1 className="mb-8 text-2xl font-semibold">{t("signUp")}</h1>
        <SignUp
          routing="path"
          path={`${prefix}/sign-up`}
          signInUrl={`${prefix}/sign-in`}
        />
      </div>
    </div>
  );
}
