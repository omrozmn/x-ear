#!/bin/bash

# Admin login
ADMIN_LOGIN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.token // .data.accessToken')
echo "Admin Token: ${ADMIN_TOKEN:0:20}..."

# Get tenants
TENANTS=$(curl -s -X GET http://localhost:5003/api/admin/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Effective-Tenant-Id: system")

TENANT_ID=$(echo "$TENANTS" | jq -r '.data.tenants[0].id // .data[0].id')
echo "Tenant ID: $TENANT_ID"

# Try switch tenant
echo "Attempting switch-tenant..."
SWITCH_RESULT=$(curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\":\"$TENANT_ID\"}")

echo "Switch Result:"
echo "$SWITCH_RESULT" | jq '.'
