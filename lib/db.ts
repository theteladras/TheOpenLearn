import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

if (process.env.NODE_ENV === "development" && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env.local, set DATABASE_URL (and Clerk keys), then restart `next dev`. For Postgres locally: `npm run docker:up` then `npm run db:push`.",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaClientFingerprint?: string;
};

/** Fingerprint the generated client + schema so dev can pick up `prisma generate` without restarting. */
function prismaClientFingerprint(): string {
  try {
    const pkgPath = path.join(
      process.cwd(),
      "node_modules/.prisma/client/package.json",
    );
    const p = JSON.parse(readFileSync(pkgPath, "utf8")) as { name?: string };
    const schemaPath = path.join(process.cwd(), "prisma/schema.prisma");
    const clientIdx = path.join(
      process.cwd(),
      "node_modules/.prisma/client/index.js",
    );
    const schemaSt = statSync(schemaPath);
    const clientSt = statSync(clientIdx);
    return `${p.name ?? ""}:${schemaSt.mtimeMs}:${schemaSt.size}:${clientSt.mtimeMs}:${clientSt.size}`;
  } catch {
    return String(Date.now());
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

/** In dev, replaced when schema / generated client changes. */
let devClient: PrismaClient | null = null;
let devFingerprint = "";

function getOrCreatePrisma(): PrismaClient {
  if (process.env.NODE_ENV === "production") {
    globalForPrisma.prisma ??= buildClient();
    return globalForPrisma.prisma;
  }

  const fp = prismaClientFingerprint();
  if (devClient && devFingerprint === fp) {
    return devClient;
  }

  if (devClient) {
    void devClient.$disconnect();
  }

  devClient = buildClient();
  devFingerprint = fp;
  globalForPrisma.prisma = devClient;
  globalForPrisma.prismaClientFingerprint = fp;
  return devClient;
}

/**
 * Lazy Prisma instance: in development, each access checks whether `prisma generate`
 * produced a new client shape (avoids `undefined` delegates until full dev restart).
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getOrCreatePrisma();
    const value: unknown = Reflect.get(client, prop, client);
    if (typeof value === "function") {
      return (value as (...args: unknown[]) => unknown).bind(client);
    }
    return value;
  },
});
