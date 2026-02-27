#!/bin/bash
BASE_URL="http://localhost:5003"
SUFFIX=$(date +%s)$RANDOM

# Auth
TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: auth-$SUFFIX" \
  -d '{"email":"admin@xear.com","password":"admin123"}' | jq -r '.data.token')

# Plan
PLAN_DATA='{"name":"Plan '$SUFFIX'","slug":"plan-'$SUFFIX'","planType":"BASIC","price":100,"billingInterval":"YEARLY","maxUsers":10,"isActive":true,"isPublic":true}'
plan_res=$(curl -s -X POST "$BASE_URL/api/admin/plans" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: plan-$SUFFIX" \
  -H "X-Effective-Tenant-Id: system" \
  -d "$PLAN_DATA")
PLAN_ID=$(echo "$plan_res" | jq -r '.data.plan.id // .data.id // .id')

# Tenant
TENANT_DATA='{"name":"Tenant '$SUFFIX'","slug":"tenant-'$SUFFIX'","email":"t'$SUFFIX'@x.com","billingEmail":"b'$SUFFIX'@x.com","ownerEmail":"o'$SUFFIX'@x.com","productCode":"xear_hearing","maxUsers":20,"status":"active","planId":"'$PLAN_ID'"}'
tenant_res=$(curl -s -X POST "$BASE_URL/api/admin/tenants" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: tenant-$SUFFIX" \
  -H "X-Effective-Tenant-Id: system" \
  -d "$TENANT_DATA")
TN_ID=$(echo "$tenant_res" | jq -r '.data.id // .id')

echo "Tenant ID: $TN_ID"

# Party - TEST THIS
echo -e "\n=== Party Creation Test ==="
TCKN="11$(printf "%09d" $RANDOM)"
PARTY_DATA='{"firstName":"Test","lastName":"Party","phone":"+90555'$(printf "%08d" $RANDOM | cut -c1-8)'","email":"party'$SUFFIX'@x.com","tcNumber":"'$TCKN'","status":"active"}'
echo "Request: $PARTY_DATA"
party_res=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$SUFFIX" \
  -H "X-Effective-Tenant-Id: $TN_ID" \
  -d "$PARTY_DATA")
echo "Response:"
echo "$party_res" | jq '.'
P_ID=$(echo "$party_res" | jq -r '.data.id // .id')
echo "Party ID: $P_ID"
