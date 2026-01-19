#!/bin/bash
# scripts/snapshot-operationids.sh
# Captures current operationIds for migration verification

set -e

SNAPSHOT_FILE=".operation-ids-snapshot.txt"
API_URL="${API_URL:-http://localhost:5003/openapi.json}"

echo "📸 Capturing operationIds from $API_URL..."

# Fetch OpenAPI spec and extract operationIds
curl -s "$API_URL" | \
  python3 -c "
import sys, json
spec = json.load(sys.stdin)
paths = spec.get('paths', {})
for path, methods in paths.items():
    for method, details in methods.items():
        if isinstance(details, dict) and 'operationId' in details:
            print(details['operationId'])
" | sort > "$SNAPSHOT_FILE"

COUNT=$(wc -l < "$SNAPSHOT_FILE" | tr -d ' ')
echo "✅ Captured $COUNT operationIds to $SNAPSHOT_FILE"

# Show first few
echo ""
echo "📋 Sample operationIds:"
head -10 "$SNAPSHOT_FILE"
echo "..."
