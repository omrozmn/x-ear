#!/bin/bash

TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null)
PARTY_ID="pat_01464a2b"

echo "=========================================="
echo "COMPREHENSIVE FIELD CONSISTENCY TEST"
echo "Testing ALL fields across 4 endpoints"
echo "=========================================="
echo ""

# Create a new device assignment with ALL fields populated
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
      "discountValue": 10,
      "sgkScheme": "over18_working",
      "reportStatus": "pending",
      "deliveryStatus": "pending",
      "serialNumber": "TEST123",
      "notes": "Test assignment with all fields"
    }],
    "sgkScheme": "over18_working",
    "paymentPlan": "cash"
  }')

SALE_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('saleId',''))" 2>/dev/null)
ASSIGNMENT_ID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('data',{}).get('assignmentIds',[''])[0])" 2>/dev/null)

if [ -z "$SALE_ID" ] || [ -z "$ASSIGNMENT_ID" ]; then
    echo "❌ Failed to create assignment"
    echo "$RESPONSE" | python3 -m json.tool | head -30
    exit 1
fi

echo "✅ Created Sale: $SALE_ID, Assignment: $ASSIGNMENT_ID"
echo ""
sleep 1

echo "=========================================="
echo "1️⃣ DEVICE CARD (GET /parties/{id}/devices)"
echo "=========================================="
DEVICE_CARD=$(curl -s "http://localhost:5003/api/parties/$PARTY_ID/devices" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; data=json.load(sys.stdin).get('data',[]); item=[x for x in data if x.get('id')=='$ASSIGNMENT_ID']; print(json.dumps(item[0] if item else {}, indent=2))")

echo "$DEVICE_CARD"
echo ""

echo "=========================================="
echo "2️⃣ SALES HISTORY (GET /parties/{id}/sales)"
echo "=========================================="
SALES_HISTORY=$(curl -s "http://localhost:5003/api/parties/$PARTY_ID/sales" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; d=json.load(sys.stdin).get('data',[]); items=d.get('items',[]) if isinstance(d,dict) else d; sale=[x for x in items if x.get('id')=='$SALE_ID']; print(json.dumps(sale[0] if sale else {}, indent=2))")

echo "$SALES_HISTORY"
echo ""

echo "=========================================="
echo "3️⃣ SALE DETAIL (GET /sales/{id})"
echo "=========================================="
SALE_DETAIL=$(curl -s "http://localhost:5003/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; print(json.dumps(json.load(sys.stdin).get('data',{}), indent=2))")

echo "$SALE_DETAIL"
echo ""

echo "=========================================="
echo "4️⃣ DATABASE (Direct Query)"
echo "=========================================="
echo "Assignment:"
sqlite3 apps/api/instance/xear_crm.db "SELECT 
  id,
  list_price,
  sgk_support,
  net_payable,
  report_status,
  delivery_status,
  serial_number,
  notes,
  ear
FROM device_assignments WHERE id='$ASSIGNMENT_ID';" | column -t -s '|'

echo ""
echo "Sale:"
sqlite3 apps/api/instance/xear_crm.db "SELECT 
  id,
  total_amount,
  sgk_coverage,
  final_amount,
  status,
  payment_method
FROM sales WHERE id='$SALE_ID';" | column -t -s '|'

echo ""
echo "=========================================="
echo "FIELD COMPARISON SUMMARY"
echo "=========================================="

# Extract key fields from each endpoint
DC_REPORT=$(echo "$DEVICE_CARD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('reportStatus','N/A'))" 2>/dev/null)
DC_DELIVERY=$(echo "$DEVICE_CARD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('deliveryStatus','N/A'))" 2>/dev/null)
DC_SERIAL=$(echo "$DEVICE_CARD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('serialNumber','N/A'))" 2>/dev/null)
DC_NOTES=$(echo "$DEVICE_CARD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('notes','N/A'))" 2>/dev/null)
DC_EAR=$(echo "$DEVICE_CARD" | python3 -c "import sys,json; print(json.load(sys.stdin).get('ear','N/A'))" 2>/dev/null)

SH_STATUS=$(echo "$SALES_HISTORY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','N/A'))" 2>/dev/null)
SH_PAYMENT=$(echo "$SALES_HISTORY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('paymentMethod','N/A'))" 2>/dev/null)

SD_STATUS=$(echo "$SALE_DETAIL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','N/A'))" 2>/dev/null)
SD_PAYMENT=$(echo "$SALE_DETAIL" | python3 -c "import sys,json; print(json.load(sys.stdin).get('paymentMethod','N/A'))" 2>/dev/null)
SD_ASSIGNMENTS=$(echo "$SALE_DETAIL" | python3 -c "import sys,json; assignments=json.load(sys.stdin).get('deviceAssignments',[]); print(json.dumps(assignments, indent=2))" 2>/dev/null)

DB_REPORT=$(sqlite3 apps/api/instance/xear_crm.db "SELECT report_status FROM device_assignments WHERE id='$ASSIGNMENT_ID';")
DB_DELIVERY=$(sqlite3 apps/api/instance/xear_crm.db "SELECT delivery_status FROM device_assignments WHERE id='$ASSIGNMENT_ID';")
DB_SERIAL=$(sqlite3 apps/api/instance/xear_crm.db "SELECT serial_number FROM device_assignments WHERE id='$ASSIGNMENT_ID';")
DB_EAR=$(sqlite3 apps/api/instance/xear_crm.db "SELECT ear FROM device_assignments WHERE id='$ASSIGNMENT_ID';")

echo ""
echo "📋 Report Status:"
echo "  Device Card:    $DC_REPORT"
echo "  Sale Detail:    (check deviceAssignments array)"
echo "  Database:       $DB_REPORT"
echo ""

echo "📦 Delivery Status:"
echo "  Device Card:    $DC_DELIVERY"
echo "  Sale Detail:    (check deviceAssignments array)"
echo "  Database:       $DB_DELIVERY"
echo ""

echo "🔢 Serial Number:"
echo "  Device Card:    $DC_SERIAL"
echo "  Sale Detail:    (check deviceAssignments array)"
echo "  Database:       $DB_SERIAL"
echo ""

echo "👂 Ear:"
echo "  Device Card:    $DC_EAR"
echo "  Sale Detail:    (check deviceAssignments array)"
echo "  Database:       $DB_EAR"
echo ""

echo "📝 Sale Status:"
echo "  Sales History:  $SH_STATUS"
echo "  Sale Detail:    $SD_STATUS"
echo "  Database:       $(sqlite3 apps/api/instance/xear_crm.db "SELECT status FROM sales WHERE id='$SALE_ID';")"
echo ""

echo "💳 Payment Method:"
echo "  Sales History:  $SH_PAYMENT"
echo "  Sale Detail:    $SD_PAYMENT"
echo "  Database:       $(sqlite3 apps/api/instance/xear_crm.db "SELECT payment_method FROM sales WHERE id='$SALE_ID';")"
echo ""

echo "=========================================="
echo "Sale Detail - Device Assignments Array:"
echo "=========================================="
echo "$SD_ASSIGNMENTS"
echo ""

echo "=========================================="
echo "✅ Test Complete!"
echo "=========================================="
