#!/bin/bash

# Test down payment sync in device assignment update
echo "🧪 Testing Down Payment Sync in Device Assignment Update"

# Get auth token
TOKEN=$(python3 get_token.py)
if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get auth token"
    exit 1
fi

BASE_URL="http://localhost:5003"

# First, create a test sale with device assignment
echo "📝 Creating test sale..."
SALE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partyId": "party_test_123",
    "branchId": "branch_test_123",
    "items": [
      {
        "inventoryId": "inv_test_123",
        "quantity": 1,
        "ear": "LEFT",
        "basePrice": 10000,
        "discountType": "percentage",
        "discountValue": 10,
        "sgkScheme": "over18_working"
      }
    ],
    "paymentMethod": "cash",
    "paidAmount": 2000,
    "notes": "Test sale for down payment sync"
  }')

echo "Sale Response: $SALE_RESPONSE"

# Extract sale ID and device assignment ID
SALE_ID=$(echo "$SALE_RESPONSE" | jq -r '.data.id // empty')
ASSIGNMENT_ID=$(echo "$SALE_RESPONSE" | jq -r '.data.deviceAssignments[0].id // empty')

if [ -z "$SALE_ID" ] || [ -z "$ASSIGNMENT_ID" ]; then
    echo "❌ Failed to create test sale or extract IDs"
    echo "Sale ID: $SALE_ID"
    echo "Assignment ID: $ASSIGNMENT_ID"
    exit 1
fi

echo "✅ Created sale: $SALE_ID with assignment: $ASSIGNMENT_ID"

# Get initial state
echo "📊 Getting initial state..."
INITIAL_SALE=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

INITIAL_ASSIGNMENT=$(curl -s -X GET "$BASE_URL/api/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Initial Sale paid_amount: $(echo "$INITIAL_SALE" | jq -r '.data.paidAmount')"
echo "Initial Assignment: $(echo "$INITIAL_ASSIGNMENT" | jq -r '.data')"

# Test 1: Update down payment via device assignment
echo "🔄 Test 1: Updating down payment to 5000 via device assignment..."
UPDATE_RESPONSE=$(curl -s -X PATCH "$BASE_URL/api/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "downPayment": 5000,
    "notes": "Updated down payment to 5000"
  }')

echo "Update Response: $UPDATE_RESPONSE"

# Check if update was successful
UPDATE_SUCCESS=$(echo "$UPDATE_RESPONSE" | jq -r '.success // false')
if [ "$UPDATE_SUCCESS" != "true" ]; then
    echo "❌ Device assignment update failed"
    echo "Error: $(echo "$UPDATE_RESPONSE" | jq -r '.error.message // "Unknown error"')"
    exit 1
fi

# Get updated state
echo "📊 Getting updated state..."
UPDATED_SALE=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

UPDATED_ASSIGNMENT=$(curl -s -X GET "$BASE_URL/api/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN")

UPDATED_PAID_AMOUNT=$(echo "$UPDATED_SALE" | jq -r '.data.paidAmount')
echo "Updated Sale paid_amount: $UPDATED_PAID_AMOUNT"

# Verify sync worked
if [ "$UPDATED_PAID_AMOUNT" = "5000" ]; then
    echo "✅ Down payment sync SUCCESSFUL: Sale paid_amount updated to 5000"
else
    echo "❌ Down payment sync FAILED: Sale paid_amount is $UPDATED_PAID_AMOUNT, expected 5000"
    
    # Debug: Check payment records
    echo "🔍 Checking payment records..."
    PAYMENTS=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID/payments" \
      -H "Authorization: Bearer $TOKEN")
    echo "Payment records: $(echo "$PAYMENTS" | jq -r '.data')"
    
    exit 1
fi

# Test 2: Update down payment to 0 (should work)
echo "🔄 Test 2: Updating down payment to 0..."
UPDATE_RESPONSE_2=$(curl -s -X PATCH "$BASE_URL/api/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "downPayment": 0,
    "notes": "Reset down payment to 0"
  }')

echo "Update Response 2: $UPDATE_RESPONSE_2"

# Get final state
FINAL_SALE=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

FINAL_PAID_AMOUNT=$(echo "$FINAL_SALE" | jq -r '.data.paidAmount')
echo "Final Sale paid_amount: $FINAL_PAID_AMOUNT"

if [ "$FINAL_PAID_AMOUNT" = "0" ]; then
    echo "✅ Down payment reset SUCCESSFUL: Sale paid_amount updated to 0"
else
    echo "❌ Down payment reset FAILED: Sale paid_amount is $FINAL_PAID_AMOUNT, expected 0"
    exit 1
fi

echo "🎉 All down payment sync tests PASSED!"

# Cleanup
echo "🧹 Cleaning up test data..."
curl -s -X DELETE "$BASE_URL/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

echo "✅ Test completed successfully!"