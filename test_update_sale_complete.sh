#!/bin/bash

# Complete test of sale update functionality
echo "=== Complete Sale Update Test ==="
echo ""

TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)

if [ -z "$TOKEN" ]; then
    echo "❌ Token alınamadı"
    exit 1
fi

echo "✅ Token alındı"
echo ""

# 1. Get a sale
echo "1. Satış listesi alınıyor..."
SALES=$(curl -s -X GET "http://localhost:5003/api/sales?page=1&per_page=5" \
  -H "Authorization: Bearer $TOKEN")

SALE_ID=$(echo "$SALES" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data['data']) > 0 else '')" 2>/dev/null)

if [ -z "$SALE_ID" ]; then
    echo "❌ Satış bulunamadı"
    exit 1
fi

echo "✅ Satış bulundu: $SALE_ID"
echo ""

# 2. Get sale details
echo "2. Satış detayları alınıyor..."
SALE=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Mevcut satış bilgileri:"
echo "$SALE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})
print(f\"  ID: {sale.get('id')}\"
print(f\"  Liste Fiyatı: {sale.get('listPriceTotal')}\"
print(f\"  Final Tutar: {sale.get('finalAmount')}\"
print(f\"  Ödenen: {sale.get('paidAmount')}\"
print(f\"  SGK: {sale.get('sgkCoverage')}\"
print(f\"  İndirim: {sale.get('discountAmount')}\"
print(f\"  Notlar: {sale.get('notes', 'Yok')}\"
print(f\"  Durum: {sale.get('status')}\"
print(f\"  Ödeme Yöntemi: {sale.get('paymentMethod')}\"
" 2>/dev/null
echo ""

# Extract values
LIST_PRICE=$(echo "$SALE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('listPriceTotal', 0))" 2>/dev/null)
FINAL_AMOUNT=$(echo "$SALE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('finalAmount', 0))" 2>/dev/null)
PAID_AMOUNT=$(echo "$SALE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('paidAmount', 0))" 2>/dev/null)
SGK=$(echo "$SALE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('sgkCoverage', 0))" 2>/dev/null)
DISCOUNT=$(echo "$SALE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('discountAmount', 0))" 2>/dev/null)
STATUS=$(echo "$SALE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('status', 'pending'))" 2>/dev/null)
PAYMENT_METHOD=$(echo "$SALE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('paymentMethod', 'cash'))" 2>/dev/null)

# 3. Test update with same values + new note
echo "3. Satış güncelleniyor (sadece not değişiyor)..."
NEW_NOTE="Test güncelleme - $(date '+%Y-%m-%d %H:%M:%S')"
IDEMPOTENCY_KEY="update-test-$(date +%s)-$(openssl rand -hex 4)"

UPDATE_RESPONSE=$(curl -s -X PUT "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d "{
    \"listPriceTotal\": $LIST_PRICE,
    \"finalAmount\": $FINAL_AMOUNT,
    \"patientPayment\": $FINAL_AMOUNT,
    \"paidAmount\": $PAID_AMOUNT,
    \"discountAmount\": $DISCOUNT,
    \"sgkCoverage\": $SGK,
    \"notes\": \"$NEW_NOTE\",
    \"status\": \"$STATUS\",
    \"paymentMethod\": \"$PAYMENT_METHOD\"
  }")

echo "Güncelleme yanıtı:"
echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null | head -30
echo ""

SUCCESS=$(echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
    echo "✅ Güncelleme başarılı!"
    
    # 4. Verify update
    echo ""
    echo "4. Güncelleme doğrulanıyor..."
    VERIFY=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    UPDATED_NOTE=$(echo "$VERIFY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data'].get('notes', ''))" 2>/dev/null)
    
    if [ "$UPDATED_NOTE" = "$NEW_NOTE" ]; then
        echo "✅ Not başarıyla güncellendi!"
        echo "   Yeni not: $UPDATED_NOTE"
    else
        echo "❌ Not güncellenemedi!"
        echo "   Beklenen: $NEW_NOTE"
        echo "   Bulunan: $UPDATED_NOTE"
    fi
else
    echo "❌ Güncelleme başarısız!"
    ERROR=$(echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error', data.get('detail', 'Bilinmeyen hata')))" 2>/dev/null)
    echo "   Hata: $ERROR"
fi

echo ""
echo "=== Test Tamamlandı ==="
