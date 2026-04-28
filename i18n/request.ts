import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { mergeMessages, type MessageTree } from "@/lib/merge-messages";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as (typeof routing.locales)[number])) {
    locale = routing.defaultLocale;
  }

  const en = (await import("../messages/en.json")).default as MessageTree;
  if (locale === routing.defaultLocale) {
    return { locale, messages: en as AbstractIntlMessages };
  }

  const localized = (await import(`../messages/${locale}.json`)).default as MessageTree;
  return {
    locale,
    messages: mergeMessages(en, localized),
  };
});
