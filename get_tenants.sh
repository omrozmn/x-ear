#!/bin/bash

BASE_URL="http://localhost:5003"

# Get admin token
ADMIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)-$RANDOM" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESPONSE" | jq -r '.data.token')

echo "=== Getting tenants list ==="
TENANTS_RESPONSE=$(curl -s -X GET "$BASE_URL/api/admin/tenants?page=1&perPage=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$TENANTS_RESPONSE" | jq '.'
