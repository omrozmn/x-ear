#!/bin/bash

# Fix old SGK values by recalculating all sales
set -e

API_URL="http://localhost:5003"

echo "🔑 Generating token..."
cd "$(dirname "$0")"
TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null | tail -1)

echo ""
echo "🔄 Recalculating all sales to fix SGK values..."

# Recalculate all sales (no limit)
RESULT=$(curl -s -X POST "${API_URL}/api/sales/recalc" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: recalc-$(date +%s)-$RANDOM" \
  -d '{}')

echo "$RESULT" | jq '.'

UPDATED=$(echo "$RESULT" | jq -r '.data.updated')
PROCESSED=$(echo "$RESULT" | jq -r '.data.processed')

echo ""
echo "✅ Recalculation complete!"
echo "   Processed: $PROCESSED sales"
echo "   Updated: $UPDATED sales"
