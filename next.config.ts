import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  // Always resolve Prisma from node_modules so `prisma generate` is picked up after
  // schema changes (avoids a bundled copy with stale RoadmapTask fields).
  serverExternalPackages: ["@prisma/client"],
  // Ensure Prisma engines and schema are traced into `.next/standalone` for Docker.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/.prisma/**/*", "./prisma/**/*"],
  },
};

export default withNextIntl(nextConfig);
