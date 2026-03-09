#!/bin/bash

# Test script for invoice prefix API endpoints

API_BASE="http://localhost:5003/api"

echo "=== Testing Invoice Prefix API ==="
echo ""

# Step 1: Login to get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Step 2: Get current tenant settings
echo "2. Getting current tenant settings..."
GET_RESPONSE=$(curl -s -X GET "$API_BASE/tenants/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Current settings:"
echo $GET_RESPONSE | python3 -m json.tool 2>/dev/null || echo $GET_RESPONSE
echo ""

# Step 3: Update invoice prefix settings
echo "3. Updating invoice prefix settings..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_BASE/tenants/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "invoice_integration": {
        "use_manual_numbering": true,
        "invoice_prefix": "XER",
        "invoice_prefixes": ["XER", "TST", "ABC"]
      }
    },
    "companyInfo": {
      "defaultExemptionCode": "350"
    }
  }')

echo "Update response:"
echo $UPDATE_RESPONSE | python3 -m json.tool 2>/dev/null || echo $UPDATE_RESPONSE
echo ""

# Step 4: Verify the update
echo "4. Verifying the update..."
VERIFY_RESPONSE=$(curl -s -X GET "$API_BASE/tenants/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Updated settings:"
echo $VERIFY_RESPONSE | python3 -m json.tool 2>/dev/null || echo $VERIFY_RESPONSE
echo ""

echo "=== Test Complete ==="
