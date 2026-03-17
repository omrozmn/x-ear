#!/bin/bash

TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null)

# Mevcut bir bilateral satış bul
SALE_DATA=$(curl -s -X GET "http://localhost:5003/api/sales?page=1&perPage=5" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('data', {}).get('items', [])
for item in items:
    if item.get('sgkCoverage', 0) > 8000:
        print(json.dumps({
            'saleId': item['id'],
            'partyId': item['partyId']
        }))
        break
")

SALE_ID=$(echo "$SALE_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['saleId'])")
PARTY_ID=$(echo "$SALE_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['partyId'])")

echo "=========================================="
echo "CROSS-CHECK TEST"
echo "Sale ID: $SALE_ID"
echo "Party ID: $PARTY_ID"
echo "=========================================="
echo ""

# 1. Get device assignments
echo "1️⃣ GET /parties/$PARTY_ID/devices:"
curl -s -X GET "http://localhost:5003/api/parties/$PARTY_ID/devices" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('data', [])
for item in items:
    if item.get('saleId') == '$SALE_ID':
        print(f\"  Assignment ID: {item.get('id')}\")
        print(f\"  List Price: {item.get('listPrice')}\")
        print(f\"  SGK Support: {item.get('sgkSupport')}\")
        print(f\"  Net Payable: {item.get('netPayable')}\")
        print(f\"  Ear: {item.get('ear')}\")
"
echo ""

# 2. Get sale record
echo "2️⃣ GET /sales/$SALE_ID:"
curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', {})
print(f\"  Sale ID: {data.get('id')}\")
print(f\"  Total Amount: {data.get('totalAmount')}\")
print(f\"  SGK Coverage: {data.get('sgkCoverage')}\")
print(f\"  Final Amount: {data.get('finalAmount')}\")
print(f\"  Paid Amount: {data.get('paidAmount')}\")
"
echo ""

# 3. Get sales history
echo "3️⃣ GET /parties/$PARTY_ID/sales:"
curl -s -X GET "http://localhost:5003/api/parties/$PARTY_ID/sales" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
items = data.get('data', {}).get('items', [])
for item in items:
    if item.get('id') == '$SALE_ID':
        print(f\"  Sale ID: {item.get('id')}\")
        print(f\"  Total Amount: {item.get('totalAmount')}\")
        print(f\"  SGK Coverage: {item.get('sgkCoverage')}\")
        print(f\"  Final Amount: {item.get('finalAmount')}\")
        print(f\"  Paid Amount: {item.get('paidAmount')}\")
"
echo ""

echo "=========================================="
echo "COMPARISON:"
echo "All 3 endpoints should show SAME values!"
echo "=========================================="
