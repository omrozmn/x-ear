#!/bin/bash

TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null)
SALE_ID="2602280125"
ASSIGNMENT_ID="assign_249d2347"

echo "=========================================="
echo "FINAL CONSISTENCY CHECK"
echo "=========================================="
echo ""

echo "Testing reportStatus:"
echo "1. Device Card:"
curl -s "http://localhost:5003/api/parties/pat_01464a2b/devices" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; data=[x for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID']; print(data[0].get('reportStatus') if data else 'NOT FOUND')"

echo "2. Sale Detail:"
curl -s "http://localhost:5003/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; devices=json.load(sys.stdin).get('data',{}).get('devices',[]); print(devices[0].get('reportStatus') if devices else 'NO DEVICES')"

echo "3. Database:"
sqlite3 apps/api/instance/xear_crm.db "SELECT report_status FROM device_assignments WHERE id='$ASSIGNMENT_ID';"

echo ""
echo "Testing deliveryStatus:"
echo "1. Device Card:"
curl -s "http://localhost:5003/api/parties/pat_01464a2b/devices" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; data=[x for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID']; print(data[0].get('deliveryStatus') if data else 'NOT FOUND')"

echo "2. Sale Detail:"
curl -s "http://localhost:5003/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; devices=json.load(sys.stdin).get('data',{}).get('devices',[]); print(devices[0].get('deliveryStatus') if devices else 'NO DEVICES')"

echo "3. Database:"
sqlite3 apps/api/instance/xear_crm.db "SELECT delivery_status FROM device_assignments WHERE id='$ASSIGNMENT_ID';"

echo ""
echo "Testing sgkScheme:"
echo "1. Device Card:"
curl -s "http://localhost:5003/api/parties/pat_01464a2b/devices" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; data=[x for x in json.load(sys.stdin).get('data',[]) if x.get('id')=='$ASSIGNMENT_ID']; print(data[0].get('sgkScheme') if data else 'NOT FOUND')"

echo "2. Sale Detail:"
curl -s "http://localhost:5003/api/sales/$SALE_ID" -H "Authorization: Bearer $TOKEN" | \
  python3 -c "import sys,json; devices=json.load(sys.stdin).get('data',{}).get('devices',[]); print(devices[0].get('sgkScheme') if devices else 'NO DEVICES')"

echo "3. Database:"
sqlite3 apps/api/instance/xear_crm.db "SELECT sgk_scheme FROM device_assignments WHERE id='$ASSIGNMENT_ID';"

echo ""
echo "=========================================="
echo "RESULT: All 3 endpoints should match!"
echo "=========================================="
