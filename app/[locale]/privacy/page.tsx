import type { Metadata } from "next";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { getLegalDoc } from "@/lib/legal-doc";
import { routing } from "@/i18n/routing";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: "Legal" });
  return {
    title: t("privacy.metaTitle"),
    description: t("privacy.metaDescription"),
  };
}

export default async function PrivacyPage(props: Props) {
  const { locale } = await props.params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);
  const doc = getLegalDoc(await getMessages(), "privacy");
  if (!doc) notFound();

  const t = await getTranslations({ locale, namespace: "Legal" });

  return (
    <LegalPageShell locale={locale}>
      <article className="text-[var(--foreground)]">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {doc.title}
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)]">{doc.updated}</p>
        <p className="mt-8 text-base leading-relaxed">{doc.intro}</p>
        <div className="mt-10 space-y-10">
          {doc.sections.map((s, idx) => (
            <section key={idx}>
              <h2 className="text-lg font-semibold">{s.title}</h2>
              <div className="mt-3 space-y-3">
                {s.body.split("\n\n").map((paragraph, pIdx) => (
                  <p
                    key={pIdx}
                    className="text-base leading-relaxed text-[var(--muted)]"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-12 text-sm italic text-[var(--muted)]">
          {t("notLegalAdvice")}
        </p>
        <nav
          className="mt-10 border-t border-[var(--border)] pt-8"
          aria-label={t("relatedPages")}
        >
          <Link
            href="/terms"
            className="text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline"
          >
            {t("seeTerms")}
          </Link>
        </nav>
      </article>
    </LegalPageShell>
  );
}
