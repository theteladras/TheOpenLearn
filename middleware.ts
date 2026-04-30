import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { withGeoBiasedAcceptLanguage } from "@/lib/i18n-middleware-request";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

/** Must skip next-intl (locale redirects) so load balancers get a stable 200. */
const LB_HEALTH_PATHS = new Set(["/api/health", "/healthz"]);

export default clerkMiddleware(async (_auth, req) => {
  if (LB_HEALTH_PATHS.has(req.nextUrl.pathname)) {
    return NextResponse.next();
  }
  return intlMiddleware(withGeoBiasedAcceptLanguage(req));
});

export const config = {
  matcher: [
    "/",
    "/(en|de|fr|es|ru|sr|tr)/:path*",
    "/((?!_next|_vercel|api/health|healthz|.*\\..*).*)",
  ],
};
