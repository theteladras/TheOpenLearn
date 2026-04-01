import { readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  /** Changes when `prisma generate` runs (see node_modules/.prisma/client/package.json `name`). */
  prismaClientFingerprint?: string;
};

/** Fingerprint the generated client so dev HMR does not keep a stale PrismaClient shape. */
function prismaClientFingerprint(): string {
  try {
    const pkgPath = path.join(
      process.cwd(),
      "node_modules/.prisma/client/package.json",
    );
    const p = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
    return p.name ?? "";
  } catch {
    return "";
  }
}

function buildClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

const fp = prismaClientFingerprint();
const needNewClient =
  process.env.NODE_ENV !== "production" &&
  globalForPrisma.prismaClientFingerprint !== fp;

export const prisma =
  needNewClient || !globalForPrisma.prisma ? buildClient() : globalForPrisma.prisma;

if (process.env.NODE_ENV !== "production") {
  if (needNewClient && globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect();
  }
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaClientFingerprint = fp;
}
