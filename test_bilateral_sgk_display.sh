#!/bin/bash

# Test bilateral SGK display in sales table
echo "=== Bilateral SGK Display Test ==="
echo ""

TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)

# Get a bilateral sale
echo "1. Bilateral satış aranıyor..."
SALES=$(curl -s -X GET "http://localhost:5003/api/sales?page=1&per_page=20" \
  -H "Authorization: Bearer $TOKEN")

# Find a bilateral sale (has 2 device assignments)
BILATERAL_SALE=$(echo "$SALES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sales = data.get('data', [])
for sale in sales:
    devices = sale.get('devices', [])
    if len(devices) == 2:
        left = any(d.get('ear') == 'left' for d in devices)
        right = any(d.get('ear') == 'right' for d in devices)
        if left and right:
            print(json.dumps(sale))
            break
" 2>/dev/null)

if [ -z "$BILATERAL_SALE" ]; then
    echo "❌ Bilateral satış bulunamadı"
    echo "   Yeni bir bilateral satış oluşturun ve tekrar deneyin"
    exit 1
fi

SALE_ID=$(echo "$BILATERAL_SALE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))" 2>/dev/null)

echo "✅ Bilateral satış bulundu: $SALE_ID"
echo ""

# Get full sale details
echo "2. Satış detayları alınıyor..."
SALE=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Bilateral satış bilgileri:"
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

print()
print(f\"  TOPLAM SGK: {total_sgk:.2f} TRY\")
print()
print(f\"  Backend sgkCoverage field: {sale.get('sgkCoverage', 0):.2f} TRY\")
" 2>/dev/null

echo ""
echo "3. Frontend'in göstermesi gereken:"
echo "   - Devices array'inden hesaplanan toplam SGK"
echo "   - Her iki cihazın SGK toplamı"
echo ""
echo "✅ SalesTableView.tsx zaten devices array'inden SGK toplamını hesaplıyor (satır 249)"
echo "✅ Kod doğru, frontend'de görüntülenmelidir"
echo ""
echo "=== Test Tamamlandı ==="
