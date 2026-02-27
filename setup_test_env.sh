#!/bin/bash

BASE_URL="http://localhost:5003"

echo "Setting up test environment..."

# 1. Admin login
echo "1. Admin login..."
admin_res=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: setup-$RANDOM" \
  -d '{"email":"admin@xear.com","password":"admin123"}')
ADMIN_TOKEN=$(echo "$admin_res" | jq -r '.data.token')

if [ "$ADMIN_TOKEN" = "null" ] || [ -z "$ADMIN_TOKEN" ]; then
    echo "ERROR: Admin login failed"
    echo "$admin_res" | jq '.'
    exit 1
fi

echo "   Admin token obtained"

# 2. Create plan
echo "2. Creating plan..."
plan_res=$(curl -s -X POST "$BASE_URL/api/admin/plans" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: setup-$RANDOM" \
  -d '{"name":"Test Plan","slug":"test-plan-'$RANDOM'","description":"Test","planType":"BASIC","price":100.0,"billingInterval":"MONTHLY","maxUsers":10,"isActive":true,"isPublic":true}')
PLAN_ID=$(echo "$plan_res" | jq -r '.data.plan.id // .data.id // .id')

if [ "$PLAN_ID" = "null" ] || [ -z "$PLAN_ID" ]; then
    echo "ERROR: Plan creation failed"
    echo "$plan_res" | jq '.'
    exit 1
fi

echo "   Plan created: $PLAN_ID"

# 3. Create tenant
echo "3. Creating tenant..."
tenant_res=$(curl -s -X POST "$BASE_URL/api/admin/tenants" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: setup-$RANDOM" \
  -d '{"name":"Test Clinic","slug":"test-clinic-'$RANDOM'","email":"test@xear.com","billingEmail":"billing@xear.com","ownerEmail":"owner@xear.com","productCode":"xear_hearing","maxUsers":20,"status":"active","planId":"'$PLAN_ID'"}')
TENANT_ID=$(echo "$tenant_res" | jq -r '.data.id // .id')

if [ "$TENANT_ID" = "null" ] || [ -z "$TENANT_ID" ]; then
    echo "ERROR: Tenant creation failed"
    echo "$tenant_res" | jq '.'
    exit 1
fi

echo "   Tenant created: $TENANT_ID"

# 4. Update test script with tenant ID
echo "4. Updating test script..."
sed -i.bak "s/TN_ID=\".*\"/TN_ID=\"$TENANT_ID\"/" test_all_endpoints_comprehensive.sh

echo ""
echo "========================================="
echo "Setup complete!"
echo "========================================="
echo "Tenant ID: $TENANT_ID"
echo "Plan ID: $PLAN_ID"
echo "========================================="
echo ""
echo "Test script updated. Run: bash test_all_endpoints_comprehensive.sh"
