#!/bin/bash
# Debug Scan Script - Phase 2
# Scans all routes and captures status codes and errors

BASE_URL="${1:-http://localhost:8080}"
OUTPUT_DIR="test-results/debug-scan"

mkdir -p "$OUTPUT_DIR"

echo "=== Debug Scan: Web App Routes ==="
echo "Base URL: $BASE_URL"
echo ""

web_routes=(
  "/login"
  "/forgot-password"
  "/dashboard"
  "/parties"
  "/appointments"
  "/invoices"
  "/devices"
  "/inventory"
  "/cashflow"
  "/reports"
  "/reports/sales"
  "/reports/collections"
  "/profile"
  "/settings"
  "/settings/team"
  "/settings/roles"
  "/settings/branches"
  "/settings/general"
  "/settings/integration"
  "/settings/subscription"
  "/campaigns"
  "/suppliers"
  "/pos"
  "/automation"
  "/invoices/purchases"
  "/invoices/new"
  "/invoices/payments"
  "/sgk"
)

success=0
errors=0
redirects=0

for route in "${web_routes[@]}"; do
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
echo "Total: $(($success + $redirects + $errors))"
