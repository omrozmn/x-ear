#!/bin/bash

echo "========================================="
echo "  Quick Schemathesis Test"
echo "========================================="
echo ""

# Get token
TOKEN=$(curl -s -X POST "http://localhost:5003/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

echo "Testing fixed endpoints with Schemathesis..."
echo ""

# Test each fixed endpoint with schemathesis (5 tests each)
schemathesis run http://localhost:5003/openapi.json \
  --checks all \
  --hypothesis-max-examples=5 \
  --hypothesis-phases=generate \
  --base-url=http://localhost:5003 \
  --header "Authorization: Bearer $TOKEN" \
  --endpoint "/api/activity-logs" \
  --endpoint "/api/audit" \
  --endpoint "/api/devices" \
  --endpoint "/api/sms/headers" \
  --endpoint "/api/invoices" \
  2>&1 | head -100

echo ""
echo "========================================="
