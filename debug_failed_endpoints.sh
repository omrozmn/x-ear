#!/bin/bash
BASE_URL="http://localhost:5003"

TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

echo "=== Testing Failed Endpoints with Full Response ==="
echo ""

# Test each failed endpoint and show full response
endpoints=(
  "/api/admin/bounces"
  "/api/admin/bounces/stats"
  "/api/devices"
  "/api/sms/headers"
)

for endpoint in "${endpoints[@]}"; do
  echo ">>> Testing: $endpoint"
  curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL$endpoint?page=1&limit=5" | jq '.' || echo "Invalid JSON"
  echo ""
  echo "---"
  echo ""
done
