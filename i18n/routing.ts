import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "de", "fr", "es", "ru", "sr", "tr"],
  defaultLocale: "en",
  localePrefix: "as-needed",
});
