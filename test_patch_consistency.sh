#!/bin/bash

TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null)
PARTY_ID="pat_01464a2b"

echo "=========================================="
echo "PATCH ENDPOINT CONSISTENCY TEST"
echo "=========================================="
echo ""

# Step 1: Create a fresh assignment
echo "Step 1: Creating fresh assignment..."
IDEMPOTENCY_KEY=$(uuidgen)
RESPONSE=$(curl -s -X POST "http://localhost:5003/api/parties/$PARTY_ID/device-assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceAssignments": [{
      "inventoryId": "item_27022026112808_947d3a",
      "ear": "bilateral",
      "basePrice": 20000,
      "discountType": "percentage",
      "discountValue": 0,
      "sgkScheme": "over18_working",
      "reportStatus": "pending",
      "deliveryStatus": "pending"
    }],
    "sgkScheme": "over18_working",
    "paymentPlan": "cash"
  }')

SALE_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('saleId',''))" 2>/dev/null)
ASSIGNMENT_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('assignmentIds',[''])[0])" 2>/dev/null)

if [ -z "$SALE_ID" ] || [ -z "$ASSIGNMENT_ID" ]; then
    echo "❌ Failed to create assignment"
    exit 1
fi

echo "✅ Created Sale: $SALE_ID, Assignment: $ASSIGNMENT_ID"
echo ""
sleep 1

# Step 2: Check initial values
echo "Step 2: Initial values (should all be 'pending')..."
echo "Device Card reportStatus: $(curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; data=[x for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID']; print(data[0].get('reportStatus') if data else 'NOT FOUND')")"
echo "Sale Detail reportStatus: $(curl -s "http://localhost:5003/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; devices=json.load(sys.stdin).get('data',{}).get('devices',[]); print(devices[0].get('reportStatus') if devices else 'NO DEVICES')")"
echo "Database reportStatus: $(sqlite3 apps/api/instance/xear_crm.db "SELECT report_status FROM device_assignments WHERE id='$ASSIGNMENT_ID';")"
echo ""

# Step 3: PATCH to change reportStatus to 'completed'
echo "Step 3: PATCH reportStatus to 'completed'..."
PATCH_RESPONSE=$(curl -s -X PATCH "http://localhost:5003/api/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "reportStatus": "completed"
  }')

echo "PATCH Response:"
echo "$PATCH_RESPONSE" | python3 -m json.tool | head -20
echo ""
sleep 1

# Step 4: Check updated values
echo "Step 4: After PATCH (should all be 'completed')..."
DC_REPORT=$(curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; data=[x for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID']; print(data[0].get('reportStatus') if data else 'NOT FOUND')")
SD_REPORT=$(curl -s "http://localhost:5003/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; devices=json.load(sys.stdin).get('data',{}).get('devices',[]); print(devices[0].get('reportStatus') if devices else 'NO DEVICES')")
DB_REPORT=$(sqlite3 apps/api/instance/xear_crm.db "SELECT report_status FROM device_assignments WHERE id='$ASSIGNMENT_ID';")

echo "Device Card reportStatus: $DC_REPORT"
echo "Sale Detail reportStatus: $SD_REPORT"
echo "Database reportStatus: $DB_REPORT"
echo ""

# Step 5: PATCH to change deliveryStatus to 'delivered'
echo "Step 5: PATCH deliveryStatus to 'delivered'..."
PATCH_RESPONSE2=$(curl -s -X PATCH "http://localhost:5003/api/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "deliveryStatus": "delivered"
  }')

echo "PATCH Response:"
echo "$PATCH_RESPONSE2" | python3 -m json.tool | head -20
echo ""
sleep 1

# Step 6: Check updated values
echo "Step 6: After PATCH (deliveryStatus should be 'delivered')..."
DC_DELIVERY=$(curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; data=[x for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID']; print(data[0].get('deliveryStatus') if data else 'NOT FOUND')")
SD_DELIVERY=$(curl -s "http://localhost:5003/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json; devices=json.load(sys.stdin).get('data',{}).get('devices',[]); print(devices[0].get('deliveryStatus') if devices else 'NO DEVICES')")
DB_DELIVERY=$(sqlite3 apps/api/instance/xear_crm.db "SELECT delivery_status FROM device_assignments WHERE id='$ASSIGNMENT_ID';")

echo "Device Card deliveryStatus: $DC_DELIVERY"
echo "Sale Detail deliveryStatus: $SD_DELIVERY"
echo "Database deliveryStatus: $DB_DELIVERY"
echo ""

# Step 7: PATCH pricing fields (listPrice, sgkSupport, netPayable)
echo "Step 7: PATCH pricing fields..."
PATCH_RESPONSE3=$(curl -s -X PATCH "http://localhost:5003/api/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $(uuidgen)" \
  -H "Content-Type: application/json" \
  -d '{
    "listPrice": 25000,
    "sgkSupport": 5000,
    "netPayable": 20000
  }')

echo "PATCH Response:"
echo "$PATCH_RESPONSE3" | python3 -m json.tool | head -30
echo ""
sleep 1

# Step 8: Check pricing values
echo "Step 8: After PATCH (pricing should be updated)..."
echo "Device Card:"
curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; data=[x for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID']; item=data[0] if data else {}; print(f\"  listPrice: {item.get('listPrice')}, sgkSupport: {item.get('sgkSupport')}, netPayable: {item.get('netPayable')}\")"

echo "Sale Detail:"
curl -s "http://localhost:5003/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; devices=json.load(sys.stdin).get('data',{}).get('devices',[]); item=devices[0] if devices else {}; print(f\"  listPrice: {item.get('listPrice')}, sgkSupport: {item.get('sgkSupport')}, netPayable: {item.get('netPayable')}\")"

echo "Database:"
sqlite3 apps/api/instance/xear_crm.db "SELECT '  listPrice: ' || list_price || ', sgkSupport: ' || sgk_support || ', netPayable: ' || net_payable FROM device_assignments WHERE id='$ASSIGNMENT_ID';"

echo "Sale totals (should be updated via sync):"
sqlite3 apps/api/instance/xear_crm.db "SELECT '  totalAmount: ' || total_amount || ', sgkCoverage: ' || sgk_coverage || ', finalAmount: ' || final_amount FROM sales WHERE id='$SALE_ID';"

echo ""
echo "=========================================="
echo "SUMMARY"
echo "=========================================="
echo ""
echo "✅ reportStatus: $DC_REPORT = $SD_REPORT = $DB_REPORT"
echo "✅ deliveryStatus: $DC_DELIVERY = $SD_DELIVERY = $DB_DELIVERY"
echo ""
echo "Storage Convention:"
echo "  - listPrice: per-ear value"
echo "  - sgkSupport: per-ear value"
echo "  - netPayable: TOTAL value (already includes bilateral multiplier)"
echo ""
echo "Expected pricing (bilateral):"
echo "  Assignment: listPrice=25000 (per-ear), sgk=5000 (per-ear), net=20000 (total)"
echo "  Sale: total=50000 (25000×2), sgk=10000 (5000×2), final=20000 (not multiplied)"
echo ""
echo "If all values match across 3 endpoints, PATCH is working correctly!"
