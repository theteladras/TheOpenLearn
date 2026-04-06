"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { googleSearchUrl, wikipediaSearchUrl } from "@/lib/lookup-urls";

type Props = {
  terms: string[];
};

export function TaskKeywordLinks({ terms }: Props) {
  const t = useTranslations("Task");
  const locale = useLocale();

  const cleaned = terms.map((s) => s.trim()).filter(Boolean);
  if (cleaned.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("keywordsTitle")}</CardTitle>
        <p className="text-xs font-normal leading-relaxed text-[var(--muted)]">
          {t("keywordsHint")}
        </p>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2.5 text-sm">
          {cleaned.map((term) => (
            <li
              key={term}
              className="flex flex-col gap-1.5 rounded-lg border border-[var(--border)]/80 bg-[var(--card)] px-3 py-2"
            >
              <span className="font-medium text-[var(--foreground)] leading-snug">
                {term}
              </span>
              <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                <a
                  href={wikipediaSearchUrl(locale, term)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  {t("keywordLinkWikipedia")}
                </a>
                <a
                  href={googleSearchUrl(term, locale.slice(0, 2))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--muted)] underline-offset-2 hover:text-[var(--foreground)] hover:underline"
                >
                  {t("keywordLinkGoogle")}
                </a>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
