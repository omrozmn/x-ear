#!/bin/bash

TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null)
ASSIGNMENT_ID="assign_8e0edd6d"
SALE_ID="2602280104"
PARTY_ID="pat_01464a2b"

echo "=========================================="
echo "FULL SYNC TEST - 4 Endpoints"
echo "=========================================="
echo ""

# Function to check all 4 endpoints
check_all() {
    local label=$1
    echo "$label"
    echo "----------------------------------------"
    
    # 1. Device Card
    echo "1️⃣ Device Card (GET /parties/$PARTY_ID/devices):"
    curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" \
      -H "Authorization: Bearer $TOKEN" | \
      python3 -c "import sys,json; d=[x for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID'][0]; print(f\"   List: {d.get('listPrice')}, SGK: {d.get('sgkSupport')}, Net: {d.get('netPayable')}\")"
    
    # 2. Sales History
    echo "2️⃣ Sales History (GET /parties/$PARTY_ID/sales):"
    curl -s "http://localhost:5003/api/parties/$PARTY_ID/sales" \
      -H "Authorization: Bearer $TOKEN" | \
      python3 -c "import sys,json; data=json.load(sys.stdin).get('data',[]); items=data.get('items',[]) if isinstance(data,dict) else data; s=[x for x in items if x.get('id')=='$SALE_ID'][0]; print(f\"   Total: {s.get('totalAmount')}, SGK: {s.get('sgkCoverage')}, Final: {s.get('finalAmount')}\")"
    
    # 3. Sale Detail (for Edit Sale Modal)
    echo "3️⃣ Sale Detail (GET /sales/$SALE_ID):"
    curl -s "http://localhost:5003/api/sales/$SALE_ID" \
      -H "Authorization: Bearer $TOKEN" | \
      python3 -c "import sys,json; d=json.load(sys.stdin).get('data',{}); print(f\"   Total: {d.get('totalAmount')}, SGK: {d.get('sgkCoverage')}, Final: {d.get('finalAmount')}\")"
    
    # 4. DB Check
    echo "4️⃣ Database (Direct):"
    sqlite3 apps/api/instance/xear_crm.db "SELECT '   Assignment: ' || list_price || ', ' || sgk_support || ', ' || net_payable FROM device_assignments WHERE id='$ASSIGNMENT_ID'; SELECT '   Sale: ' || total_amount || ', ' || sgk_coverage || ', ' || final_amount FROM sales WHERE id='$SALE_ID';"
    
    echo ""
}

# Initial state
check_all "📊 INITIAL STATE"

# Scenario 1: Change via Assignment Modal (PATCH /device-assignments)
echo "=========================================="
echo "SCENARIO 1: Change via Assignment Modal"
echo "=========================================="
echo ""
echo "Changing: List=12000, SGK=5500, Net=6500..."
IDEMPOTENCY_KEY=$(uuidgen)
curl -s -X PATCH "http://localhost:5003/api/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"listPrice":12000,"sgkSupport":5500,"netPayable":6500}' > /dev/null
echo "✅ PATCH completed"
echo ""
sleep 1

check_all "📊 AFTER ASSIGNMENT MODAL CHANGE"

# Scenario 2: Change via Sale Modal (PUT /sales)
echo "=========================================="
echo "SCENARIO 2: Change via Sale Modal"
echo "=========================================="
echo ""
echo "Changing: Total=30000, SGK=11000, Final=19000..."
IDEMPOTENCY_KEY=$(uuidgen)
curl -s -X PUT "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"totalAmount":30000,"sgkCoverage":11000,"finalAmount":19000,"paidAmount":2300}' > /dev/null
echo "✅ PUT completed"
echo ""
sleep 1

check_all "📊 AFTER SALE MODAL CHANGE"

echo "=========================================="
echo "RESULT: All 4 endpoints should be SYNCED!"
echo "=========================================="
