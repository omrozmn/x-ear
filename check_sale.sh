#!/bin/bash

# Admin login
ADMIN_LOGIN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.token // .data.accessToken')

# Switch to tenant
TENANT_ID="44a65c14-c92e-4c49-ac42-a35d658dd7b5"
SWITCH=$(curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\":\"$TENANT_ID\"}")

TENANT_TOKEN=$(echo "$SWITCH" | jq -r '.data.accessToken')
echo "Tenant Token: ${TENANT_TOKEN:0:20}..."

# Check sale
echo "Checking sale 2602230105..."
SALE=$(curl -s -X GET http://localhost:5003/api/sales/2602230105 \
  -H "Authorization: Bearer $TENANT_TOKEN")

echo "$SALE" | jq '.'
