/**
 * Map app locale (BCP-47) to Wikipedia subdomain for search links.
 */
const LOCALE_TO_WIKI: Record<string, string> = {
  en: "en",
  de: "de",
  fr: "fr",
  es: "es",
  tr: "tr",
  ru: "ru",
  sr: "sr",
};

export function wikipediaSearchUrl(locale: string, query: string): string {
  const sub = LOCALE_TO_WIKI[locale] ?? "en";
  const q = encodeURIComponent(query.trim());
  return `https://${sub}.wikipedia.org/wiki/Special:Search?search=${q}`;
}

export function googleSearchUrl(query: string, hl?: string): string {
  const q = encodeURIComponent(query.trim());
  const lang = hl && hl.length === 2 ? `&hl=${encodeURIComponent(hl)}` : "";
  return `https://www.google.com/search?q=${q}${lang}`;
}
