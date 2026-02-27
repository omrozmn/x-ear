#!/bin/bash
# Test only the 20 failed endpoints

BASE_URL="http://localhost:5003"

# Get token
TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

echo "Testing 20 previously failed endpoints..."
echo ""

failed_endpoints=(
  "GET /api/activity-logs"
  "GET /api/admin/bounces"
  "GET /api/admin/bounces/stats"
  "GET /api/admin/unsubscribes"
  "GET /api/admin/unsubscribes/stats"
  "GET /api/admin/birfatura/invoices"
  "GET /api/admin/inventory"
  "GET /api/admin/invoices"
  "GET /api/admin/marketplaces/integrations"
  "GET /api/ai/admin/settings"
  "GET /api/audit"
  "GET /api/deliverability/metrics"
  "GET /api/deliverability/alerts/check"
  "GET /api/deliverability/trend"
  "GET /api/devices"
  "GET /api/devices/low-stock"
  "GET /api/settings"
  "GET /api/sms/headers"
  "GET /api/sms/audiences"
  "GET /api/sms/admin/headers"
)

passed=0
failed=0

for endpoint in "${failed_endpoints[@]}"; do
  method=$(echo $endpoint | awk '{print $1}')
  path=$(echo $endpoint | awk '{print $2}')
  
  response=$(curl -s -w "\n%{http_code}" -X $method \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL$path?page=1&limit=5" 2>/dev/null)
  
  http_code=$(echo "$response" | tail -n1)
  
  if [[ "$http_code" =~ ^(200|201|204)$ ]]; then
    echo "✓ $endpoint (HTTP $http_code)"
    ((passed++))
  else
    echo "✗ $endpoint (HTTP $http_code)"
    ((failed++))
  fi
done

echo ""
echo "Results: $passed passed, $failed failed"
echo "Success rate: $(echo "scale=1; $passed * 100 / ($passed + $failed)" | bc)%"
