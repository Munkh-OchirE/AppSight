#!/usr/bin/env bash
set -euo pipefail

echo "Running Codex validation script..."

corepack enable

if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
elif [ -f package-lock.json ]; then
  npm ci
elif [ -f package.json ]; then
  npm install
fi

if [ -f package.json ]; then
  pnpm run lint --if-present
  pnpm run typecheck --if-present
  pnpm run test --if-present
  pnpm run build --if-present
fi

echo "Codex validation completed successfully."