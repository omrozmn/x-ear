#!/bin/bash

# Get a party with sales
PARTY_ID=$(sqlite3 apps/api/instance/xear_crm.db "SELECT party_id FROM sales LIMIT 1")

if [ -z "$PARTY_ID" ]; then
  echo "No sales found in database"
  exit 1
fi

echo "Testing party sales for party: $PARTY_ID"
echo "=========================================="

# Test without auth (should work if no auth middleware)
curl -s "http://localhost:5003/api/parties/$PARTY_ID/sales" | jq '.data[0].devices[0] | {barcode, serialNumber, serialNumberLeft, serialNumberRight, brand, model, name}'

