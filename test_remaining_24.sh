#!/bin/bash
BASE_URL="http://localhost:5003"

TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

echo "=== Testing Remaining 24 Failed Endpoints ==="

endpoints=(
  "/api/admin/bounces"
  "/api/admin/bounces/stats"
  "/api/admin/unsubscribes"
  "/api/admin/unsubscribes/stats"
  "/api/admin/marketplaces/integrations"
  "/api/deliverability/metrics"
  "/api/deliverability/alerts/check"
  "/api/sms/audiences"
)

for endpoint in "${endpoints[@]}"; do
  echo ""
  echo ">>> $endpoint"
  response=$(curl -s -X GET -H "Authorization: Bearer $TOKEN" "$BASE_URL$endpoint")
  error=$(echo "$response" | jq -r '.error.message // .message // "No error"' 2>/dev/null | head -c 150)
  echo "  $error"
done
