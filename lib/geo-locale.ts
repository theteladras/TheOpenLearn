import { routing } from "@/i18n/routing";

type AppLocale = (typeof routing.locales)[number];

/** ISO 3166-1 alpha-2 → supported app locale when the mapping is unambiguous. */
const COUNTRY_TO_LOCALE: Record<string, AppLocale> = {
  DE: "de",
  AT: "de",
  CH: "de",
  LI: "de",
  FR: "fr",
  MC: "fr",
  ES: "es",
  AD: "es",
  MX: "es",
  AR: "es",
  CO: "es",
  PE: "es",
  CL: "es",
  EC: "es",
  GT: "es",
  UY: "es",
  PY: "es",
  BO: "es",
  CR: "es",
  PA: "es",
  DO: "es",
  HN: "es",
  NI: "es",
  SV: "es",
  RS: "sr",
  BA: "sr",
  ME: "sr",
  RU: "ru",
  BY: "ru",
  KZ: "ru",
  TR: "tr",
};

/**
 * Map a GeoIP country code to one of the app locales, or undefined to fall back
 * to normal Accept-Language / default handling.
 */
export function countryCodeToAppLocale(
  country: string | null | undefined,
): AppLocale | undefined {
  if (!country) return undefined;
  const code = country.trim().toUpperCase();
  return COUNTRY_TO_LOCALE[code];
}
