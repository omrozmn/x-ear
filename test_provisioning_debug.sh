#!/bin/bash
BASE_URL="http://localhost:5003"
ADMIN_EMAIL="admin@xear.com"
ADMIN_PASSWORD="admin123"

SUFFIX=$(date +%s)$RANDOM

# 1. Auth
echo "=== 1. Admin Auth ==="
admin_res=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"'$ADMIN_EMAIL'","password":"'$ADMIN_PASSWORD'"}')
echo "$admin_res" | jq '.'
ADMIN_TOKEN=$(echo "$admin_res" | jq -r '.data.token')
echo "Token: $ADMIN_TOKEN"

# 2. Plan
echo -e "\n=== 2. Create Plan ==="
PLAN_DATA=$(cat <<EOFPLAN
{
  "name": "Test Plan $SUFFIX",
  "slug": "plan-$SUFFIX",
  "planType": "BASIC",
  "price": 100.0,
  "billingInterval": "YEARLY",
  "maxUsers": 10,
  "isActive": true,
  "isPublic": true
}
EOFPLAN
)
plan_res=$(curl -s -X POST "$BASE_URL/api/admin/plans" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Effective-Tenant-Id: system" \
  -d "$PLAN_DATA")
echo "$plan_res" | jq '.'
PLAN_ID=$(echo "$plan_res" | jq -r '.data.plan.id // .data.id // .id')
echo "Plan ID: $PLAN_ID"

# 3. Tenant
echo -e "\n=== 3. Create Tenant ==="
TENANT_DATA=$(cat <<EOFTENANT
{
  "name": "Test Tenant $SUFFIX",
  "slug": "tenant-$SUFFIX",
  "email": "test-$SUFFIX@xear.com",
  "billingEmail": "billing-$SUFFIX@xear.com",
  "ownerEmail": "owner-$SUFFIX@xear.com",
  "productCode": "xear_hearing",
  "maxUsers": 20,
  "status": "active",
  "planId": "$PLAN_ID"
}
EOFTENANT
)
tenant_res=$(curl -s -X POST "$BASE_URL/api/admin/tenants" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Effective-Tenant-Id: system" \
  -d "$TENANT_DATA")
echo "$tenant_res" | jq '.'
TN_ID=$(echo "$tenant_res" | jq -r '.data.id // .id')
echo "Tenant ID: $TN_ID"

# 4. User
echo -e "\n=== 4. Create User ==="
USER_DATA=$(cat <<EOFUSER
{
  "email": "user-$SUFFIX@xear.com",
  "password": "Pass123",
  "firstName": "Test",
  "lastName": "User",
  "role": "support",
  "username": "user_$SUFFIX",
  "isActive": true,
  "tenantId": "$TN_ID"
}
EOFUSER
)
user_res=$(curl -s -X POST "$BASE_URL/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Effective-Tenant-Id: system" \
  -d "$USER_DATA")
echo "$user_res" | jq '.'
U_ID=$(echo "$user_res" | jq -r '.data.user.id // .data.id // .id')
echo "User ID: $U_ID"

# 5. Party
echo -e "\n=== 5. Create Party ==="
TCKN="11$(printf "%09d" $RANDOM)"
PARTY_DATA=$(cat <<EOFPARTY
{
  "firstName": "Test",
  "lastName": "Party",
  "phone": "+90555$(printf "%08d" $RANDOM | cut -c1-8)",
  "email": "party-$SUFFIX@xear.com",
  "tcNumber": "$TCKN",
  "status": "active"
}
EOFPARTY
)
party_res=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Effective-Tenant-Id: $TN_ID" \
  -d "$PARTY_DATA")
echo "$party_res" | jq '.'
P_ID=$(echo "$party_res" | jq -r '.data.id // .id')
echo "Party ID: $P_ID"
