#!/bin/bash
BASE_URL="http://localhost:5003"

TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token')

echo "=== Analyzing ALL Failed Endpoints ==="
echo ""

# All failed endpoints from the test
failed=(
  "/api/addons/admin"
  "/api/admin/bounces"
  "/api/admin/bounces/stats"
  "/api/admin/unsubscribes"
  "/api/admin/unsubscribes/stats"
  "/api/admin/birfatura/invoices"
  "/api/admin/invoices"
  "/api/admin/marketplaces/integrations"
  "/api/admin/complaints"
  "/api/admin/complaints/stats"
  "/api/admin/settings"
  "/api/admin/roles"
  "/api/admin/permissions"
  "/api/admin/admin-users"
  "/api/admin/sms/packages"
  "/api/affiliates/me"
  "/api/ai/admin/settings"
  "/api/ai/composer/autocomplete"
  "/api/appointments/availability?date=2026-01-21"
  "/api/commissions/by-affiliate"
  "/api/commissions/audit"
  "/api/deliverability/metrics"
  "/api/deliverability/alerts/check"
  "/api/deliverability/trend"
  "/api/plans/admin"
  "/api/sms/audiences"
  "/api/unsubscribe"
)

for endpoint in "${failed[@]}"; do
  echo ">>> $endpoint"
  response=$(curl -s -X GET \
    -H "Authorization: Bearer $TOKEN" \
    "$BASE_URL$endpoint" 2>&1)
  
  http_code=$(echo "$response" | jq -r '.error.code // .message // "UNKNOWN"' 2>/dev/null || echo "PARSE_ERROR")
  error_msg=$(echo "$response" | jq -r '.error.message // .message // "No message"' 2>/dev/null | head -c 100)
  
  echo "  Error: $error_msg"
  echo ""
done
