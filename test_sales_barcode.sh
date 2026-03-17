#!/bin/bash

# Test script for sales barcode/serial number data
# Usage: ./test_sales_barcode.sh

set -e

BASE_URL="http://localhost:5003"
API_URL="${BASE_URL}/api"

echo "🔍 Testing Sales Barcode/Serial Number Data"
echo "==========================================="
echo ""

# Test credentials
EMAIL="admin@test.com"
PASSWORD="admin123"

echo "📝 Step 1: Getting authentication token..."
TOKEN_RESPONSE=$(curl -s -X POST "${API_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $TOKEN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  echo "Response: $TOKEN_RESPONSE"
  exit 1
fi

echo "✅ Token obtained"
echo ""

echo "📝 Step 2: Fetching sales list..."
SALES_RESPONSE=$(curl -s -X GET "${API_URL}/sales?page=1&perPage=5" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

echo "📊 Sales Response:"
echo "$SALES_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$SALES_RESPONSE"
echo ""

# Check if devices array exists and has barcode/serialNumber
echo "🔍 Checking for barcode/serialNumber in devices..."
HAS_DEVICES=$(echo "$SALES_RESPONSE" | grep -o '"devices"' | wc -l)
HAS_BARCODE=$(echo "$SALES_RESPONSE" | grep -o '"barcode"' | wc -l)
HAS_SERIAL=$(echo "$SALES_RESPONSE" | grep -o '"serialNumber"' | wc -l)

echo "Devices found: $HAS_DEVICES"
echo "Barcode fields found: $HAS_BARCODE"
echo "SerialNumber fields found: $HAS_SERIAL"
echo ""

if [ "$HAS_DEVICES" -gt 0 ]; then
  echo "✅ Devices array exists in response"
else
  echo "⚠️  No devices array found in response"
fi

if [ "$HAS_BARCODE" -gt 0 ]; then
  echo "✅ Barcode field exists in devices"
else
  echo "⚠️  No barcode field found in devices"
fi

if [ "$HAS_SERIAL" -gt 0 ]; then
  echo "✅ SerialNumber field exists in devices"
else
  echo "⚠️  No serialNumber field found in devices"
fi

echo ""
echo "📝 Step 3: Fetching a specific party's sales..."

# Get first party ID from parties list
PARTIES_RESPONSE=$(curl -s -X GET "${API_URL}/parties?page=1&perPage=1" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json")

PARTY_ID=$(echo $PARTIES_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$PARTY_ID" ]; then
  echo "⚠️  No parties found, skipping party sales test"
else
  echo "Testing with party ID: $PARTY_ID"
  
  PARTY_SALES_RESPONSE=$(curl -s -X GET "${API_URL}/parties/${PARTY_ID}/sales" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json")
  
  echo "📊 Party Sales Response:"
  echo "$PARTY_SALES_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PARTY_SALES_RESPONSE"
  echo ""
  
  # Check devices in party sales
  PARTY_HAS_DEVICES=$(echo "$PARTY_SALES_RESPONSE" | grep -o '"devices"' | wc -l)
  PARTY_HAS_BARCODE=$(echo "$PARTY_SALES_RESPONSE" | grep -o '"barcode"' | wc -l)
  PARTY_HAS_SERIAL=$(echo "$PARTY_SALES_RESPONSE" | grep -o '"serialNumber"' | wc -l)
  
  echo "Party Sales - Devices found: $PARTY_HAS_DEVICES"
  echo "Party Sales - Barcode fields found: $PARTY_HAS_BARCODE"
  echo "Party Sales - SerialNumber fields found: $PARTY_HAS_SERIAL"
fi

echo ""
echo "✅ Test completed!"
echo ""
echo "📋 Summary:"
echo "- If barcode/serialNumber fields are present in API response, frontend should display them"
echo "- If fields are missing, backend schema needs to be updated"
echo "- Check SaleRead schema in apps/api/schemas/sales.py"
