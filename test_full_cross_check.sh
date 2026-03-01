#!/bin/bash

BASE_URL="http://localhost:5003/api"
TOKEN=$(venv/bin/python gen_token_deneme.py 2>/dev/null)

echo "=========================================="
echo "FULL CROSS-CHECK TEST"
echo "=========================================="
echo ""

# Test 1: Create new device assignment
echo "TEST 1: Creating new bilateral device assignment..."
PARTY_ID="pat_01464a2b"

CREATE_RESPONSE=$(curl -s -X POST "$BASE_URL/device-assignments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "partyId": "'$PARTY_ID'",
    "inventoryId": "inv_test_001",
    "ear": "bilateral",
    "reason": "sale",
    "listPrice": 10000,
    "salePrice": 8000,
    "sgkSupport": 4239.2,
    "netPayable": 3760.8
  }')

ASSIGNMENT_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('id', ''))")
SALE_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('saleId', ''))")

echo "Created Assignment ID: $ASSIGNMENT_ID"
echo "Created Sale ID: $SALE_ID"
echo ""

sleep 1

# Check 4 endpoints
echo "Checking 4 endpoints for consistency..."
echo ""

echo "1️⃣ GET /parties/$PARTY_ID/devices (Device Card Data):"
DEVICES=$(curl -s -X GET "$BASE_URL/parties/$PARTY_ID/devices" \
  -H "Authorization: Bearer $TOKEN")
echo "$DEVICES" | python3 << PYEOF
import sys, json
data = json.loads('''$DEVICES''')
items = data.get('data', [])
for item in items:
    if item.get('id') == '$ASSIGNMENT_ID':
        print(f"  Assignment ID: {item.get('id')}")
        print(f"  List Price: {item.get('listPrice')}")
        print(f"  SGK Support: {item.get('sgkSupport')}")
        print(f"  Net Payable: {item.get('netPayable')}")
        print(f"  Ear: {item.get('ear')}")
PYEOF
echo ""

