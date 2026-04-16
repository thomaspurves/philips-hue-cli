#!/usr/bin/env bash
set -euo pipefail

export PHILIPS_HUE_HOME
PHILIPS_HUE_HOME="$(mktemp -d)"
trap 'rm -rf "$PHILIPS_HUE_HOME"' EXIT

CLI="node $(cd "$(dirname "$0")/.." && pwd)/bin/philips-hue"

echo "=== philips-hue smoke test ==="
echo "Using PHILIPS_HUE_HOME=$PHILIPS_HUE_HOME"
echo ""

# 1. Auth
echo "--- auth login ---"
$CLI auth login
echo ""

# 2. Discover all lights
echo "--- devices list (all) ---"
NAMES=$($CLI devices list --format json | jq '[.data[] | .name]')
echo "$NAMES"
echo ""

# 3. Control by room
echo "--- devices set --room kitchen --state off ---"
KITCHEN_RESULT=$($CLI devices set --room kitchen --state off --format json)
echo "$KITCHEN_RESULT" | jq '.data.summary'
echo ""

# 4. Verify single light state
echo "--- devices get light-001 ---"
STATE=$($CLI devices get light-001 --format json | jq -r '.data.state')
echo "light-001 state: $STATE"
if [[ "$STATE" != "off" ]]; then
  echo "FAIL: expected light-001 to be off, got: $STATE" >&2
  exit 1
fi
echo ""

# 5. Control all lights
echo "--- devices set --state on (all lights) ---"
ALL_RESULT=$($CLI devices set --state on --format json)
COUNT=$(echo "$ALL_RESULT" | jq '.data.summary.count')
echo "Affected: $COUNT lights"
if [[ "$COUNT" != "8" ]]; then
  echo "FAIL: expected 8 lights affected, got: $COUNT" >&2
  exit 1
fi
echo ""

# 6. Idempotency check — set on again, changed should be 0
echo "--- idempotency: set --state on again ---"
IDEM=$($CLI devices set --state on --format json | jq '.data.summary.changed')
if [[ "$IDEM" != "0" ]]; then
  echo "FAIL: expected 0 changes (idempotent), got: $IDEM" >&2
  exit 1
fi
echo "changed=0 (correct)"
echo ""

# 7. Auth guard — logout then verify devices returns exit 1
echo "--- auth guard check ---"
$CLI auth logout --format json | jq '.data.authenticated'
if $CLI devices list --format json 2>/dev/null; then
  echo "FAIL: expected exit 1 after logout" >&2
  exit 1
fi
echo "Auth guard working (exit 1 as expected)"
echo ""

echo "✓ Smoke test passed"
