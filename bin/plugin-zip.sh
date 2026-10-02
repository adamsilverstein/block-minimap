#!/usr/bin/env bash
#
# Package the plugin into block-minimap.zip for WordPress.org or a manual install.
#
# Copies the working tree into a block-minimap/ folder, skipping everything
# listed in .distignore (the same file the 10up deploy action reads), then
# zips that folder. Run `npm run build` first; `npm run plugin-zip` does both.

set -euo pipefail

SLUG="block-minimap"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ZIP="${ROOT}/${SLUG}.zip"

if [ ! -f "${ROOT}/dist/minimap.js" ]; then
	echo "dist/minimap.js is missing, run npm run build first." >&2
	exit 1
fi

BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "${BUILD_DIR}"' EXIT

rsync -a --exclude-from="${ROOT}/.distignore" "${ROOT}/" "${BUILD_DIR}/${SLUG}/"

rm -f "${ZIP}"
( cd "${BUILD_DIR}" && zip -rqX "${ZIP}" "${SLUG}" )

echo "Created ${ZIP}"
unzip -l "${ZIP}"
