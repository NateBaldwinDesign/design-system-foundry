#!/bin/bash
set -e

# Remove all dist/, build/, .cache, .turbo, .next, .vite, .webpack directories
find . -type d \( -name 'dist' -o -name 'build' -o -name '.cache' -o -name '.turbo' -o -name '.next' -o -name '.vite' -o -name '.webpack' \) -prune -exec rm -rf {} +
echo "✅ Removed all dist/, build/, .cache, .turbo, .next, .vite, .webpack directories."

# Remove all node_modules directories
find . -type d -name 'node_modules' -prune -exec rm -rf {} +
echo "✅ Removed all node_modules directories."

# Remove all lockfiles
find . -type f \( -name 'pnpm-lock.yaml' -o -name 'package-lock.json' -o -name 'yarn.lock' \) -delete
echo "✅ Removed all lockfiles (pnpm-lock.yaml, package-lock.json, yarn.lock)."

# Remove all tsconfig.tsbuildinfo files
find . -type f -name 'tsconfig.tsbuildinfo' -delete
echo "✅ Removed all tsconfig.tsbuildinfo files."

# Remove the data-model symlink from design-data-system-manager
DATA_MODEL_LINK="packages/design-data-system-manager/node_modules/@token-model/data-model"
if [ -L "$DATA_MODEL_LINK" ]; then
  rm "$DATA_MODEL_LINK"
  echo "✅ Removed symlink: $DATA_MODEL_LINK"
fi

echo "💥 Nuclear clean complete. You can now re-install, re-link, and re-build your packages from scratch." 