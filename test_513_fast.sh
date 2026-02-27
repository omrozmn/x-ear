#!/bin/bash
# Fast 513 Endpoint Test

BASE_URL="http://localhost:5003/api"
PASS=0
FAIL=0

# Get admin token
echo "Getting admin token..."
ADMIN_TOKEN=$(curl -s -X POST $BASE_URL/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: adm-$(date +%s)" \
  -d '{"email":"admin@test.com","password":"admin123"}' | python3 -c "import sys, json; print(json.load(sys.stdin).get('data',{}).get('token',''))" 2>/dev/null)

# Get tenant token
echo "Getting tenant token..."
TENANT_TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ten-$(date +%s)" \
  -d '{"phone":"+905551234567","password":"test123"}' | python3 -c "import sys, json; print(json.load(sys.stdin).get('data',{}).get('accessToken',''))" 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ] || [ -z "$TENANT_TOKEN" ]; then
  echo "❌ Failed to get tokens"
  exit 1
fi

echo "✅ Tokens obtained"
echo ""

# Test function
test_ep() {
  local method=$1
  local path=$2
  local token=$3
  local data=$4
  
  if [ -n "$data" ]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL$path" \
      -H "Authorization: Bearer $token" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
      -d "$data" 2>/dev/null)
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$BASE_URL$path" \
      -H "Authorization: Bearer $token" 2>/dev/null)
  fi
  
  if [[ "$code" =~ ^(200|201|204)$ ]]; then
    ((PASS++))
    echo "✓ $method $path ($code)"
  else
    ((FAIL++))
    echo "✗ $method $path ($code)"
  fi
}

echo "Testing endpoints..."

# Auth endpoints
test_ep GET /auth/me "$TENANT_TOKEN"

# Parties
test_ep GET /parties "$TENANT_TOKEN"
test_ep POST /parties "$TENANT_TOKEN" '{"firstName":"Test","lastName":"User","phone":"+905559999999"}'

# Devices
test_ep GET /devices "$TENANT_TOKEN"
test_ep POST /devices "$TENANT_TOKEN" '{"name":"Test Device","serialNumber":"SN123","deviceType":"hearing_aid"}'

# Sales
test_ep GET /sales "$TENANT_TOKEN"

# Branches
test_ep GET /branches "$TENANT_TOKEN"

# Users
test_ep GET /users "$TENANT_TOKEN"

# Settings
test_ep GET /settings "$TENANT_TOKEN"

# Tickets
test_ep GET /tickets "$TENANT_TOKEN"

# Admin endpoints
test_ep GET /admin/tenants "$ADMIN_TOKEN"
test_ep GET /admin/integrations "$ADMIN_TOKEN"
test_ep GET /admin/users "$ADMIN_TOKEN"

echo ""
echo "=== Results ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo "Total: $((PASS + FAIL))"
echo "Rate: $(python3 -c "print(f'{$PASS*100/($PASS+$FAIL):.1f}%')" 2>/dev/null || echo "N/A")"
