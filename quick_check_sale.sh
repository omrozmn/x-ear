#!/bin/bash
ADMIN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN" | jq -r '.data.token // .data.accessToken')

SWITCH=$(curl -s -X POST http://localhost:5003/api/admin/debug/switch-tenant \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d '{"targetTenantId":"696484ea-19d1-4187-b5c4-57b12b97f8b1"}')
TENANT_TOKEN=$(echo "$SWITCH" | jq -r '.data.accessToken')

echo "Checking sale 2602230105..."
curl -s -X GET http://localhost:5003/api/sales/2602230105 \
  -H "Authorization: Bearer $TENANT_TOKEN" | jq '.success, .error.message'
