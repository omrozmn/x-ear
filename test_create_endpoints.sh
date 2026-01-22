#!/bin/bash

TOKEN=$(cat /tmp/tenant_token.txt)
BASE="http://localhost:5003/api"

echo "========================================="
echo "CREATE ENDPOINT TESTS"
echo "========================================="
echo ""

# 1. Create Party
echo "1. Creating Party..."
PARTY_ID=$(curl -s -X POST "$BASE/parties" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-party-$(date +%s)" \
  -d '{"firstName":"API","lastName":"Test","phone":"5559998877","acquisitionType":"tabela","status":"active","segment":"NEW"}' \
  | jq -r '.data.id // "FAILED"')
echo "  Party ID: $PARTY_ID"
echo ""

# 2. Create Inventory Item
echo "2. Creating Inventory Item..."
INV_ID=$(curl -s -X POST "$BASE/inventory" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-inv-$(date +%s)" \
  -d '{"name":"Test Device","category":"hearing_aid","brand":"TestBrand","model":"Model-X","stockQuantity":10,"price":1000,"cost":500}' \
  | jq -r '.data.id // "FAILED"')
echo "  Inventory ID: $INV_ID"
echo ""

# 3. Create Appointment
echo "3. Creating Appointment..."
APP_ID=$(curl -s -X POST "$BASE/appointments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-app-$(date +%s)" \
  -d "{\"partyId\":\"$PARTY_ID\",\"appointmentDate\":\"2026-01-25T10:00:00\",\"appointmentType\":\"hearing_test\",\"status\":\"scheduled\"}" \
  | jq -r '.data.id // "FAILED"')
echo "  Appointment ID: $APP_ID"
echo ""

# 4. Create Campaign
echo "4. Creating Campaign..."
CAMP_ID=$(curl -s -X POST "$BASE/campaigns" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-camp-$(date +%s)" \
  -d '{"name":"Test Campaign","campaignType":"sms","status":"draft","targetSegment":"NEW"}' \
  | jq -r '.data.id // "FAILED"')
echo "  Campaign ID: $CAMP_ID"
echo ""

# 5. Create Supplier
echo "5. Creating Supplier..."
SUPP_ID=$(curl -s -X POST "$BASE/suppliers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-supp-$(date +%s)" \
  -d '{"name":"Test Supplier","contactPerson":"John Doe","phone":"5551112233","email":"supplier@test.com"}' \
  | jq -r '.data.id // "FAILED"')
echo "  Supplier ID: $SUPP_ID"
echo ""

# 6. Create Branch
echo "6. Creating Branch..."
BRANCH_ID=$(curl -s -X POST "$BASE/branches" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: create-branch-$(date +%s)" \
  -d '{"name":"Test Branch","city":"Istanbul","district":"Kadikoy","address":"Test Address","phone":"5551234567"}' \
  | jq -r '.data.id // "FAILED"')
echo "  Branch ID: $BRANCH_ID"
echo ""

echo "========================================="
echo "SUMMARY"
echo "========================================="
echo "Party: $PARTY_ID"
echo "Inventory: $INV_ID"
echo "Appointment: $APP_ID"
echo "Campaign: $CAMP_ID"
echo "Supplier: $SUPP_ID"
echo "Branch: $BRANCH_ID"
echo ""

# Count successes
SUCCESS=0
[ "$PARTY_ID" != "FAILED" ] && SUCCESS=$((SUCCESS+1))
[ "$INV_ID" != "FAILED" ] && SUCCESS=$((SUCCESS+1))
[ "$APP_ID" != "FAILED" ] && SUCCESS=$((SUCCESS+1))
[ "$CAMP_ID" != "FAILED" ] && SUCCESS=$((SUCCESS+1))
[ "$SUPP_ID" != "FAILED" ] && SUCCESS=$((SUCCESS+1))
[ "$BRANCH_ID" != "FAILED" ] && SUCCESS=$((SUCCESS+1))

echo "✅ Success: $SUCCESS/6"
echo "❌ Failed: $((6-SUCCESS))/6"
