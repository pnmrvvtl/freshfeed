#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  docker compose down --volumes --remove-orphans
}
trap cleanup EXIT

if [ -f .env.test ]; then
  set -a
  # shellcheck source=/dev/null
  source .env.test
  set +a
fi

if ! docker info > /dev/null 2>&1; then
  echo "Docker is not running. Please start Docker Desktop and retry."
  exit 1
fi

docker compose up -d --wait

pnpm --filter @termsync/api exec prisma migrate deploy

pnpm --filter @termsync/api test:e2e

docker compose exec -T redis redis-cli FLUSHDB

pnpm --filter @termsync/front test:e2e
