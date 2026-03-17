#!/bin/bash
BASE_URL="http://localhost:5003"

# Auth
TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: auth-$(date +%s)" \
  -d '{"email":"admin@xear.com","password":"admin123"}' | jq -r '.data.token')

# Try without password field
echo "=== Test 1: No password field ==="
curl -s -X POST "$BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: user-$(date +%s)" \
  -H "X-Effective-Tenant-Id: system" \
  -d '{"email":"test1@x.com","firstName":"T","lastName":"U","role":"support","username":"tu1","isActive":true}' | jq '.'

# Try with empty password
echo -e "\n=== Test 2: Empty password ==="
curl -s -X POST "$BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: user-$(date +%s)" \
  -H "X-Effective-Tenant-Id: system" \
  -d '{"email":"test2@x.com","password":"","firstName":"T","lastName":"U","role":"support","username":"tu2","isActive":true}' | jq '.'
