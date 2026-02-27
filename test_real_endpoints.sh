#!/bin/bash
# Test real endpoints to see actual success rate

echo "🔐 Getting token..."
TOKEN=$(curl -s -X POST "http://localhost:5003/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

echo "✓ Got token"
echo ""

# Test 20 common endpoints
endpoints=(
  "GET /api/parties?page=1&limit=5"
  "GET /api/devices?page=1&limit=5"
  "GET /api/invoices?page=1&limit=5"
  "GET /api/sales?page=1&limit=5"
  "GET /api/appointments/list?page=1&limit=5"
  "GET /api/users/me"
  "GET /api/settings"
  "GET /api/admin/tenants"
  "GET /api/admin/roles"
  "GET /api/admin/permissions"
  "GET /api/inventory?page=1&limit=5"
  "GET /api/suppliers?page=1&limit=5"
  "GET /api/device-assignments?page=1&limit=5"
  "GET /api/hearing-profiles?page=1&limit=5"
  "GET /api/notifications?page=1&limit=5"
  "GET /api/activity-logs?page=1&limit=5"
  "GET /api/campaigns?page=1&limit=5"
  "GET /api/communications/history?page=1&limit=5"
  "GET /api/admin/analytics/overview"
  "GET /api/dashboard/stats"
)

success=0
failed=0

for endpoint in "${endpoints[@]}"; do
  method=$(echo $endpoint | awk '{print $1}')
  path=$(echo $endpoint | awk '{print $2}')
  
  response=$(curl -s -X $method "http://localhost:5003$path" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  is_success=$(echo "$response" | jq -r '.success' 2>/dev/null)
  status_code=$(echo "$response" | grep -o '"statusCode":[0-9]*' | cut -d: -f2)
  
  if [ "$is_success" == "true" ]; then
    echo "✓ $endpoint"
    ((success++))
  else
    error_msg=$(echo "$response" | jq -r '.error.message' 2>/dev/null | head -c 50)
    echo "✗ $endpoint - $error_msg"
    ((failed++))
  fi
done

echo ""
echo "Results: $success passed, $failed failed"
echo "Success rate: $(echo "scale=1; $success * 100 / ($success + $failed)" | bc)%"
