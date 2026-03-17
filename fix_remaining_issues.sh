#!/bin/bash

# Fix Remaining API Test Issues
# Current: 302/513 (58.87%)
# Target: 513/513 (100%)

set -e

BASE_URL="http://localhost:5003"

echo "=========================================="
echo "API Test Issue Resolution"
echo "=========================================="
echo ""

# Get admin token
echo "Step 1: Getting admin token..."
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: login-$(date +%s)" \
  -d '{"email":"admin@x-ear.com","password":"admin123"}' | jq -r '.data.token // .data.accessToken // empty')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Failed to get admin token"
  exit 1
fi
echo "✓ Admin token obtained"

# Get tenant
echo ""
echo "Step 2: Getting tenant..."
TENANT_ID=$(curl -s -X GET "$BASE_URL/api/admin/tenants?page=1&perPage=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data.tenants[0].id // empty')

if [ -z "$TENANT_ID" ]; then
  echo "❌ Failed to get tenant"
  exit 1
fi
echo "✓ Tenant ID: $TENANT_ID"

# Switch to tenant
echo ""
echo "Step 3: Switching to tenant..."
TENANT_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: switch-$(date +%s)" \
  -d "{\"targetTenantId\":\"$TENANT_ID\"}" | jq -r '.data.accessToken // .data.token // empty')

if [ -z "$TENANT_TOKEN" ]; then
  echo "❌ Failed to switch tenant"
  exit 1
fi
echo "✓ Tenant token obtained"

echo ""
echo "=========================================="
echo "Testing Critical Failing Endpoints"
echo "=========================================="

# Test 1: Bulk upload endpoints (422 errors)
echo ""
echo "Test 1: Party bulk upload..."
cat > /tmp/parties_bulk.csv << 'EOF'
firstName,lastName,phone,email
Test,User1,+905551234567,test1@example.com
Test,User2,+905551234568,test2@example.com
EOF

RESULT=$(curl -s -X POST "$BASE_URL/api/parties/bulk-upload" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Idempotency-Key: bulk-$(date +%s)" \
  -F "file=@/tmp/parties_bulk.csv")

echo "$RESULT" | jq -r 'if .success then "✓ Party bulk upload works" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'

# Test 2: Inventory bulk upload
echo ""
echo "Test 2: Inventory bulk upload..."
cat > /tmp/inventory_bulk.csv << 'EOF'
name,sku,category,price,stock
Test Item 1,SKU001,hearing_aid,1000,10
Test Item 2,SKU002,accessory,100,50
EOF

RESULT=$(curl -s -X POST "$BASE_URL/api/inventory/bulk-upload" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Idempotency-Key: bulk-inv-$(date +%s)" \
  -F "file=@/tmp/inventory_bulk.csv")

echo "$RESULT" | jq -r 'if .success then "✓ Inventory bulk upload works" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'

# Test 3: Create party for subsequent tests
echo ""
echo "Test 3: Creating party..."
PARTY_RESULT=$(curl -s -X POST "$BASE_URL/api/parties" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: party-$(date +%s)" \
  -d '{
    "firstName": "Test",
    "lastName": "Patient",
    "phone": "+905551234569",
    "email": "testpatient@example.com",
    "roles": ["PATIENT"]
  }')

PARTY_ID=$(echo "$PARTY_RESULT" | jq -r '.data.party.id // .data.id // empty')

if [ -z "$PARTY_ID" ]; then
  echo "❌ Failed to create party"
  echo "$PARTY_RESULT" | jq .
else
  echo "✓ Party created: $PARTY_ID"
  
  # Test 4: Create hearing profile
  echo ""
  echo "Test 4: Creating hearing profile..."
  PROFILE_RESULT=$(curl -s -X POST "$BASE_URL/api/hearing-profiles" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: profile-$(date +%s)" \
    -d "{
      \"partyId\": \"$PARTY_ID\",
      \"sgkInfo\": {
        \"sgkNumber\": \"12345678901\",
        \"scheme\": \"over18_working\"
      }
    }")
  
  echo "$PROFILE_RESULT" | jq -r 'if .success then "✓ Hearing profile created" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'
  
  # Test 5: Get hearing profile
  echo ""
  echo "Test 5: Getting hearing profile..."
  GET_PROFILE=$(curl -s -X GET "$BASE_URL/api/hearing-profiles/$PARTY_ID" \
    -H "Authorization: Bearer $TENANT_TOKEN")
  
  echo "$GET_PROFILE" | jq -r 'if .success then "✓ Hearing profile retrieved" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'
fi

# Test 6: Create item for sales
echo ""
echo "Test 6: Creating inventory item..."
ITEM_RESULT=$(curl -s -X POST "$BASE_URL/api/inventory" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: item-$(date +%s)" \
  -d '{
    "name": "Test Hearing Aid",
    "sku": "THA-001",
    "category": "hearing_aid",
    "brand": "TestBrand",
    "price": 5000,
    "stock": 10
  }')

ITEM_ID=$(echo "$ITEM_RESULT" | jq -r '.data.item.id // .data.id // empty')

if [ -z "$ITEM_ID" ]; then
  echo "❌ Failed to create item"
  echo "$ITEM_RESULT" | jq .
else
  echo "✓ Item created: $ITEM_ID"
  
  # Test 7: Create sale
  if [ -n "$PARTY_ID" ]; then
    echo ""
    echo "Test 7: Creating sale..."
    SALE_RESULT=$(curl -s -X POST "$BASE_URL/api/sales" \
      -H "Authorization: Bearer $TENANT_TOKEN" \
      -H "Content-Type: application/json" \
      -H "Idempotency-Key: sale-$(date +%s)" \
      -d "{
        \"partyId\": \"$PARTY_ID\",
        \"items\": [{
          \"itemId\": \"$ITEM_ID\",
          \"quantity\": 1,
          \"unitPrice\": 5000
        }],
        \"paymentMethod\": \"cash\"
      }")
    
    SALE_ID=$(echo "$SALE_RESULT" | jq -r '.data.sale.id // .data.id // empty')
    
    if [ -z "$SALE_ID" ]; then
      echo "❌ Failed to create sale"
      echo "$SALE_RESULT" | jq .
    else
      echo "✓ Sale created: $SALE_ID"
      
      # Test 8: Get sale
      echo ""
      echo "Test 8: Getting sale..."
      GET_SALE=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID" \
        -H "Authorization: Bearer $TENANT_TOKEN")
      
      echo "$GET_SALE" | jq -r 'if .success then "✓ Sale retrieved" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'
      
      # Test 9: Update sale
      echo ""
      echo "Test 9: Updating sale..."
      UPDATE_SALE=$(curl -s -X PUT "$BASE_URL/api/sales/$SALE_ID" \
        -H "Authorization: Bearer $TENANT_TOKEN" \
        -H "Content-Type: application/json" \
        -H "Idempotency-Key: update-sale-$(date +%s)" \
        -d "{
          \"status\": \"completed\",
          \"notes\": \"Test update\"
        }")
      
      echo "$UPDATE_SALE" | jq -r 'if .success then "✓ Sale updated" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'
      
      # Test 10: Get sale payments
      echo ""
      echo "Test 10: Getting sale payments..."
      GET_PAYMENTS=$(curl -s -X GET "$BASE_URL/api/sales/$SALE_ID/payments" \
        -H "Authorization: Bearer $TENANT_TOKEN")
      
      echo "$GET_PAYMENTS" | jq -r 'if .success then "✓ Sale payments retrieved" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'
    fi
  fi
  
  # Test 11: Item serials
  echo ""
  echo "Test 11: Adding item serials..."
  SERIALS_RESULT=$(curl -s -X POST "$BASE_URL/api/inventory/$ITEM_ID/serials" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: serials-$(date +%s)" \
    -d '{
      "serials": ["SN001", "SN002", "SN003"]
    }')
  
  echo "$SERIALS_RESULT" | jq -r 'if .success then "✓ Item serials added" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'
  
  # Test 12: Item movements
  echo ""
  echo "Test 12: Getting item movements..."
  MOVEMENTS=$(curl -s -X GET "$BASE_URL/api/inventory/$ITEM_ID/movements" \
    -H "Authorization: Bearer $TENANT_TOKEN")
  
  echo "$MOVEMENTS" | jq -r 'if .success then "✓ Item movements retrieved" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'
fi

# Test 13: Campaign
echo ""
echo "Test 13: Creating campaign..."
CAMPAIGN_RESULT=$(curl -s -X POST "$BASE_URL/api/campaigns" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: campaign-$(date +%s)" \
  -d '{
    "name": "Test Campaign",
    "type": "sms",
    "status": "draft",
    "message": "Test message"
  }')

CAMPAIGN_ID=$(echo "$CAMPAIGN_RESULT" | jq -r '.data.campaign.id // .data.id // empty')

if [ -z "$CAMPAIGN_ID" ]; then
  echo "❌ Failed to create campaign"
  echo "$CAMPAIGN_RESULT" | jq .
else
  echo "✓ Campaign created: $CAMPAIGN_ID"
  
  # Test 14: Send campaign
  echo ""
  echo "Test 14: Sending campaign..."
  SEND_CAMPAIGN=$(curl -s -X POST "$BASE_URL/api/campaigns/$CAMPAIGN_ID/send" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: send-campaign-$(date +%s)" \
    -d '{}')
  
  echo "$SEND_CAMPAIGN" | jq -r 'if .success then "✓ Campaign sent" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'
fi

# Test 15: Device assignment
if [ -n "$PARTY_ID" ]; then
  echo ""
  echo "Test 15: Creating device assignment..."
  DEVICE_RESULT=$(curl -s -X POST "$BASE_URL/api/parties/$PARTY_ID/device-assignments" \
    -H "Authorization: Bearer $TENANT_TOKEN" \
    -H "Content-Type: application/json" \
    -H "Idempotency-Key: device-$(date +%s)" \
    -d "{
      \"deviceType\": \"hearing_aid\",
      \"serialNumber\": \"TEST-SN-001\",
      \"assignmentDate\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"
    }")
  
  echo "$DEVICE_RESULT" | jq -r 'if .success then "✓ Device assigned" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'
fi

# Test 16: AI endpoints
echo ""
echo "Test 16: Testing AI chat..."
AI_CHAT=$(curl -s -X POST "$BASE_URL/api/ai/chat" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: ai-chat-$(date +%s)" \
  -d '{
    "message": "Hello",
    "conversationId": null
  }')

echo "$AI_CHAT" | jq -r 'if .success then "✓ AI chat works" else "❌ Failed: \(.error.message // .message // "Unknown error")" end'

# Test 17: Commission endpoints
echo ""
echo "Test 17: Testing commission update..."
COMMISSION_UPDATE=$(curl -s -X POST "$BASE_URL/api/commissions/update-status" \
  -H "Authorization: Bearer $TENANT_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: comm-update-$(date +%s)" \
  -d '{
    "commissionId": "test-comm-id",
    "status": "paid"
  }')

echo "$COMMISSION_UPDATE" | jq -r 'if .error.message then "❌ Expected error: \(.error.message)" else "✓ Unexpected success" end'

echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Manual tests completed. Check results above."
echo ""
echo "Next: Run full automated test suite:"
echo "  python -m tests.api_testing.cli --base-url $BASE_URL"
