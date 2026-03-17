#!/bin/bash

TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null)
IDEMPOTENCY_KEY=$(uuidgen)
PARTY_ID="pat_01464a2b"

echo "Creating NEW sale..."
RESPONSE=$(curl -s -X POST "http://localhost:5003/api/parties/$PARTY_ID/device-assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "deviceAssignments": [{
      "inventoryId": "item_27022026112808_947d3a",
      "ear": "bilateral",
      "basePrice": 15000,
      "discountType": "percentage",
      "discountValue": 0,
      "sgkScheme": "over18_working"
    }],
    "sgkScheme": "over18_working",
    "paymentPlan": "cash"
  }')

SALE_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin).get('data',{}); print(d.get('saleId',''))" 2>/dev/null)
ASSIGNMENT_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; d=json.load(sys.stdin).get('data',{}); print(d.get('assignmentIds',[''])[0])" 2>/dev/null)

echo "Sale ID: $SALE_ID"
echo "Assignment ID: $ASSIGNMENT_ID"
echo ""

if [ -z "$SALE_ID" ]; then
    echo "ERROR: Failed to create sale"
    echo "$RESPONSE" | python3 -m json.tool | head -30
    exit 1
fi

sleep 1

echo "1️⃣ Device Card:"
curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; [print(f\"  List: {x.get('listPrice')}, SGK: {x.get('sgkSupport')}, Net: {x.get('netPayable')}\") for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID']"

echo "2️⃣ Sales History:"
curl -s "http://localhost:5003/api/parties/$PARTY_ID/sales" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); items=d.get('items',[]) if isinstance(d,dict) else d; [print(f\"  Total: {x.get('totalAmount')}, SGK: {x.get('sgkCoverage')}, Final: {x.get('finalAmount')}\") for x in items if x.get('id')=='$SALE_ID']"

echo "3️⃣ Sale Detail:"
curl -s "http://localhost:5003/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(f\"  Total: {d.get('totalAmount')}, SGK: {d.get('sgkCoverage')}, Final: {d.get('finalAmount')}\")"

echo "4️⃣ Database:"
sqlite3 apps/api/instance/xear_crm.db "SELECT '  Assignment: ' || list_price || ', ' || sgk_support || ', ' || net_payable FROM device_assignments WHERE id='$ASSIGNMENT_ID'; SELECT '  Sale: ' || total_amount || ', ' || sgk_coverage || ', ' || final_amount FROM sales WHERE id='$SALE_ID';"

echo ""
echo "All 4 should match!"
