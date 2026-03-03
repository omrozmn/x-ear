#!/bin/bash

# Test SGK scheme update via PUT /api/sales
echo "=== SGK Scheme Update Test ==="
echo ""

TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)
SALE_ID="2603020107"

echo "1. Mevcut SGK scheme kontrol ediliyor..."
BEFORE=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "ÖNCE:"
echo "$BEFORE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})
devices = sale.get('devices', [])
for i, dev in enumerate(devices, 1):
    print(f\"  Cihaz {i} ({dev.get('ear')}): SGK Scheme = {dev.get('sgkScheme')}, SGK Support = {dev.get('sgkSupport', 0):.2f} TRY\")
" 2>/dev/null

echo ""
echo "2. SGK scheme güncelleniyor: over18_retired → over18_working"
echo "   Beklenen: 4239.20 TRY → 3391.36 TRY (per ear)"
echo ""

UPDATE=$(curl -s -X PUT "http://localhost:5003/api/sales/$SALE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: sgk-scheme-test-$(date +%s)" \
  -d '{
    "listPriceTotal": 10000.0,
    "finalAmount": 6608.64,
    "patientPayment": 6608.64,
    "paidAmount": 5000.0,
    "discountAmount": 0.0,
    "sgkCoverage": 6782.72,
    "notes": "SGK scheme updated to over18_working",
    "status": "delivered",
    "paymentMethod": "credit_card",
    "sgkScheme": "over18_working",
    "serialNumberLeft": "LEFT-12345",
    "serialNumberRight": "RIGHT-67890",
    "deliveryStatus": "delivered",
    "reportStatus": "received"
  }')

SUCCESS=$(echo "$UPDATE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$SUCCESS" = "True" ]; then
    echo "✅ Güncelleme başarılı!"
    echo ""
    
    sleep 1
    
    echo "3. Güncelleme doğrulanıyor..."
    AFTER=$(curl -s -X GET "http://localhost:5003/api/sales/$SALE_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "SONRA:"
    echo "$AFTER" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sale = data.get('data', {})
devices = sale.get('devices', [])

print('Devices:')
for i, dev in enumerate(devices, 1):
    print(f\"  Cihaz {i} ({dev.get('ear')}):\")
    print(f\"    SGK Scheme: {dev.get('sgkScheme')}\")
    print(f\"    SGK Support: {dev.get('sgkSupport', 0):.2f} TRY\")
    print(f\"    Seri No: {dev.get('serialNumber', 'N/A')}\")
    print(f\"    Teslim Durumu: {dev.get('deliveryStatus', 'N/A')}\")
    print(f\"    Rapor Durumu: {dev.get('reportStatus', 'N/A')}\")

print()
print('Kontrol:')
all_correct = True

# Check SGK scheme
for dev in devices:
    if dev.get('sgkScheme') != 'over18_working':
        print(f\"  ❌ SGK Scheme güncellenmedi: {dev.get('sgkScheme')}\")
        all_correct = False
    else:
        print(f\"  ✅ SGK Scheme güncellendi: over18_working\")
        break

# Check SGK support amount
for dev in devices:
    expected = 3391.36
    actual = dev.get('sgkSupport', 0)
    if abs(actual - expected) > 0.01:
        print(f\"  ❌ SGK Support yanlış: {actual:.2f} TRY (beklenen: {expected:.2f})\")
        all_correct = False
    else:
        print(f\"  ✅ SGK Support doğru: {actual:.2f} TRY\")
        break

# Check serial numbers
left_dev = next((d for d in devices if d.get('ear') == 'left'), None)
right_dev = next((d for d in devices if d.get('ear') == 'right'), None)

if left_dev and left_dev.get('serialNumber') == 'LEFT-12345':
    print('  ✅ Sol kulak seri no güncellendi: LEFT-12345')
else:
    print(f\"  ❌ Sol kulak seri no güncellenmedi: {left_dev.get('serialNumber') if left_dev else 'N/A'}\")
    all_correct = False

if right_dev and right_dev.get('serialNumber') == 'RIGHT-67890':
    print('  ✅ Sağ kulak seri no güncellendi: RIGHT-67890')
else:
    print(f\"  ❌ Sağ kulak seri no güncellenmedi: {right_dev.get('serialNumber') if right_dev else 'N/A'}\")
    all_correct = False

# Check delivery status
if all(d.get('deliveryStatus') == 'delivered' for d in devices):
    print('  ✅ Teslim durumu güncellendi: delivered')
else:
    print('  ❌ Teslim durumu güncellenmedi')
    all_correct = False

# Check report status
if all(d.get('reportStatus') == 'received' for d in devices):
    print('  ✅ Rapor durumu güncellendi: received')
else:
    print('  ❌ Rapor durumu güncellenmedi')
    all_correct = False

if all_correct:
    print()
    print('🎉 TÜM ALANLAR BAŞARIYLA GÜNCELLENDİ!')
" 2>/dev/null
    
else
    echo "❌ Güncelleme başarısız!"
    echo "$UPDATE" | python3 -m json.tool 2>/dev/null | head -30
fi

echo ""
echo "=== Test Tamamlandı ==="
