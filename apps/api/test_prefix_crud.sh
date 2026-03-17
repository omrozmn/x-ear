#!/bin/bash
# Test invoice prefix CRUD operations

API_BASE="http://localhost:5003/api"

echo "=== Testing Invoice Prefix CRUD ==="
echo ""

# Step 1: Login (you need to update credentials)
echo "1. Login..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('accessToken', ''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Update credentials in script."
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

# Step 2: Get current settings
echo "2. Get current tenant settings..."
CURRENT=$(curl -s -X GET "$API_BASE/tenants/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Current settings:"
echo "$CURRENT" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('data', {}).get('settings', {}), indent=2))"
echo ""

# Step 3: Add prefix
echo "3. Adding invoice prefix 'XER'..."
ADD_RESPONSE=$(curl -s -X PATCH "$API_BASE/tenants/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "invoice_integration": {
        "invoice_prefix": "XER",
        "invoice_prefixes": ["XER", "TST"]
      }
    }
  }')

echo "Add response:"
echo "$ADD_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('data', {}).get('settings', {}), indent=2))"
echo ""

# Step 4: Update prefix
echo "4. Updating prefixes (add 'ABC')..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$API_BASE/tenants/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "invoice_integration": {
        "invoice_prefix": "XER",
        "invoice_prefixes": ["XER", "TST", "ABC"]
      }
    }
  }')

echo "Update response:"
echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('data', {}).get('settings', {}), indent=2))"
echo ""

# Step 5: Verify
echo "5. Verifying changes..."
VERIFY=$(curl -s -X GET "$API_BASE/tenants/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "Final settings:"
echo "$VERIFY" | python3 -c "import sys, json; data = json.load(sys.stdin); settings = data.get('data', {}).get('settings', {}); invoice = settings.get('invoice_integration', {}); print('invoice_prefix:', invoice.get('invoice_prefix')); print('invoice_prefixes:', invoice.get('invoice_prefixes'))"
echo ""

# Step 6: Delete (set to empty)
echo "6. Removing all prefixes..."
DELETE_RESPONSE=$(curl -s -X PATCH "$API_BASE/tenants/current" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "invoice_integration": {
        "invoice_prefix": "XER",
        "invoice_prefixes": []
      }
    }
  }')

echo "Delete response:"
echo "$DELETE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(json.dumps(data.get('data', {}).get('settings', {}), indent=2))"
echo ""

echo "✅ Test completed!"
