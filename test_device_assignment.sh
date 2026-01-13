#!/bin/bash

BASE_URL="http://0.0.0.0:5003"
EMAIL="seed-admin@example.com"
PASSWORD="AdminPass123!"

echo "🔹 1. Logging in..."
LOGIN_RESP=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

TOKEN=$(echo $LOGIN_RESP | grep -o '"accessToken": *"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed! Response: $LOGIN_RESP"
  exit 1
fi

# Check if user has tenantId in response
LOGIN_TENANT_ID=$(echo $LOGIN_RESP | grep -o '"tenantId": *"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$LOGIN_TENANT_ID" ] && [ "$LOGIN_TENANT_ID" != "null" ]; then
   echo "✅ User is bound to Tenant ID: $LOGIN_TENANT_ID"
   T_ID="$LOGIN_TENANT_ID"
else
   echo "🔹 1.1 Fetching Tenants (as Admin)..."
   # ... keep existing lookup if needed ...
   TENANTS_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/admin/tenants?limit=1")
   TENANT_ID=$(echo $TENANTS_RESP | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
   
   if [ -z "$TENANT_ID" ]; then
        # ... logic to create ...
        echo "⚠️ No tenants found. Creating 'Test Tenant'..."
        CREATE_T_RESP=$(curl -s -X POST "$BASE_URL/api/admin/tenants" \
          -H "Authorization: Bearer $TOKEN" \
          -H "Content-Type: application/json" \
          -d '{"name": "Test Tenant", "ownerEmail": "test@tenant.com", "status": "active"}')
    
        TENANT_ID=$(echo $CREATE_T_RESP | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)
        if [ -z "$TENANT_ID" ]; then
             echo "❌ Failed to create tenant. Response: $CREATE_T_RESP"
             # Don't exit here, subsequent calls might fail if tenant context needed but maybe we rely on token?
             # actually if we failed to get tenant id, T_ID is empty.
        else
             echo "✅ Created Tenant ID: $TENANT_ID"
             T_ID="$TENANT_ID"
        fi
   else
        echo "✅ Found Tenant ID: $TENANT_ID"
        T_ID="$TENANT_ID"
   fi
fi

echo "🔹 2. Fetching a Patient..."
if [ -n "$T_ID" ]; then
  PATIENTS_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $T_ID" "$BASE_URL/api/patients?per_page=1")
else
  PATIENTS_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/patients?per_page=1")
fi
PATIENT_ID=$(echo $PATIENTS_RESP | grep -o '"id": *"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PATIENT_ID" ]; then
  echo "❌ No patient found. Response: $PATIENTS_RESP"
  exit 1
fi
echo "✅ Found Patient ID: $PATIENT_ID"

echo "🔹 3. Fetching an Inventory Item..."
# We need an available hearing aid
if [ -n "$T_ID" ]; then
  INVENTORY_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" -H "X-Tenant-Id: $T_ID" "$BASE_URL/api/inventory?category=hearing_aid&per_page=1")
else
  INVENTORY_RESP=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/api/inventory?category=hearing_aid&per_page=1")
fi

INVENTORY_ID=$(echo $INVENTORY_RESP | grep -o "\"id\": *\"[^\"]*\"" | head -1 | cut -d'"' -f4)
BRAND=$(echo $INVENTORY_RESP | grep -o "\"brand\": *\"[^\"]*\"" | head -1 | cut -d'"' -f4)
MODEL=$(echo $INVENTORY_RESP | grep -o "\"model\": *\"[^\"]*\"" | head -1 | cut -d'"' -f4)
PRICE=$(echo $INVENTORY_RESP | grep -o "\"price\": *[0-9.]*" | head -1 | cut -d ':' -f2 | tr -d ' ')

if [ -z "$INVENTORY_ID" ]; then
  echo "❌ No inventory item found. Response: $INVENTORY_RESP"
  exit 1
fi
echo "✅ Found Inventory Item: $INVENTORY_ID ($BRAND $MODEL - $PRICE TL)"

echo "🔹 4. Creating Device Assignment..."

if [ -n "$T_ID" ]; then
  HEADER_TENANT="-H \"X-Tenant-Id: $T_ID\""
  # This one is tricky with eval, let's just use if/else for curl command or construct arrays
  # Simpler: define HEADER_ARY
  curl -v -X POST "$BASE_URL/api/devices" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -H "X-Tenant-Id: $T_ID" \
    -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"inventoryId\": \"$INVENTORY_ID\",
    \"brand\": \"$BRAND\",
    \"model\": \"$MODEL\",
    \"type\": \"RIC\",
    \"ear\": \"right\",
    \"status\": \"assigned\",
    \"reason\": \"sale\",
    \"notes\": \"Test assignment via curl\",
    \"price\": ${PRICE:-0},
    \"trialPeriod\": {
      \"startDate\": \"$(date +%Y-%m-%d)\",
      \"endDate\": \"$(date -v+7d +%Y-%m-%d 2>/dev/null || date -d '+7 days' +%Y-%m-%d)\"
    }
  }"
else
  curl -v -X POST "$BASE_URL/api/devices" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"inventoryId\": \"$INVENTORY_ID\",
    \"brand\": \"$BRAND\",
    \"model\": \"$MODEL\",
    \"type\": \"RIC\",
    \"ear\": \"right\",
    \"status\": \"assigned\",
    \"reason\": \"sale\",
    \"notes\": \"Test assignment via curl\",
    \"price\": ${PRICE:-0},
    \"trialPeriod\": {
      \"startDate\": \"$(date +%Y-%m-%d)\",
      \"endDate\": \"$(date -v+7d +%Y-%m-%d 2>/dev/null || date -d '+7 days' +%Y-%m-%d)\"
    }
  }"
fi

echo -e "\n\n✅ Request complete."
