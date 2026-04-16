#!/usr/bin/env bash
set -euo pipefail

PACKAGE="@philipshue/cli"

echo "Installing ${PACKAGE}..."

if ! command -v npm &>/dev/null; then
  echo "Error: npm is required but not found. Install Node.js 20+ from https://nodejs.org" >&2
  exit 1
fi

npm install -g "${PACKAGE}"

echo ""
echo "Done! Next steps:"
echo ""
echo "  1. Authenticate with the Hue bridge:"
echo "     philips-hue auth login"
echo ""
echo "  2. Install the agent skill (auto-detects Claude Code / Codex):"
echo "     philips-hue skills install"
echo ""
echo "  3. Verify everything works:"
echo "     philips-hue devices list --format json | jq ."
echo ""
