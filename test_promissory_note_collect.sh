#!/bin/bash

# Test Promissory Note Collection Endpoint
# Tests the /api/promissory-notes/{note_id}/collect endpoint

set -e

echo "🧪 Testing Promissory Note Collection Endpoint"
echo "=============================================="

#!/bin/bash

# Test Promissory Note Collection Endpoint
# Tests the /api/promissory-notes/{note_id}/collect endpoint

set -e

echo "🧪 Testing Promissory Note Collection Endpoint"
echo "=============================================="

# Configuration
API_BASE="http://localhost:5003"
TENANT="deneme"

# Get auth token directly via API
echo "📝 Getting auth token via API..."

LOGIN_RESPONSE=$(curl -s -X POST \
  "$API_BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "tenantId": "95625589-a4ad-41ff-a99e-4955943bb421"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken // .accessToken // empty')

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get auth token"
    echo "Response: $LOGIN_RESPONSE"
    exit 1
fi

echo "✅ Got auth token"

# Step 1: Get a sale with promissory notes
echo ""
echo "📋 Step 1: Finding a sale with promissory notes..."

SALE_ID="2602280104"  # From screenshot
PARTY_ID="pat_01464a2b"  # From screenshot

# Get promissory notes for this sale
echo "🔍 Getting promissory notes for sale $SALE_ID..."

NOTES_RESPONSE=$(curl -s -X GET \
  "$API_BASE/api/sales/$SALE_ID/promissory-notes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

echo "📥 Response:"
echo "$NOTES_RESPONSE" | jq '.'

# Extract first active note ID
NOTE_ID=$(echo "$NOTES_RESPONSE" | jq -r '.data[0].id // empty')

if [ -z "$NOTE_ID" ]; then
    echo "❌ No promissory notes found for sale $SALE_ID"
    echo "Creating test promissory notes first..."
    
    # Create test promissory notes
    CREATE_RESPONSE=$(curl -s -X POST \
      "$API_BASE/api/promissory-notes" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d '{
        "partyId": "'"$PARTY_ID"'",
        "saleId": "'"$SALE_ID"'",
        "totalAmount": 6400,
        "notes": [
          {
            "noteNumber": 1,
            "amount": 6400,
            "issueDate": "2026-02-28T00:00:00Z",
            "dueDate": "2026-03-28T00:00:00Z",
            "debtorName": "deneme hasta",
            "debtorTc": "29783251928",
            "debtorAddress": "DENEME ADRESİ DENEME SOAK NO:1",
            "debtorTaxOffice": "OSMANGAZİ",
            "debtorPhone": "5453434723",
            "hasGuarantor": false,
            "authorizedCourt": "İstanbul (Çağlayan)",
            "fileName": "Senet-deneme-hasta-1.pdf"
          }
        ]
      }')
    
    echo "📥 Create Response:"
    echo "$CREATE_RESPONSE" | jq '.'
    
    NOTE_ID=$(echo "$CREATE_RESPONSE" | jq -r '.data[0].id // empty')
    
    if [ -z "$NOTE_ID" ]; then
        echo "❌ Failed to create test promissory note"
        exit 1
    fi
    
    echo "✅ Created test promissory note: $NOTE_ID"
fi

echo "✅ Found promissory note: $NOTE_ID"

# Step 2: Test collection endpoint
echo ""
echo "💰 Step 2: Testing collection endpoint..."

COLLECT_PAYLOAD='{
  "amount": 1000,
  "paymentMethod": "cash",
  "paymentDate": "2026-02-28T00:00:00Z",
  "referenceNumber": "TEST-COLLECT-001",
  "notes": "Test tahsilat"
}'

echo "📤 Sending collection request..."
echo "Payload:"
echo "$COLLECT_PAYLOAD" | jq '.'

COLLECT_RESPONSE=$(curl -s -X POST \
  "$API_BASE/api/promissory-notes/$NOTE_ID/collect" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$COLLECT_PAYLOAD")

echo ""
echo "📥 Collection Response:"
echo "$COLLECT_RESPONSE" | jq '.'

# Check if successful
SUCCESS=$(echo "$COLLECT_RESPONSE" | jq -r '.success // false')

if [ "$SUCCESS" = "true" ]; then
    echo ""
    echo "✅ Collection successful!"
    
    # Show updated note details
    NOTE_DATA=$(echo "$COLLECT_RESPONSE" | jq '.data.note')
    PAYMENT_DATA=$(echo "$COLLECT_RESPONSE" | jq '.data.payment')
    
    echo ""
    echo "📊 Updated Note:"
    echo "$NOTE_DATA" | jq '.'
    
    echo ""
    echo "💳 Payment Record:"
    echo "$PAYMENT_DATA" | jq '.'
    
    # Extract key info
    NOTE_STATUS=$(echo "$NOTE_DATA" | jq -r '.status')
    PAID_AMOUNT=$(echo "$NOTE_DATA" | jq -r '.paidAmount')
    TOTAL_AMOUNT=$(echo "$NOTE_DATA" | jq -r '.amount')
    
    echo ""
    echo "📈 Summary:"
    echo "  Status: $NOTE_STATUS"
    echo "  Paid: $PAID_AMOUNT TL"
    echo "  Total: $TOTAL_AMOUNT TL"
    echo "  Remaining: $(echo "$TOTAL_AMOUNT - $PAID_AMOUNT" | bc) TL"
else
    echo ""
    echo "❌ Collection failed!"
    ERROR_MSG=$(echo "$COLLECT_RESPONSE" | jq -r '.error.message // .message // "Unknown error"')
    echo "Error: $ERROR_MSG"
    exit 1
fi

echo ""
echo "=============================================="
echo "✅ All tests passed!"
