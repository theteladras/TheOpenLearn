import { getRequestConfig } from "next-intl/server";
import { mergeMessages } from "@/lib/merge-messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  const en = (await import("../messages/en.json")).default;
  if (locale === routing.defaultLocale) {
    return { locale, messages: en };
  }

  const localized = (await import(`../messages/${locale}.json`)).default;
  return {
    locale,
    messages: mergeMessages(en, localized),
  };
});
