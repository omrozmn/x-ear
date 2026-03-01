#!/bin/bash

TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null)
PARTY_ID="pat_01464a2b"

echo "=========================================="
echo "TEST 1: Device Assignment Form"
echo "POST /parties/{id}/device-assignments"
echo "=========================================="
echo ""

IDEMPOTENCY_KEY=$(uuidgen)
RESPONSE1=$(curl -s -X POST "http://localhost:5003/api/parties/$PARTY_ID/device-assignments" \
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
      "sgkScheme": "over18_working"
    }],
    "sgkScheme": "over18_working",
    "paymentPlan": "cash"
  }')

SALE_ID_1=$(echo "$RESPONSE1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('saleId',''))" 2>/dev/null)
ASSIGNMENT_ID_1=$(echo "$RESPONSE1" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('assignmentIds',[''])[0])" 2>/dev/null)

echo "Created Sale: $SALE_ID_1, Assignment: $ASSIGNMENT_ID_1"
sleep 1

echo "Checking 4 endpoints:"
echo "1️⃣ Device Card:"
curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; [print(f\"  List: {x.get('listPrice')}, SGK: {x.get('sgkSupport')}, Net: {x.get('netPayable')}\") for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID_1']"

echo "2️⃣ Sales History:"
curl -s "http://localhost:5003/api/parties/$PARTY_ID/sales" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); items=d.get('items',[]) if isinstance(d,dict) else d; [print(f\"  Total: {x.get('totalAmount')}, SGK: {x.get('sgkCoverage')}, Final: {x.get('finalAmount')}\") for x in items if x.get('id')=='$SALE_ID_1']"

echo "3️⃣ Sale Detail:"
curl -s "http://localhost:5003/api/sales/$SALE_ID_1" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(f\"  Total: {d.get('totalAmount')}, SGK: {d.get('sgkCoverage')}, Final: {d.get('finalAmount')}\")"

echo "4️⃣ Database:"
sqlite3 apps/api/instance/xear_crm.db "SELECT '  Assign: ' || list_price || ', ' || sgk_support || ', ' || net_payable FROM device_assignments WHERE id='$ASSIGNMENT_ID_1'; SELECT '  Sale: ' || total_amount || ', ' || sgk_coverage || ', ' || final_amount FROM sales WHERE id='$SALE_ID_1';"

echo ""
echo "=========================================="
echo "TEST 2: Sales Form"
echo "POST /sales"
echo "=========================================="
echo ""

IDEMPOTENCY_KEY=$(uuidgen)
RESPONSE2=$(curl -s -X POST "http://localhost:5003/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "partyId": "'$PARTY_ID'",
    "saleDate": "2026-02-28",
    "paymentMethod": "cash",
    "status": "pending"
  }')

SALE_ID_2=$(echo "$RESPONSE2" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('id',''))" 2>/dev/null)

if [ -z "$SALE_ID_2" ]; then
    echo "ERROR: Sales form endpoint might not work this way"
    echo "$RESPONSE2" | python3 -m json.tool | head -20
else
    echo "Created Sale: $SALE_ID_2"
    
    # Check if assignment was created
    ASSIGNMENT_ID_2=$(sqlite3 apps/api/instance/xear_crm.db "SELECT id FROM device_assignments WHERE sale_id='$SALE_ID_2' LIMIT 1;")
    
    if [ -z "$ASSIGNMENT_ID_2" ]; then
        echo "No assignment created - Sales form might work differently"
    else
        echo "Assignment: $ASSIGNMENT_ID_2"
        sleep 1
        
        echo "Checking 4 endpoints:"
        echo "1️⃣ Device Card:"
        curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" -H "Authorization: Bearer $TOKEN" | \
          python3 -c "import sys,json; [print(f\"  List: {x.get('listPrice')}, SGK: {x.get('sgkSupport')}, Net: {x.get('netPayable')}\") for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID_2']"
        
        echo "2️⃣ Sales History:"
        curl -s "http://localhost:5003/api/parties/$PARTY_ID/sales" -H "Authorization: Bearer $TOKEN" | \
          python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); items=d.get('items',[]) if isinstance(d,dict) else d; [print(f\"  Total: {x.get('totalAmount')}, SGK: {x.get('sgkCoverage')}, Final: {x.get('finalAmount')}\") for x in items if x.get('id')=='$SALE_ID_2']"
        
        echo "3️⃣ Sale Detail:"
        curl -s "http://localhost:5003/api/sales/$SALE_ID_2" -H "Authorization: Bearer $TOKEN" | \
          python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(f\"  Total: {d.get('totalAmount')}, SGK: {d.get('sgkCoverage')}, Final: {d.get('finalAmount')}\")"
        
        echo "4️⃣ Database:"
        sqlite3 apps/api/instance/xear_crm.db "SELECT '  Assign: ' || list_price || ', ' || sgk_support || ', ' || net_payable FROM device_assignments WHERE id='$ASSIGNMENT_ID_2'; SELECT '  Sale: ' || total_amount || ', ' || sgk_coverage || ', ' || final_amount FROM sales WHERE id='$SALE_ID_2';"
    fi
fi

echo ""
echo "=========================================="
echo "SUMMARY: Both forms should create consistent data!"
echo "=========================================="
