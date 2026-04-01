import { clerkMiddleware } from "@clerk/nextjs/server";
import createMiddleware from "next-intl/middleware";
import { withGeoBiasedAcceptLanguage } from "@/lib/i18n-middleware-request";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default clerkMiddleware(async (_auth, req) =>
  intlMiddleware(withGeoBiasedAcceptLanguage(req)),
);

export const config = {
  matcher: [
    "/",
    "/(en|de|fr|es|ru|sr|tr)/:path*",
    "/((?!_next|_vercel|.*\\..*).*)",
  ],
};
