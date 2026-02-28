#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZWFmYWFkYzYiLCJleHAiOjE3NzIzMTQyMDAsImlhdCI6MTc3MjI4NTQwMCwiYWNjZXNzLnRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSIsInJvbGUiOiJhZG1pbiIsInRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSJ9.ZZPchZ5mvKNLNUgFCSpNUccadStnx-NzKHeR6wTCTak"
PARTY_ID="pat_01464a2b"

echo "═══════════════════════════════════════════════════════════"
echo "🔍 BILATERAL SERI NO VE PEŞİN ÖDEME TEST"
echo "═══════════════════════════════════════════════════════════"
echo ""

# En son satışı al
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" "http://localhost:5003/api/parties/$PARTY_ID/sales")

echo "📊 EN SON 3 SATIŞ:"
echo "$RESPONSE" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sales = data.get('data', [])[:3]

for i, sale in enumerate(sales, 1):
    print(f'\n{"="*60}')
    print(f'SATIŞ {i}: {sale[\"id\"]} - {sale.get(\"saleDate\", \"\")}')
    print(f'{"="*60}')
    
    # Ödeme bilgileri
    print(f'\n💰 ÖDEME BİLGİLERİ:')
    print(f'  Toplam Tutar: {sale.get(\"finalAmount\", 0)} TRY')
    print(f'  Alınan Ödeme: {sale.get(\"paidAmount\", 0)} TRY')
    print(f'  Kalan Tutar: {sale.get(\"remainingAmount\", 0)} TRY')
    print(f'  Payment Records: {len(sale.get(\"paymentRecords\", []))} adet')
    
    if sale.get('paymentRecords'):
        for pr in sale['paymentRecords']:
            print(f'    - {pr.get(\"amount\")} TRY ({pr.get(\"paymentMethod\")}) - {pr.get(\"paymentType\")}')
    
    # Cihaz bilgileri
    devices = sale.get('devices', [])
    print(f'\n🔧 CİHAZ BİLGİLERİ: {len(devices)} adet')
    for j, device in enumerate(devices, 1):
        print(f'\n  Cihaz {j}:')
        print(f'    Marka/Model: {device.get(\"brand\")} {device.get(\"model\")}')
        print(f'    Barkod: {device.get(\"barcode\", \"YOK\")}')
        print(f'    Kulak: {device.get(\"ear\", \"YOK\")}')
        print(f'    Seri No (Tek): {device.get(\"serialNumber\", \"YOK\")}')
        print(f'    Seri No (Sol): {device.get(\"serialNumberLeft\", \"YOK\")}')
        print(f'    Seri No (Sağ): {device.get(\"serialNumberRight\", \"YOK\")}')
"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔍 DATABASE KONTROLÜ"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Database'den direkt kontrol
sqlite3 apps/api/instance/xear_crm.db << 'EOF'
.mode column
.headers on
SELECT 
    id,
    sale_id,
    ear,
    serial_number,
    serial_number_left,
    serial_number_right
FROM device_assignments 
WHERE sale_id IN (
    SELECT id FROM sales 
    WHERE party_id = 'pat_01464a2b' 
    ORDER BY created_at DESC 
    LIMIT 3
)
ORDER BY created_at DESC;
EOF

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "💰 PAYMENT RECORDS KONTROLÜ"
echo "═══════════════════════════════════════════════════════════"
echo ""

sqlite3 apps/api/instance/xear_crm.db << 'EOF'
.mode column
.headers on
SELECT 
    id,
    sale_id,
    amount,
    payment_method,
    payment_type,
    status
FROM payment_records 
WHERE sale_id IN (
    SELECT id FROM sales 
    WHERE party_id = 'pat_01464a2b' 
    ORDER BY created_at DESC 
    LIMIT 3
)
ORDER BY created_at DESC;
EOF

echo ""
echo "✅ Test tamamlandı!"
