#!/usr/bin/env bash
# Apply all pending Prisma migrations to a remote database (e.g. Railway).
# Uses the same credentials as seed-remote-db — keep secrets out of git.
#
# 1. Ensure .env.remote.local exists (see scripts/seed-remote-db.env.example):
#    REMOTE_DATABASE_URL="postgresql://..."
# 2. Run:
#    ./scripts/migrate-remote-db.sh
#    # or: npm run db:migrate:remote
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/.env.remote.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  echo "Create it with REMOTE_DATABASE_URL=postgresql://... (see scripts/seed-remote-db.env.example)" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${REMOTE_DATABASE_URL:-}" ]]; then
  echo "REMOTE_DATABASE_URL is not set in $ENV_FILE" >&2
  exit 1
fi

export DATABASE_URL="$REMOTE_DATABASE_URL"

echo "[migrate-remote] Applying migrations to remote database…"
npx prisma migrate deploy --schema prisma/schema.prisma

echo ""
echo "[migrate-remote] Status:"
npx prisma migrate status --schema prisma/schema.prisma

echo ""
echo "[migrate-remote] Done."
