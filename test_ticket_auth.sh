#!/bin/bash

export TESTING=true

echo "🔐 Testing Ticket Endpoints with Different Auth Methods"
echo "========================================================"

TENANT_ID="938ab3ec-192a-4f89-8a63-6941212e2f2a"

# Test 1: Super Admin Token (Direct)
echo -e "\n📋 Test 1: Super Admin Token (admin_only=True, tenant_required=False)"
ADMIN_TOKEN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)-$RANDOM" \
  -d '{"email":"admin@xear.com","password":"admin123"}' | \
  python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('token', ''))")

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Admin login failed"
  exit 1
fi

echo "✅ Admin token obtained: ${ADMIN_TOKEN:0:20}..."

# List tickets with admin token
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:5003/api/admin/tickets?page=1&limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
STATUS=$(echo "$RESPONSE" | tail -1)
echo "   GET /api/admin/tickets with ADMIN_TOKEN: $STATUS"

# Test 2: Impersonation Token (Super Admin → Tenant)
echo -e "\n📋 Test 2: Impersonation Token (Super Admin impersonating tenant)"

# Check if switch-tenant endpoint exists
SWITCH_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)-$RANDOM" \
  -d "{\"targetTenantId\":\"$TENANT_ID\"}")

SWITCH_STATUS=$(echo "$SWITCH_RESPONSE" | tail -1)
SWITCH_BODY=$(echo "$SWITCH_RESPONSE" | sed '$d')

echo "   Switch tenant status: $SWITCH_STATUS"

if [ "$SWITCH_STATUS" = "200" ] || [ "$SWITCH_STATUS" = "201" ]; then
  IMPERSONATION_TOKEN=$(echo "$SWITCH_BODY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('accessToken', ''))" 2>/dev/null)
  
  if [ -n "$IMPERSONATION_TOKEN" ]; then
    echo "✅ Impersonation token obtained: ${IMPERSONATION_TOKEN:0:20}..."
    
    # List tickets with impersonation token
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:5003/api/admin/tickets?page=1&limit=10" \
      -H "Authorization: Bearer $IMPERSONATION_TOKEN")
    STATUS=$(echo "$RESPONSE" | tail -1)
    echo "   GET /api/admin/tickets with IMPERSONATION_TOKEN: $STATUS"
  else
    echo "⚠️  Could not extract impersonation token"
  fi
else
  echo "⚠️  Switch tenant endpoint not available or failed (status: $SWITCH_STATUS)"
fi

# Test 3: Tenant Admin Token (if exists)
echo -e "\n📋 Test 3: Tenant Admin Token (tenant-level admin user)"

# Try to login as tenant admin (if exists)
TENANT_ADMIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:5003/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)-$RANDOM" \
  -d '{"email":"tenant-admin@xear.com","password":"admin123"}' 2>/dev/null)

TENANT_ADMIN_STATUS=$(echo "$TENANT_ADMIN_RESPONSE" | tail -1)
TENANT_ADMIN_BODY=$(echo "$TENANT_ADMIN_RESPONSE" | sed '$d')

if [ "$TENANT_ADMIN_STATUS" = "200" ] || [ "$TENANT_ADMIN_STATUS" = "201" ]; then
  TENANT_ADMIN_TOKEN=$(echo "$TENANT_ADMIN_BODY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data', {}).get('token', '') or d.get('data', {}).get('accessToken', ''))" 2>/dev/null)
  
  if [ -n "$TENANT_ADMIN_TOKEN" ]; then
    echo "✅ Tenant admin token obtained: ${TENANT_ADMIN_TOKEN:0:20}..."
    
    # List tickets with tenant admin token
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "http://localhost:5003/api/admin/tickets?page=1&limit=10" \
      -H "Authorization: Bearer $TENANT_ADMIN_TOKEN")
    STATUS=$(echo "$RESPONSE" | tail -1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    echo "   GET /api/admin/tickets with TENANT_ADMIN_TOKEN: $STATUS"
    
    if [ "$STATUS" != "200" ]; then
      echo "   Error: $(echo "$BODY" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('error', {}).get('message', 'Unknown error'))" 2>/dev/null)"
    fi
  else
    echo "⚠️  Could not extract tenant admin token"
  fi
else
  echo "⚠️  Tenant admin user does not exist (status: $TENANT_ADMIN_STATUS)"
  echo "   This is expected if tenant admin user was not created"
fi

echo -e "\n✅ Auth testing completed!"
echo ""
echo "Summary:"
echo "--------"
echo "Ticket endpoints are admin_only=True, tenant_required=False"
echo "Expected behavior:"
echo "  ✅ Super admin token → Should work (200)"
echo "  ✅ Impersonation token → Should work (200)"
echo "  ❌ Tenant admin token → Should fail (403) unless user has admin role"
