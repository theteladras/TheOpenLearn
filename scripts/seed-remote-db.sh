#!/usr/bin/env bash
# Run prisma/seed.ts against a remote database (e.g. Railway).
# Not for CI — keep credentials out of git.
#
# 1. Copy the example and fill in your URL:
#    cp scripts/seed-remote-db.env.example .env.remote.local
# 2. Run:
#    ./scripts/seed-remote-db.sh
#
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-$ROOT/.env.remote.local}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  echo "Create it with REMOTE_DATABASE_URL=postgresql://..." >&2
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
exec npx tsx prisma/seed.ts
