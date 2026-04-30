#!/bin/sh
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[docker-entrypoint] ERROR: DATABASE_URL is not set. Migrations and the app need it." >&2
  exit 1
fi

# Avoid hanging forever on unreachable DB (Railway healthcheck waits on TCP/HTTP).
case "$DATABASE_URL" in
  *connect_timeout=*) ;;
  *\?*) DATABASE_URL="${DATABASE_URL}&connect_timeout=20" ;;
  *) DATABASE_URL="${DATABASE_URL}?connect_timeout=20" ;;
esac
export DATABASE_URL

if ! ls prisma/migrations/*/migration.sql >/dev/null 2>&1; then
  echo "[docker-entrypoint] ERROR: No prisma/migrations/*/migration.sql found." >&2
  exit 1
fi

echo "[docker-entrypoint] prisma migrate deploy..."
prisma migrate deploy --schema prisma/schema.prisma

echo "[docker-entrypoint] starting app..."
exec "$@"
