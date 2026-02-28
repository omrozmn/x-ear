#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZWFmYWFkYzYiLCJleHAiOjE3NzIzMTY2NDQsImlhdCI6MTc3MjI4Nzg0NCwiYWNjZXNzLnRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSIsInJvbGUiOiJhZG1pbiIsInRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSJ9._ojBXleZ7Ls0UOGAe1Lmg6iLp9ey9NkmkPH1LRH62Es"
PARTY_ID="pat_01464a2b"

echo "🔧 Creating sale with down payment..."

# Get inventory item
INVENTORY_ID=$(curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5003/api/inventory?page=1&perPage=1" | \
  python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') else '')")

echo "📦 Using inventory: $INVENTORY_ID"

# Create sale with down payment
IDEMPOTENCY_KEY="downpayment-test-$(date +%s)-$RANDOM"

RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  "http://localhost:5003/api/sales" \
  -d '{
    "partyId": "'$PARTY_ID'",
    "productId": "'$INVENTORY_ID'",
    "salesPrice": 10000,
    "quantity": 1,
    "paymentMethod": "cash",
    "downPayment": 3000,
    "serialNumber": "TEST-SERIAL-999",
    "earSide": "right"
  }')

echo "📝 Response:"
echo "$RESPONSE" | python3 -m json.tool

SALE_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('id', ''))" 2>/dev/null)

if [ -z "$SALE_ID" ]; then
    echo "❌ Sale creation failed!"
    exit 1
fi

echo ""
echo "✅ Sale created: $SALE_ID"
echo ""
echo "🔍 Checking sale details..."

sleep 1

curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5003/api/parties/$PARTY_ID/sales" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
sales = data.get('data', [])

print('\\n📊 CHECKING SALE: $SALE_ID')
print('='*60)
for sale in sales:
    if sale['id'] == '$SALE_ID':
        print(f\"Sale ID: {sale['id']}\")
        print(f\"Final Amount: {sale.get('finalAmount', 0)} TRY\")
        print(f\"Paid Amount: {sale.get('paidAmount', 0)} TRY ({'✅ CORRECT' if sale.get('paidAmount') == 3000 else '❌ WRONG'})\")
        print(f\"Remaining: {sale.get('remainingAmount', 0)} TRY\")
        print(f\"\\nPayment Records: {len(sale.get('paymentRecords', []))} adet\")
        for pr in sale.get('paymentRecords', []):
            print(f\"  - {pr.get('amount')} TRY ({pr.get('paymentMethod')}) - {pr.get('paymentType')}\")
        break
"

echo ""
echo "✅ Test completed!"
