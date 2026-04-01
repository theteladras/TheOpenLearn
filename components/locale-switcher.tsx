"use client";

import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Display flags for app locales (same order/codes as `routing.locales`). */
export const LOCALE_FLAGS: Record<string, string> = {
  en: "🇬🇧",
  de: "🇩🇪",
  fr: "🇫🇷",
  es: "🇪🇸",
  ru: "🇷🇺",
  sr: "🇷🇸",
  tr: "🇹🇷",
};

export function LocaleSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("Locale");

  return (
    <Select
      value={locale}
      onValueChange={(next) => {
        if (next !== locale) router.replace(pathname, { locale: next });
      }}
    >
      <SelectTrigger
        aria-label={t("groupLabel")}
        className={cn(
          "h-9 w-auto max-w-[11rem] shrink-0 gap-1.5 rounded-full border border-[var(--border)]/70 bg-[var(--card)]/65 px-2.5 py-0 text-sm shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_4px_16px_-8px_rgba(109,77,243,0.2)] backdrop-blur-md focus:ring-[var(--accent)] dark:border-[var(--border)]/55 dark:bg-[var(--card)]/40 dark:shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_6px_20px_-10px_rgba(0,0,0,0.5)] [&>svg]:h-3.5 [&>svg]:w-3.5 [&>svg]:shrink-0 [&>svg]:opacity-70",
          className,
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end" position="popper" className="min-w-[10rem]">
        {routing.locales.map((loc) => (
          <SelectItem
            key={loc}
            value={loc}
            className="cursor-pointer py-2 pl-8 text-sm"
            textValue={t(`${loc}Name`)}
          >
            <span className="whitespace-nowrap">
              <span aria-hidden className="mr-1.5 text-base leading-none">
                {LOCALE_FLAGS[loc] ?? loc.toUpperCase()}
              </span>
              {t(`${loc}Name`)}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
