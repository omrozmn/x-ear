#!/bin/bash

# Create a bilateral sale with SGK to test display
echo "=== Creating Bilateral Sale with SGK ==="
echo ""

TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)

# Get a party
echo "1. Party alınıyor..."
PARTIES=$(curl -s -X GET "http://localhost:5003/api/parties?page=1&per_page=1" \
  -H "Authorization: Bearer $TOKEN")

PARTY_ID=$(echo "$PARTIES" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data['data']) > 0 else '')" 2>/dev/null)

if [ -z "$PARTY_ID" ]; then
    echo "❌ Party bulunamadı"
    exit 1
fi

echo "✅ Party: $PARTY_ID"
echo ""

# Get an inventory item
echo "2. Inventory item alınıyor..."
INVENTORY=$(curl -s -X GET "http://localhost:5003/api/inventory?page=1&per_page=1&category=hearing_aid" \
  -H "Authorization: Bearer $TOKEN")

ITEM_ID=$(echo "$INVENTORY" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data['data']) > 0 else '')" 2>/dev/null)
ITEM_PRICE=$(echo "$INVENTORY" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data'][0]['price'] if data.get('data') and len(data['data']) > 0 else 10000)" 2>/dev/null)

if [ -z "$ITEM_ID" ]; then
    echo "❌ Inventory item bulunamadı"
    exit 1
fi

echo "✅ Item: $ITEM_ID (Fiyat: $ITEM_PRICE TRY)"
echo ""

# Create bilateral sale with SGK
echo "3. Bilateral satış oluşturuluyor (SGK: over18_retired = 4239.20 TRY per ear)..."
SALE_RESPONSE=$(curl -s -X POST "http://localhost:5003/api/sales" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: bilateral-sgk-test-$(date +%s)" \
  -d "{
    \"partyId\": \"$PARTY_ID\",
    \"items\": [
      {
        \"inventoryId\": \"$ITEM_ID\",
        \"quantity\": 1,
        \"earSide\": \"both\",
        \"basePrice\": $ITEM_PRICE,
        \"finalPrice\": $ITEM_PRICE,
        \"sgkScheme\": \"over18_retired\",
        \"discountType\": \"none\",
        \"discountValue\": 0
      }
    ],
    \"paymentMethod\": \"cash\",
    \"notes\": \"Test bilateral sale with SGK\"
  }")

echo "Satış yanıtı:"
echo "$SALE_RESPONSE" | python3 -m json.tool 2>/dev/null | head -40
echo ""

SUCCESS=$(echo "$SALE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
    SALE_ID=$(echo "$SALE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
    echo "✅ Bilateral satış oluşturuldu: $SALE_ID"
    echo ""
    
    # Get sale details to verify
    echo "4. Satış detayları kontrol ediliyor..."
    SALE=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "Bilateral satış SGK bilgileri:"
    echo "$SALE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})
devices = sale.get('devices', [])

print(f\"  Satış ID: {sale.get('id')}\")
print(f\"  Cihaz sayısı: {len(devices)}\")
print()

total_sgk = 0
for i, device in enumerate(devices, 1):
    ear = device.get('ear', 'unknown')
    sgk = device.get('sgkSupport', device.get('sgkCoverageAmount', 0))
    total_sgk += sgk
    print(f\"  Cihaz {i} ({ear}):\")
    print(f\"    SGK Desteği: {sgk:.2f} TRY\")
    print(f\"    SGK Scheme: {device.get('sgkScheme', 'N/A')}\")

print()
print(f\"  TOPLAM SGK: {total_sgk:.2f} TRY\")
print(f\"  Beklenen: 8478.40 TRY (2 x 4239.20)\")
print()

if abs(total_sgk - 8478.40) < 0.01:
    print(\"  ✅ SGK tutarı doğru!\")
else:
    print(f\"  ❌ SGK tutarı yanlış! Beklenen: 8478.40, Bulunan: {total_sgk:.2f}\")
" 2>/dev/null
    
else
    echo "❌ Satış oluşturulamadı"
    ERROR=$(echo "$SALE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error', data.get('detail', 'Bilinmeyen hata')))" 2>/dev/null)
    echo "   Hata: $ERROR"
fi

echo ""
echo "=== Test Tamamlandı ==="
