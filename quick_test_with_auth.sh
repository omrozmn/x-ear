#!/bin/bash

BASE_URL="http://localhost:5003/api"

# Get token
echo "Getting auth token..."
TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"phone":"+905551234567","password":"test123"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed, creating test user..."
  # Register user
  curl -s -X POST $BASE_URL/auth/lookup-phone \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: lookup-$(date +%s)" \
    -d '{"phone":"+905551234567"}' > /dev/null
  
  # Verify OTP (assuming 000000 works in dev)
  curl -s -X POST $BASE_URL/auth/verify-otp \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: verify-$(date +%s)" \
    -d '{"phone":"+905551234567","otp":"000000"}' > /dev/null
  
  # Set password
  curl -s -X POST $BASE_URL/auth/set-password \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: setpw-$(date +%s)" \
    -d '{"phone":"+905551234567","password":"test123","firstName":"Test","lastName":"User"}' > /dev/null
  
  # Login again
  TOKEN=$(curl -s -X POST $BASE_URL/auth/login \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: login2-$(date +%s)" \
    -d '{"phone":"+905551234567","password":"test123"}' | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',{}).get('accessToken',''))" 2>/dev/null)
fi

if [ -z "$TOKEN" ]; then
  echo "❌ Still no token, exiting"
  exit 1
fi

echo "✅ Token obtained: ${TOKEN:0:50}..."
echo ""

# Test critical endpoints
PASS=0
FAIL=0

test_endpoint() {
  local method=$1
  local path=$2
  local data=$3
  
  if [ -n "$data" ]; then
    response=$(curl -s -X $method "$BASE_URL$path" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: test-$(date +%s)" \
      -d "$data")
  else
    response=$(curl -s -X $method "$BASE_URL$path" \
      -H "Authorization: Bearer $TOKEN")
  fi
  
  success=$(echo "$response" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)
  
  if [ "$success" = "True" ]; then
    echo "✅ $method $path"
    ((PASS++))
  else
    echo "❌ $method $path"
    ((FAIL++))
  fi
}

echo "=== Testing Critical Endpoints ==="

# Auth
test_endpoint GET /auth/me

# Parties
test_endpoint GET /parties
test_endpoint POST /parties '{"firstName":"John","lastName":"Doe","phone":"+905559999999"}'

# Devices
test_endpoint GET /devices

# Sales
test_endpoint GET /sales

# Branches
test_endpoint GET /branches

# Users
test_endpoint GET /users

# Settings
test_endpoint GET /settings

echo ""
echo "=== Results ==="
echo "PASS: $PASS"
echo "FAIL: $FAIL"
echo "Total: $((PASS + FAIL))"
echo "Success Rate: $(python3 -c "print(f'{$PASS*100/($PASS+$FAIL):.1f}%')" 2>/dev/null || echo "N/A")"
