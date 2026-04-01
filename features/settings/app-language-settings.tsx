"use client";

import { useTranslations } from "next-intl";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function AppLanguageSettings() {
  const t = useTranslations("Settings");
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--muted)]">{t("languageHint")}</p>
      <LocaleSwitcher className="sm:max-w-[12rem]" />
    </div>
  );
}
