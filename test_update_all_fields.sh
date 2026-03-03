#!/bin/bash

# Test updating ALL fields in sale edit modal
echo "=== Complete Field Update Test ==="
echo ""

TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)

# Get a bilateral sale with SGK
SALE_ID="2603020107"

echo "1. Mevcut satış bilgileri alınıyor (Sale ID: $SALE_ID)..."
CURRENT=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "MEVCUT DEĞERLER:"
echo "$CURRENT" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})
devices = sale.get('devices', [])

print(f\"  Liste Fiyatı: {sale.get('listPriceTotal', 0):.2f} TRY\")
print(f\"  Final Tutar: {sale.get('finalAmount', 0):.2f} TRY\")
print(f\"  İndirim: {sale.get('discountAmount', 0):.2f} TRY\")
print(f\"  SGK Coverage: {sale.get('sgkCoverage', 0):.2f} TRY\")
print(f\"  Ödenen: {sale.get('paidAmount', 0):.2f} TRY\")
print(f\"  Durum: {sale.get('status', 'N/A')}\")
print(f\"  Ödeme Yöntemi: {sale.get('paymentMethod', 'N/A')}\")
print(f\"  Notlar: {sale.get('notes', 'Yok')}\")
print()
print(f\"  Cihaz sayısı: {len(devices)}\")
for i, dev in enumerate(devices, 1):
    print(f\"  Cihaz {i}:\")
    print(f\"    Kulak: {dev.get('ear', 'N/A')}\")
    print(f\"    SGK Scheme: {dev.get('sgkScheme', 'N/A')}\")
    print(f\"    SGK Support: {dev.get('sgkSupport', 0):.2f} TRY\")
    print(f\"    Barkod: {dev.get('barcode', 'N/A')}\")
" 2>/dev/null

echo ""
echo "2. TÜM ALANLARI güncelleyerek test ediliyor..."
echo "   - SGK Scheme: over18_retired → over18_working (3391.36 TRY)"
echo "   - Notlar: Yeni not ekleniyor"
echo "   - Durum: completed → delivered"
echo "   - Ödeme Yöntemi: cash → credit_card"
echo ""

# Update with NEW SGK scheme
IDEMPOTENCY_KEY="full-update-test-$(date +%s)"

UPDATE_RESPONSE=$(curl -s -X PUT "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -d '{
    "listPriceTotal": 10000.0,
    "finalAmount": 6608.64,
    "patientPayment": 6608.64,
    "paidAmount": 5000.0,
    "discountAmount": 0.0,
    "sgkCoverage": 6782.72,
    "notes": "Test - TÜM ALANLAR güncellendi - SGK scheme değiştirildi",
    "status": "delivered",
    "paymentMethod": "credit_card"
  }')

echo "GÜNCELLEME YANITI:"
echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null | head -50
echo ""

SUCCESS=$(echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
    echo "✅ Güncelleme başarılı!"
    echo ""
    
    # Verify update
    echo "3. Güncelleme doğrulanıyor..."
    sleep 1
    
    VERIFY=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "YENİ DEĞERLER:"
    echo "$VERIFY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})
devices = sale.get('devices', [])

print(f\"  Liste Fiyatı: {sale.get('listPriceTotal', 0):.2f} TRY\")
print(f\"  Final Tutar: {sale.get('finalAmount', 0):.2f} TRY\")
print(f\"  İndirim: {sale.get('discountAmount', 0):.2f} TRY\")
print(f\"  SGK Coverage: {sale.get('sgkCoverage', 0):.2f} TRY\")
print(f\"  Ödenen: {sale.get('paidAmount', 0):.2f} TRY\")
print(f\"  Durum: {sale.get('status', 'N/A')}\")
print(f\"  Ödeme Yöntemi: {sale.get('paymentMethod', 'N/A')}\")
print(f\"  Notlar: {sale.get('notes', 'Yok')}\")
print()
print(f\"  Cihaz sayısı: {len(devices)}\")
for i, dev in enumerate(devices, 1):
    print(f\"  Cihaz {i}:\")
    print(f\"    Kulak: {dev.get('ear', 'N/A')}\")
    print(f\"    SGK Scheme: {dev.get('sgkScheme', 'N/A')}\")
    print(f\"    SGK Support: {dev.get('sgkSupport', 0):.2f} TRY\")
    print(f\"    Barkod: {dev.get('barcode', 'N/A')}\")
" 2>/dev/null
    
    echo ""
    echo "4. KONTROL:"
    echo "$VERIFY" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})

issues = []

# Check if fields updated
if sale.get('status') != 'delivered':
    issues.append(f\"❌ Durum güncellenmedi: {sale.get('status')}\")
else:
    print(\"✅ Durum güncellendi: delivered\")

if sale.get('paymentMethod') != 'credit_card':
    issues.append(f\"❌ Ödeme yöntemi güncellenmedi: {sale.get('paymentMethod')}\")
else:
    print(\"✅ Ödeme yöntemi güncellendi: credit_card\")

if 'TÜM ALANLAR' not in sale.get('notes', ''):
    issues.append(f\"❌ Notlar güncellenmedi: {sale.get('notes')}\")
else:
    print(\"✅ Notlar güncellendi\")

if abs(sale.get('paidAmount', 0) - 5000.0) > 0.01:
    issues.append(f\"❌ Ödenen tutar güncellenmedi: {sale.get('paidAmount')}\")
else:
    print(\"✅ Ödenen tutar güncellendi: 5000.0 TRY\")

# SGK scheme check - devices array'de olmalı
devices = sale.get('devices', [])
if devices:
    sgk_schemes = [d.get('sgkScheme') for d in devices]
    print(f\"\\n⚠️  SGK Scheme'ler (devices): {sgk_schemes}\")
    print(\"⚠️  NOT: PUT /api/sales endpoint SGK scheme'i güncelleyemiyor!\")
    print(\"⚠️  SGK scheme device_assignments tablosunda, sales tablosunda değil\")
    print(\"⚠️  Device assignment'ları ayrı güncellemek gerekiyor\")

if issues:
    print()
    for issue in issues:
        print(issue)
" 2>/dev/null
    
else
    echo "❌ Güncelleme başarısız!"
    ERROR=$(echo "$UPDATE_RESPONSE" | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('error', data.get('detail', 'Bilinmeyen hata')))" 2>/dev/null)
    echo "   Hata: $ERROR"
fi

echo ""
echo "=== Test Tamamlandı ==="
