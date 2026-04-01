import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { DocumentLang } from "@/components/document-lang";
import { routing } from "@/i18n/routing";
import { SplashScreen } from "@/components/splash-screen";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <>
      <DocumentLang locale={locale} />
      <ClerkProvider>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SplashScreen />
          {children}
          <Toaster richColors position="top-center" />
        </NextIntlClientProvider>
      </ClerkProvider>
    </>
  );
}
