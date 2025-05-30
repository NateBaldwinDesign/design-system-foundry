#!/bin/bash
set -e

# Clean all dist/ and build/ directories
find . -type d \( -name 'dist' -o -name 'build' \) -prune -exec rm -rf {} +
echo "✅ Removed all dist/ and build/ directories."

# Clean node_modules/.cache if present
if [ -d "node_modules/.cache" ]; then
  rm -rf node_modules/.cache
  echo "✅ Removed node_modules/.cache."
fi

# Remove the data-model symlink from design-data-system-manager
DATA_MODEL_LINK="packages/design-data-system-manager/node_modules/@token-model/data-model"
if [ -L "$DATA_MODEL_LINK" ]; then
  rm "$DATA_MODEL_LINK"
  echo "✅ Removed symlink: $DATA_MODEL_LINK"
fi

# Optionally, remove package-level node_modules/.cache
find packages -type d -name '.cache' -prune -exec rm -rf {} +
echo "✅ Removed all package-level .cache directories."

echo "🧹 Clean complete. You can now re-link and re-build your packages." 