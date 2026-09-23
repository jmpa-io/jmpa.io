#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ENV_FILE="$(mktemp /tmp/jmpa-inventory-env.XXXXXX.json)"
trap 'rm -f "$ENV_FILE"' EXIT

jq -n \
  --arg token "${SQUARE_ACCESS_TOKEN}" \
  --arg sandbox "${SQUARE_SANDBOX:-true}" \
  '{"InventoryFunction":{"SQUARE_ACCESS_TOKEN":$token,"SQUARE_SANDBOX":$sandbox,"LOG_LEVEL":"debug"}}' \
  > "$ENV_FILE"

sam local invoke InventoryFunction \
  --template "$REPO_ROOT/cf/inventory/template.yml" \
  --event "$SCRIPT_DIR/events/get.json" \
  --env-vars "$ENV_FILE"
