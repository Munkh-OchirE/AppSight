#!/usr/bin/env bash
set -euo pipefail

echo "Running Codex validation script..."

if [ -f pnpm-lock.yaml ]; then
  pnpm install --frozen-lockfile
elif [ -f package-lock.json ]; then
  npm ci
elif [ -f package.json ]; then
  npm install
fi

if [ -f package.json ]; then
  if pnpm run | grep -q "lint"; then
    pnpm run lint
  else
    echo "No lint script found. Skipping lint."
  fi

  if pnpm run | grep -q "typecheck"; then
    pnpm run typecheck
  else
    echo "No typecheck script found. Skipping typecheck."
  fi

  if pnpm run | grep -q "test"; then
    pnpm run test
  else
    echo "No test script found. Skipping tests."
  fi

  if pnpm run | grep -q "build"; then
    pnpm run build
  else
    echo "No build script found. Skipping build."
  fi
fi

echo "Codex validation completed successfully."
