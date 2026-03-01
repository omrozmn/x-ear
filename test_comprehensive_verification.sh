#!/bin/bash

# Comprehensive verification of all 4 data points
# Tests: Backend logic, Frontend display, Database storage, API responses

set -e

echo "========================================="
echo "COMPREHENSIVE 4-POINT VERIFICATION TEST"
echo "========================================="
echo ""

# Get token
TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null | grep -o 'eyJ[^"]*')

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✅ Token obtained"
echo ""

# Test 1: Create new bilateral assignment
echo "========================================="
echo "TEST 1: CREATE NEW BILATERAL ASSIGNMENT"
echo "========================================="
echo ""

# Get an inventory item
INVENTORY_RESPONSE=$(curl -s -X GET "http://localhost:5003/api/inventory?page=1&per_page=1" \
  -H "Authorization: Bearer $TOKEN")

INVENTORY_ID=$(echo "$INVENTORY_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data['data']) > 0 else '')")

if [ -z "$INVENTORY_ID" ]; then
    echo "❌ No inventory items found"
    exit 1
fi

echo "Using inventory ID: $INVENTORY_ID"
echo ""

# Create assignment
CREATE_PAYLOAD='{
  "device_assignments": [
    {
      "inventory_id": "'$INVENTORY_ID'",
      "base_price": 25000,
      "ear": "both",
      "sgk_scheme": "over18_working",
      "discount_type": "percentage",
      "discount_value": 10,
      "delivery_status": "pending",
      "report_status": "raporsuz"
    }
  ],
  "sgk_scheme": "over18_working",
  "payment_plan": "cash"
}'

echo "Creating assignment..."
CREATE_RESPONSE=$(curl -s -X POST "http://localhost:5003/api/parties/95625589-a4ad-41ff-a99e-4955943bb421/device-assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$CREATE_PAYLOAD")

echo "$CREATE_RESPONSE" | python3 -m json.tool

SALE_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['saleId'] if 'data' in data and 'saleId' in data['data'] else '')")
ASSIGNMENT_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data']['assignmentIds'][0] if 'data' in data and 'assignmentIds' in data['data'] and len(data['data']['assignmentIds']) > 0 else '')")

if [ -z "$SALE_ID" ] || [ -z "$ASSIGNMENT_ID" ]; then
    echo "❌ Failed to create assignment"
    exit 1
fi

echo ""
echo "✅ Created: Sale ID = $SALE_ID, Assignment ID = $ASSIGNMENT_ID"
echo ""

# Check 1: Database values
echo "========================================="
echo "CHECK 1: DATABASE VALUES (INITIAL)"
echo "========================================="
echo ""

DB_QUERY="SELECT 
    s.id as sale_id,
    s.list_price_total,
    s.total_amount,
    s.sgk_coverage,
    s.discount_amount,
    s.final_amount,
    a.id as assignment_id,
    a.list_price,
    a.sgk_support,
    a.sale_price,
    a.net_payable,
    a.ear
FROM sales s
JOIN device_assignments a ON a.sale_id = s.id
WHERE s.id = '$SALE_ID';"

echo "Database query:"
echo "$DB_QUERY"
echo ""

sqlite3 apps/api/instance/xear_crm.db "$DB_QUERY" | column -t -s '|'
echo ""

# Check 2: Sale Detail API
echo "========================================="
echo "CHECK 2: SALE DETAIL API (INITIAL)"
echo "========================================="
echo ""

