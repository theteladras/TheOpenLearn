#!/bin/sh
set -eu

echo "[docker-entrypoint] boot $(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[docker-entrypoint] ERROR: DATABASE_URL is not set." >&2
  exit 1
fi

# Prefer failing fast on bad DB URLs (libpq / Prisma).
case "$DATABASE_URL" in
  *connect_timeout=*) ;;
  *\?*) DATABASE_URL="${DATABASE_URL}&connect_timeout=25" ;;
  *) DATABASE_URL="${DATABASE_URL}?connect_timeout=25" ;;
esac
export DATABASE_URL

# Migrations run in Railway [deploy.release] so HTTP can bind immediately for healthchecks.
# Set MIGRATE_ON_START=1 if your platform has no release hook (not recommended with Railway).
if [ "${MIGRATE_ON_START:-0}" = "1" ]; then
  echo "[docker-entrypoint] MIGRATE_ON_START=1 → prisma migrate deploy..."
  prisma migrate deploy --schema prisma/schema.prisma
fi

echo "[docker-entrypoint] exec:" "$@"
exec "$@"
