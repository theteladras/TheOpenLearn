import { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { countryCodeToAppLocale } from "@/lib/geo-locale";

function pathnameStartsWithLocale(pathname: string): boolean {
  const first = pathname.split("/").filter(Boolean)[0];
  return (
    !!first &&
    routing.locales.includes(first as (typeof routing.locales)[number])
  );
}

/**
 * For visitors without a stored locale preference, bias negotiation toward the
 * locale implied by GeoIP (Vercel / Cloudflare) so the landing experience matches
 * their region. Logged-in/app traffic still respects NEXT_LOCALE after the first switch.
 */
export function withGeoBiasedAcceptLanguage(request: NextRequest): NextRequest {
  if (pathnameStartsWithLocale(request.nextUrl.pathname)) {
    return request;
  }

  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (
    cookie &&
    routing.locales.includes(cookie as (typeof routing.locales)[number])
  ) {
    return request;
  }

  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry");
  const geoLocale = countryCodeToAppLocale(country);
  if (!geoLocale) {
    return request;
  }

  const headers = new Headers(request.headers);
  const existing = headers.get("accept-language");
  headers.set(
    "accept-language",
    `${geoLocale},${existing ?? "en;q=0.8"}`,
  );
  return new NextRequest(request.url, { headers });
}
