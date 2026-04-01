import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Always resolve Prisma from node_modules so `prisma generate` is picked up after
  // schema changes (avoids a bundled copy with stale RoadmapTask fields).
  serverExternalPackages: ["@prisma/client"],
};

export default withNextIntl(nextConfig);
