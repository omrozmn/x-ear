#!/bin/bash
#
# Patient CRUD Operations Test Script
# Tests all CRUD operations via API with curl

set -e

API_BASE="http://localhost:5003/api/v1"
TENANT_ID="tn_kljl9vdwqf"  # QA Test Tenant
AUTH_HEADER="X-Tenant-ID: ${TENANT_ID}"

echo "=================================================="
echo "Patient CRUD Operations Test"
echo "=================================================="
echo ""

# 1. Update existing patient TC number
echo "1. Updating TC number for pat_QA_TEST_SEED to 29507553994..."
UPDATE_RESPONSE=$(curl -s -X PUT "${API_BASE}/parties/pat_QA_TEST_SEED" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -H "Idempotency-Key: update-tc-$(date +%s)" \
  -d '{
    "tcNumber": "29507553994"
  }')

echo "Update Response:"
echo "$UPDATE_RESPONSE" | python3 -m json.tool
echo ""

# Verify the update
echo "1.1 Verifying TC number was updated..."
GET_RESPONSE=$(curl -s -X GET "${API_BASE}/parties/pat_QA_TEST_SEED" \
  -H "${AUTH_HEADER}")

TC_NUMBER=$(echo "$GET_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('tcNumber', 'NOT_FOUND'))")
echo "TC Number after update: $TC_NUMBER"

if [ "$TC_NUMBER" == "29507553994" ]; then
  echo "✅ TC number successfully updated!"
else
  echo "❌ TC number update failed. Current value: $TC_NUMBER"
fi
echo ""

# 2. Create a new patient
echo "2. Creating a new test patient..."
CREATE_RESPONSE=$(curl -s -X POST "${API_BASE}/parties" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -H "Idempotency-Key: create-patient-$(date +%s)" \
  -d '{
    "firstName": "Test",
    "lastName": "Patient CRUD",
    "tcNumber": "12345678901",
    "phone": "+905551234567",
    "email": "test.crud@example.com",
    "gender": "male",
    "birthDate": "1990-01-15",
    "status": "ACTIVE"
  }')

PATIENT_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', 'ERROR'))")
echo "Created Patient ID: $PATIENT_ID"
echo "Create Response:"
echo "$CREATE_RESPONSE" | python3 -m json.tool
echo ""

# 3. Read the created patient
echo "3. Reading the created patient..."
READ_RESPONSE=$(curl -s -X GET "${API_BASE}/parties/${PATIENT_ID}" \
  -H "${AUTH_HEADER}")

echo "Read Response:"
echo "$READ_RESPONSE" | python3 -m json.tool
echo ""

# 4. Update the patient
echo "4. Updating the patient (changing phone and email)..."
UPDATE_NEW_RESPONSE=$(curl -s -X PUT "${API_BASE}/parties/${PATIENT_ID}" \
  -H "Content-Type: application/json" \
  -H "${AUTH_HEADER}" \
  -H "Idempotency-Key: update-patient-$(date +%s)" \
  -d '{
    "phone": "+905559876543",
    "email": "updated.crud@example.com",
    "tcNumber": "98765432109"
  }')

echo "Update Response:"
echo "$UPDATE_NEW_RESPONSE" | python3 -m json.tool
echo ""

# Verify the update
echo "4.1 Verifying update was applied..."
VERIFY_RESPONSE=$(curl -s -X GET "${API_BASE}/parties/${PATIENT_ID}" \
  -H "${AUTH_HEADER}")

UPDATED_PHONE=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('phone', 'ERROR'))")
UPDATED_EMAIL=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('email', 'ERROR'))")
UPDATED_TC=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('tcNumber', 'ERROR'))")

echo "Updated Phone: $UPDATED_PHONE"
echo "Updated Email: $UPDATED_EMAIL"
echo "Updated TC: $UPDATED_TC"

if [ "$UPDATED_PHONE" == "+905559876543" ] && [ "$UPDATED_EMAIL" == "updated.crud@example.com" ] && [ "$UPDATED_TC" == "98765432109" ]; then
  echo "✅ Patient update successful!"
else
  echo "❌ Patient update failed!"
fi
echo ""

# 5. Delete the patient
echo "5. Deleting the test patient..."
DELETE_RESPONSE=$(curl -s -X DELETE "${API_BASE}/parties/${PATIENT_ID}" \
  -H "${AUTH_HEADER}" \
  -H "Idempotency-Key: delete-patient-$(date +%s)")

echo "Delete Response:"
echo "$DELETE_RESPONSE" | python3 -m json.tool
echo ""

# Verify deletion
echo "5.1 Verifying deletion..."
VERIFY_DELETE=$(curl -s -w "\n%{http_code}" -X GET "${API_BASE}/parties/${PATIENT_ID}" \
  -H "${AUTH_HEADER}")

HTTP_CODE=$(echo "$VERIFY_DELETE" | tail -n 1)
if [ "$HTTP_CODE" == "404" ]; then
  echo "✅ Patient successfully deleted!"
else
  echo "❌ Patient deletion failed! HTTP Code: $HTTP_CODE"
fi
echo ""

echo "=================================================="
echo "All CRUD Tests Completed!"
echo "=================================================="
