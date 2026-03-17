#!/bin/bash
# Debug Scan Script - Admin Panel Routes

BASE_URL="${1:-http://localhost:8082}"

echo "=== Debug Scan: Admin Panel Routes ==="
echo "Base URL: $BASE_URL"
echo ""

admin_routes=(
  "/login"
  "/dashboard"
  "/tenants"
  "/users"
  "/subscriptions"
  "/activity-logs"
  "/devices"
  "/settings"
  "/reports"
  "/plans"
  "/roles"
  "/branches"
  "/affiliates"
  "/support"
  "/analytics"
  "/health-care"
  "/inventory"
  "/monitoring"
  "/security"
  "/validation"
  "/impersonation"
  "/payments"
  "/integrations"
)

success=0
errors=0
redirects=0

for route in "${admin_routes[@]}"; do
  status=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL$route" --connect-timeout 5 --max-time 30 2>/dev/null)
  
  if [ "$status" = "200" ]; then
    echo "✅ [$status] $route"
    ((success++))
  elif [ "$status" -ge 300 ] && [ "$status" -lt 400 ]; then
    echo "🔄 [$status] $route"
    ((redirects++))
  elif [ "$status" = "000" ]; then
    echo "❌ [TIMEOUT] $route"
    ((errors++))
  else
    echo "❌ [$status] $route"
    ((errors++))
  fi
done

echo ""
echo "=== Summary ==="
echo "Success: $success"
echo "Redirects: $redirects"
echo "Errors: $errors"