echo "2️⃣ GET /sales/$SALE_ID (Sale Record):"
SALE=$(curl -s -X GET "$BASE_URL/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "$SALE" | python3 << PYEOF
import sys, json
data = json.loads('''$SALE''').get('data', {})
print(f"  Sale ID: {data.get('id')}")
print(f"  Total Amount: {data.get('totalAmount')}")
print(f"  SGK Coverage: {data.get('sgkCoverage')}")
print(f"  Final Amount: {data.get('finalAmount')}")
PYEOF
echo ""

echo "3️⃣ GET /parties/$PARTY_ID/sales (Sales History Table):"
SALES=$(curl -s -X GET "$BASE_URL/parties/$PARTY_ID/sales" \
  -H "Authorization: Bearer $TOKEN")
echo "$SALES" | python3 << PYEOF
import sys, json
data = json.loads('''$SALES''')
items = data.get('data', {}).get('items', [])
for item in items:
    if item.get('id') == '$SALE_ID':
        print(f"  Sale ID: {item.get('id')}")
        print(f"  Total Amount: {item.get('totalAmount')}")
        print(f"  SGK Coverage: {item.get('sgkCoverage')}")
        print(f"  Final Amount: {item.get('finalAmount')}")
PYEOF
echo ""

echo "4️⃣ GET /device-assignments/$ASSIGNMENT_ID (Assignment Detail):"
ASSIGNMENT=$(curl -s -X GET "$BASE_URL/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "$ASSIGNMENT" | python3 << PYEOF
import sys, json
data = json.loads('''$ASSIGNMENT''').get('data', {})
print(f"  Assignment ID: {data.get('id')}")
print(f"  List Price: {data.get('listPrice')}")
print(f"  SGK Support: {data.get('sgkSupport')}")
print(f"  Net Payable: {data.get('netPayable')}")
print(f"  Sale ID: {data.get('saleId')}")
PYEOF
echo ""

echo "=========================================="
echo "TEST 2: Change device via PATCH assignment"
echo "=========================================="
echo ""

PATCH_RESPONSE=$(curl -s -X PATCH "$BASE_URL/device-assignments/$ASSIGNMENT_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "inventoryId": "inv_test_002",
    "listPrice": 12000,
    "sgkSupport": 5000,
    "netPayable": 7000
  }')

echo "Patched assignment with new device"
sleep 1

echo ""
echo "Re-checking all 4 endpoints..."
echo ""

echo "1️⃣ GET /parties/$PARTY_ID/devices:"
DEVICES2=$(curl -s -X GET "$BASE_URL/parties/$PARTY_ID/devices" \
  -H "Authorization: Bearer $TOKEN")
echo "$DEVICES2" | python3 << PYEOF
import sys, json
data = json.loads('''$DEVICES2''')
items = data.get('data', [])
for item in items:
    if item.get('id') == '$ASSIGNMENT_ID':
        print(f"  List Price: {item.get('listPrice')} (should be 12000)")
        print(f"  SGK Support: {item.get('sgkSupport')} (should be 5000)")
        print(f"  Net Payable: {item.get('netPayable')} (should be 7000)")
PYEOF
echo ""

echo "2️⃣ GET /sales/$SALE_ID:"
SALE2=$(curl -s -X GET "$BASE_URL/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "$SALE2" | python3 << PYEOF
import sys, json
data = json.loads('''$SALE2''').get('data', {})
print(f"  Total Amount: {data.get('totalAmount')} (should be 24000 = 12000*2)")
print(f"  SGK Coverage: {data.get('sgkCoverage')} (should be 10000 = 5000*2)")
print(f"  Final Amount: {data.get('finalAmount')} (should be 14000 = 7000*2)")
PYEOF
echo ""

echo "3️⃣ GET /parties/$PARTY_ID/sales:"
SALES2=$(curl -s -X GET "$BASE_URL/parties/$PARTY_ID/sales" \
  -H "Authorization: Bearer $TOKEN")
echo "$SALES2" | python3 << PYEOF
import sys, json
data = json.loads('''$SALES2''')
items = data.get('data', {}).get('items', [])
for item in items:
    if item.get('id') == '$SALE_ID':
        print(f"  Total Amount: {item.get('totalAmount')} (should be 24000)")
        print(f"  SGK Coverage: {item.get('sgkCoverage')} (should be 10000)")
        print(f"  Final Amount: {item.get('finalAmount')} (should be 14000)")
PYEOF
echo ""

echo "=========================================="
echo "TEST 3: Edit via PUT /sales (Sale Modal)"
echo "=========================================="
echo ""

PUT_RESPONSE=$(curl -s -X PUT "$BASE_URL/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "totalAmount": 30000,
    "sgkCoverage": 12000,
    "finalAmount": 18000,
    "paidAmount": 5000
  }')

echo "Updated sale via PUT"
sleep 1

echo ""
echo "Final check - all 4 endpoints:"
echo ""

echo "1️⃣ GET /parties/$PARTY_ID/devices:"
DEVICES3=$(curl -s -X GET "$BASE_URL/parties/$PARTY_ID/devices" \
  -H "Authorization: Bearer $TOKEN")
echo "$DEVICES3" | python3 << PYEOF
import sys, json
data = json.loads('''$DEVICES3''')
items = data.get('data', [])
for item in items:
    if item.get('id') == '$ASSIGNMENT_ID':
        print(f"  List Price: {item.get('listPrice')}")
        print(f"  SGK Support: {item.get('sgkSupport')}")
        print(f"  Net Payable: {item.get('netPayable')}")
PYEOF
echo ""

echo "2️⃣ GET /sales/$SALE_ID:"
SALE3=$(curl -s -X GET "$BASE_URL/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")
echo "$SALE3" | python3 << PYEOF
import sys, json
data = json.loads('''$SALE3''').get('data', {})
print(f"  Total Amount: {data.get('totalAmount')} (should be 30000)")
print(f"  SGK Coverage: {data.get('sgkCoverage')} (should be 12000)")
print(f"  Final Amount: {data.get('finalAmount')} (should be 18000)")
print(f"  Paid Amount: {data.get('paidAmount')} (should be 5000)")
PYEOF
echo ""

echo "3️⃣ GET /parties/$PARTY_ID/sales:"
SALES3=$(curl -s -X GET "$BASE_URL/parties/$PARTY_ID/sales" \
  -H "Authorization: Bearer $TOKEN")
echo "$SALES3" | python3 << PYEOF
import sys, json
data = json.loads('''$SALES3''')
items = data.get('data', {}).get('items', [])
for item in items:
    if item.get('id') == '$SALE_ID':
        print(f"  Total Amount: {item.get('totalAmount')} (should be 30000)")
        print(f"  SGK Coverage: {item.get('sgkCoverage')} (should be 12000)")
        print(f"  Final Amount: {item.get('finalAmount')} (should be 18000)")
PYEOF
echo ""

echo "=========================================="
echo "SUMMARY: Check if all values match!"
echo "=========================================="