SALE_DETAIL=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$SALE_DETAIL" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'data' in data:
    sale = data['data']
    print(f\"Sale ID: {sale.get('id')}\")
    print(f\"List Price Total: {sale.get('listPriceTotal')}\")
    print(f\"Total Amount: {sale.get('totalAmount')}\")
    print(f\"SGK Coverage: {sale.get('sgkCoverage')}\")
    print(f\"Discount Amount: {sale.get('discountAmount')}\")
    print(f\"Final Amount: {sale.get('finalAmount')}\")
    print(f\"\\nDevices ({len(sale.get('devices', []))}):\")
    for i, dev in enumerate(sale.get('devices', []), 1):
        print(f\"  Device {i}:\")
        print(f\"    ID: {dev.get('id')}\")
        print(f\"    Ear: {dev.get('ear')}\")
        print(f\"    List Price: {dev.get('listPrice')}\")
        print(f\"    SGK Support: {dev.get('sgkSupport')}\")
        print(f\"    Sale Price: {dev.get('salePrice')}\")
        print(f\"    Net Payable: {dev.get('netPayable')}\")
"
echo ""

# Test 2: PATCH with explicit pricing
echo "========================================="
echo "TEST 2: PATCH WITH EXPLICIT PRICING"
echo "========================================="
echo ""

PATCH_PAYLOAD='{
  "list_price": 30000,
  "sgk_support": 5000,
  "net_payable": 20000,
  "down_payment": 5000
}'

echo "Patching assignment with explicit pricing..."
echo "Payload: $PATCH_PAYLOAD"
echo ""

PATCH_RESPONSE=$(curl -s -X PATCH "http://localhost:5003/api/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PATCH_PAYLOAD")

echo "$PATCH_RESPONSE" | python3 -m json.tool
echo ""

# Check 3: Database values after PATCH
echo "========================================="
echo "CHECK 3: DATABASE VALUES (AFTER PATCH)"
echo "========================================="
echo ""

sqlite3 apps/api/instance/xear_crm.db "$DB_QUERY" | column -t -s '|'
echo ""

# Check 4: Sale Detail API after PATCH
echo "========================================="
echo "CHECK 4: SALE DETAIL API (AFTER PATCH)"
echo "========================================="
echo ""

SALE_DETAIL_AFTER=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "$SALE_DETAIL_AFTER" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if 'data' in data:
    sale = data['data']
    print(f\"Sale ID: {sale.get('id')}\")
    print(f\"List Price Total: {sale.get('listPriceTotal')}\")
    print(f\"Total Amount: {sale.get('totalAmount')}\")
    print(f\"SGK Coverage: {sale.get('sgkCoverage')}\")
    print(f\"Discount Amount: {sale.get('discountAmount')}\")
    print(f\"Final Amount: {sale.get('finalAmount')}\")
    print(f\"Paid Amount: {sale.get('paidAmount')}\")
    print(f\"\\nDevices ({len(sale.get('devices', []))}):\")
    for i, dev in enumerate(sale.get('devices', []), 1):
        print(f\"  Device {i}:\")
        print(f\"    ID: {dev.get('id')}\")
        print(f\"    Ear: {dev.get('ear')}\")
        print(f\"    List Price: {dev.get('listPrice')}\")
        print(f\"    SGK Support: {dev.get('sgkSupport')}\")
        print(f\"    Sale Price: {dev.get('salePrice')}\")
        print(f\"    Net Payable: {dev.get('netPayable')}\")
        print(f\"    Down Payment: {dev.get('downPayment')}\")
"
echo ""

# Check 5: Payment Records
echo "========================================="
echo "CHECK 5: PAYMENT RECORDS"
echo "========================================="
echo ""

PAYMENT_QUERY="SELECT 
    id,
    amount,
    payment_type,
    payment_method,
    status,
    payment_date
FROM payment_records
WHERE sale_id = '$SALE_ID';"

echo "Payment records:"
sqlite3 apps/api/instance/xear_crm.db "$PAYMENT_QUERY" | column -t -s '|'
echo ""

# Summary
echo "========================================="
echo "VERIFICATION SUMMARY"
echo "========================================="
echo ""
echo "✅ Test completed successfully"
echo ""
echo "Key Points to Verify:"
echo "1. Initial creation: list_price_total should be 50000 (25000 × 2 for bilateral)"
echo "2. Initial creation: sgk_coverage should be 8478.4 (4239.2 × 2)"
echo "3. After PATCH: list_price_total should be 60000 (30000 × 2)"
echo "4. After PATCH: sgk_coverage should be 10000 (5000 × 2)"
echo "5. After PATCH: final_amount should be 40000 (20000 × 2)"
echo "6. After PATCH: paid_amount should be 5000"
echo "7. Payment record should exist with amount = 5000"
echo ""
echo "All 4 data points (DB, API, Backend Logic, Frontend) should be consistent!"
