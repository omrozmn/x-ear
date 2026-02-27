#!/bin/bash
BASE_URL="http://localhost:5003"
ADMIN_EMAIL="admin@xear.com"
ADMIN_PASSWORD="admin123"

# 1. Login
echo "=== 1. Admin Login ==="
admin_res=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$RANDOM" \
  -d '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}')
echo "$admin_res" | jq .
ADMIN_TOKEN=$(echo "$admin_res" | jq -r '.data.token')
echo "ADMIN_TOKEN: $ADMIN_TOKEN"

# 2. Create Plan
echo -e "\n=== 2. Create Plan ==="
PLAN_DATA='{"name":"Test Plan","description":"Test","planType":"BASIC","price":100.0,"billingInterval":"YEARLY","maxUsers":10,"isActive":true,"isPublic":true}'
plan_res=$(curl -s -X POST "$BASE_URL/api/admin/plans" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: plan-$RANDOM" \
  -H "X-Effective-Tenant-Id: system" \
  -d "$PLAN_DATA")
echo "$plan_res" | jq .
PLAN_ID=$(echo "$plan_res" | jq -r '.data.plan.id // .data.id // .id')
echo "PLAN_ID: $PLAN_ID"

# 3. Create Tenant
echo -e "\n=== 3. Create Tenant ==="
TENANT_DATA=$(cat <<EOF
{
  "name": "Test Corp",
  "slug": "testcorp-$RANDOM",
  "email": "test-$RANDOM@xear.com",
  "billingEmail": "billing-$RANDOM@xear.com",
  "ownerEmail": "owner-$RANDOM@xear.com",
  "productCode": "xear_hearing",
  "maxUsers": 20,
  "status": "active",
  "planId": "$PLAN_ID"
}
EOF
)
tenant_res=$(curl -s -X POST "$BASE_URL/api/admin/tenants" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: tenant-$RANDOM" \
  -H "X-Effective-Tenant-Id: system" \
  -d "$TENANT_DATA")
echo "$tenant_res" | jq .
TN_ID=$(echo "$tenant_res" | jq -r '.data.id // .id')
echo "TN_ID: $TN_ID"
