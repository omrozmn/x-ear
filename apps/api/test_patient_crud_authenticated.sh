#!/bin/bash
#
# Patient CRUD Operations Test Script with Authentication
# Tests all CRUD operations via API with proper JWT authentication

set -e

API_BASE="http://localhost:5003/api"

echo "=================================================="
echo "Patient CRUD Operations Test (Authenticated)"
echo "=================================================="
echo ""

# Login to get JWT token
echo "0. Logging in to get authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@test.com",
    "password": "admin123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('access_token', 'ERROR'))" 2>/dev/null || echo "LOGIN_FAILED")

if [ "$TOKEN" == "LOGIN_FAILED" ] || [ "$TOKEN" == "ERROR" ]; then
  echo "❌ Login failed! Response:"
  echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>&1 || echo "$LOGIN_RESPONSE"
  echo ""
  echo "Trying with test user credentials..."
  
  LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "admin@xear.com",
      "password": "admin"
    }')
  
  TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('access_token', 'ERROR'))" 2>/dev/null || echo "LOGIN_FAILED")
fi

if [ "$TOKEN" == "LOGIN_FAILED" ] || [ "$TOKEN" == "ERROR" ] || [ -z "$TOKEN" ]; then
  echo "❌ Authentication failed. Cannot proceed with tests."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful! Token obtained."
echo "Token: ${TOKEN:0:50}..."
echo ""

AUTH_HEADER="Authorization: Bearer $TOKEN"

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
echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>&1 || echo "$UPDATE_RESPONSE"
echo ""

# Verify the update
echo "1.1 Verifying TC number was updated..."
GET_RESPONSE=$(curl -s -X GET "${API_BASE}/parties/pat_QA_TEST_SEED" \
  -H "${AUTH_HEADER}")

TC_NUMBER=$(echo "$GET_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('tcNumber', 'NOT_FOUND'))" 2>/dev/null || echo "ERROR")
echo "TC Number after update: $TC_NUMBER"

if [ "$TC_NUMBER" == "29507553994" ]; then
  echo "✅ TC number successfully updated!"
else
  echo "❌ TC number update failed. Current value: $TC_NUMBER"
  echo "Full response:"
  echo "$GET_RESPONSE" | python3 -m json.tool 2>&1 || echo "$GET_RESPONSE"
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

PATIENT_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('id', 'ERROR'))" 2>/dev/null || echo "ERROR")
echo "Created Patient ID: $PATIENT_ID"
echo "Create Response:"
echo "$CREATE_RESPONSE" | python3 -m json.tool 2>&1 || echo "$CREATE_RESPONSE"
echo ""

if [ "$PATIENT_ID" == "ERROR" ]; then
  echo "❌ Patient creation failed. Stopping tests."
  exit 1
fi

# 3. Read the created patient
echo "3. Reading the created patient..."
READ_RESPONSE=$(curl -s -X GET "${API_BASE}/parties/${PATIENT_ID}" \
  -H "${AUTH_HEADER}")

echo "Read Response:"
echo "$READ_RESPONSE" | python3 -m json.tool 2>&1 || echo "$READ_RESPONSE"
echo ""

# 4. Update the patient
echo "4. Updating the patient (changing phone, email, and TC)..."
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
echo "$UPDATE_NEW_RESPONSE" | python3 -m json.tool 2>&1 || echo "$UPDATE_NEW_RESPONSE"
echo ""

# Verify the update
echo "4.1 Verifying update was applied..."
VERIFY_RESPONSE=$(curl -s -X GET "${API_BASE}/parties/${PATIENT_ID}" \
  -H "${AUTH_HEADER}")

UPDATED_PHONE=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('phone', 'ERROR'))" 2>/dev/null || echo "ERROR")
UPDATED_EMAIL=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('email', 'ERROR'))" 2>/dev/null || echo "ERROR")
UPDATED_TC=$(echo "$VERIFY_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data.get('data', {}).get('tcNumber', 'ERROR'))" 2>/dev/null || echo "ERROR")

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
echo "$DELETE_RESPONSE" | python3 -m json.tool 2>&1 || echo "$DELETE_RESPONSE"
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
  echo "Response:"
  echo "$VERIFY_DELETE" | head -n -1 | python3 -m json.tool 2>&1 || echo "$VERIFY_DELETE"
fi
echo ""

echo "=================================================="
echo "All CRUD Tests Completed!"
echo "=================================================="
