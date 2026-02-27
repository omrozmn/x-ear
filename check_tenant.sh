#!/bin/bash

# Admin login
ADMIN_LOGIN=$(curl -s -X POST http://localhost:5003/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}')

ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | jq -r '.data.token // .data.accessToken')
echo "Admin Token: ${ADMIN_TOKEN:0:20}..."

# Get all tenants
echo "Fetching all tenants..."
TENANTS=$(curl -s -X GET http://localhost:5003/api/admin/tenants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Effective-Tenant-Id: system")

echo "$TENANTS" | jq '.data.tenants[] | {id, name}' | head -20

# Check if our tenant exists
CACHED_TENANT="44a65c14-c92e-4c49-ac42-a35d658dd7b5"
echo ""
echo "Looking for cached tenant: $CACHED_TENANT"
echo "$TENANTS" | jq ".data.tenants[] | select(.id == \"$CACHED_TENANT\")"
