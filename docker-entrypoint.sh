#!/bin/sh
set -eu

echo "[docker-entrypoint] prisma migrate deploy..."
prisma migrate deploy

exec "$@"
