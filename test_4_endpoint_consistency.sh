#!/bin/bash
# Verify ALL fields are consistent across 4 endpoints

set -e

DB_PATH="x-ear/apps/api/instance/xear_crm.db"
PARTY_ID="pat_01464a2b"
SALE_ID="TEST-260301032514"
ASSIGNMENT_ID="assign_test_260301032514"

echo "🔍 CONSISTENCY CHECK - 4 Endpoints"
echo "=================================="
echo ""

echo "1️⃣ DATABASE (Source of Truth)"
echo "------------------------------"
sqlite3 "$DB_PATH" <<EOF
.mode column
.headers on
SELECT 
    id,
    ear,
    reason,
    delivery_status,
    report_status,
    serial_number,
    serial_number_left,
    serial_number_right,
    list_price,
    sale_price,
    sgk_scheme,
    sgk_support,
    discount_type,
    discount_value,
    net_payable,
    brand,
    model
FROM device_assignments 
WHERE id='$ASSIGNMENT_ID';
EOF

echo ""
echo "Sale table:"
sqlite3 "$DB_PATH" <<EOF
.mode column
.headers on
SELECT 
    id,
    list_price_total,
    discount_amount,
    sgk_coverage,
    paid_amount,
    kdv_rate,
    kdv_amount,
    payment_method,
    status,
    report_status
FROM sales 
WHERE id='$SALE_ID';
EOF

echo ""
echo ""
echo "2️⃣ BACKEND API - _build_device_info_from_assignment"
echo "---------------------------------------------------"
echo "Checking what backend returns in device info..."

# Check backend code
echo "Backend function returns these fields:"
grep -A 100 "def _build_device_info_from_assignment" x-ear/apps/api/routers/sales.py | grep "'" | head -40

echo ""
echo ""
echo "3️⃣ EXPECTED VALUES (After PATCH)"
echo "--------------------------------"
echo "Assignment Fields:"
echo "  - ear: bilateral"
echo "  - reason: Sale"
echo "  - delivery_status: delivered"
echo "  - report_status: received"
echo "  - serial_number: SN-UPDATED-99999"
echo "  - serial_number_left: SN-LEFT-UPDATED"
echo "  - serial_number_right: SN-RIGHT-UPDATED"
echo "  - list_price: 15000.0 (per ear)"
echo "  - sale_price: 10625.4 (per ear)"
echo "  - sgk_scheme: over18_retired"
echo "  - sgk_support: 4239.2 (per ear)"
echo "  - discount_type: percentage"
echo "  - discount_value: 15.0"
echo "  - net_payable: 21250.8 (total)"
echo "  - brand: deneme"
echo "  - model: (empty)"
echo ""
echo "Sale Fields:"
echo "  - list_price_total: 30000.0"
echo "  - discount_amount: 2000.0"
echo "  - sgk_coverage: 4239.2"
echo "  - paid_amount: 5000.0"
echo "  - kdv_rate: 20.0"
echo "  - kdv_amount: 4666.67"
echo ""
echo ""
echo "4️⃣ FRONTEND VERIFICATION CHECKLIST"
echo "-----------------------------------"
echo "✓ Device Card (Atanmış Cihazlar tab):"
echo "  - Shows: bilateral → 2 cards (Sağ + Sol)"
echo "  - Serial Numbers: SN-LEFT-UPDATED, SN-RIGHT-UPDATED"
echo "  - List Price: ₺15.000 (per card)"
echo "  - Sale Price: ₺10.625,4 (per card)"
echo "  - SGK Support: ₺4.239,2 (per card)"
echo "  - Delivery Status: Teslim Edildi"
echo "  - Report Status: Rapor Teslim Alındı"
echo "  - Discount: 15%"
echo ""
echo "✓ Sales History (Satış Geçmişi tab):"
echo "  - Sale ID: TEST-260301032514"
echo "  - List Price: ₺30.000,00 (total)"
echo "  - SGK Support: ₺4.239,20 (per ear, shown as total?)"
echo "  - Discount: ₺2.000,00"
echo "  - Total: ₺30.000,00"
echo "  - Down Payment: ₺5.000,00"
echo "  - Remaining: ₺25.000,00"
echo ""
echo "✓ Sale Detail Modal (Düzenle):"
echo "  - Product: deneme"
echo "  - Category: İşitme Cihazı"
echo "  - Barcode: (from inventory)"
echo "  - Serial Numbers: SN-LEFT-UPDATED, SN-RIGHT-UPDATED"
echo "  - List Price: ₺30.000,00"
echo "  - Discount: ₺2.000,00"
echo "  - Sale Price: ₺28.000,00"
echo "  - SGK Scheme: 18+ Yaş (Emekli)"
echo "  - SGK Support: ₺4.239,20"
echo "  - Down Payment: ₺5.000,00"
echo "  - Total (KDV Dahil %20): ₺30.000,00"
echo "  - KDV Tutarı: ₺4.666,67"
echo "  - Delivery Status: Teslim Edildi"
echo "  - Report Status: Rapor Teslim Alındı"
echo ""
echo "✓ Database Query:"
echo "  - All values match above"
echo ""
echo ""
echo "⚠️  CRITICAL CHECKS:"
echo "-------------------"
echo "1. Backend returns category from inventory? (hearing_aid)"
echo "2. Backend returns barcode from inventory?"
echo "3. Backend returns delivery_status and report_status?"
echo "4. Backend returns serial_number, serial_number_left, serial_number_right?"
echo "5. Backend returns sgk_scheme?"
echo "6. Backend returns discount_type and discount_value?"
echo "7. Backend returns brand and model?"
echo "8. Backend returns down_payment from payment_records?"
echo ""
echo "Run backend and check API response:"
echo "GET /api/sales/$SALE_ID"
echo "GET /api/parties/$PARTY_ID/devices"
