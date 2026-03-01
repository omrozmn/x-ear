#!/bin/bash
# Create FULL device assignment with ALL fields populated (no 0 or NULL)

DB_PATH="x-ear/apps/api/instance/xear_crm.db"
TENANT_ID="95625589-a4ad-41ff-a99e-4955943bb421"
TIMESTAMP=$(date +%y%m%d%H%M%S)

echo "🔍 Getting test data..."

# Get party
PARTY_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM parties WHERE tenant_id='$TENANT_ID' LIMIT 1;")
echo "✅ Party ID: $PARTY_ID"

# Get inventory
INVENTORY_ID=$(sqlite3 "$DB_PATH" "SELECT id FROM inventory WHERE tenant_id='$TENANT_ID' AND category='hearing_aid' LIMIT 1;")
INVENTORY_NAME=$(sqlite3 "$DB_PATH" "SELECT name FROM inventory WHERE id='$INVENTORY_ID';")
INVENTORY_BRAND=$(sqlite3 "$DB_PATH" "SELECT brand FROM inventory WHERE id='$INVENTORY_ID';")
INVENTORY_MODEL=$(sqlite3 "$DB_PATH" "SELECT model FROM inventory WHERE id='$INVENTORY_ID';")
INVENTORY_BARCODE=$(sqlite3 "$DB_PATH" "SELECT barcode FROM inventory WHERE id='$INVENTORY_ID';")
echo "✅ Inventory: $INVENTORY_NAME (ID: $INVENTORY_ID)"

# Create IDs
SALE_ID="TEST-$TIMESTAMP"
ASSIGNMENT_ID="assign_test_$TIMESTAMP"
ASSIGNMENT_UID="ATM-TEST-${TIMESTAMP:6}"

echo ""
echo "📝 Creating sale with ALL fields..."

# Create sale
sqlite3 "$DB_PATH" <<EOF
INSERT INTO sales (
    id, party_id, product_id, tenant_id, sale_date,
    list_price_total, total_amount, discount_amount, final_amount, paid_amount,
    sgk_coverage, patient_payment, status, payment_method,
    kdv_rate, kdv_amount, notes, report_status,
    created_at, updated_at
) VALUES (
    '$SALE_ID', '$PARTY_ID', '$INVENTORY_ID', '$TENANT_ID', datetime('now'),
    30000.0, 30000.0, 2000.0, 28000.0, 5000.0,
    4239.2, 23760.8, 'pending', 'cash',
    20.0, 4666.67, 'Test satış - TÜM ALANLAR DOLU', 'pending',
    datetime('now'), datetime('now')
);
EOF

echo "✅ Sale created: $SALE_ID"
echo "   - List Price: 30000.0"
echo "   - Discount: 2000.0"
echo "   - SGK: 4239.2"
echo "   - Down Payment: 5000.0"
echo "   - KDV: 4666.67 (20%)"

echo ""
echo "📝 Creating device assignment with ALL fields..."

# Create device assignment
sqlite3 "$DB_PATH" <<EOF
INSERT INTO device_assignments (
    id, assignment_uid, party_id, inventory_id, sale_id, tenant_id,
    ear, reason, from_inventory,
    serial_number, serial_number_left, serial_number_right,
    list_price, sale_price, sgk_scheme, sgk_support,
    discount_type, discount_value, net_payable,
    payment_method, delivery_status, report_status,
    brand, model, notes,
    created_at, updated_at
) VALUES (
    '$ASSIGNMENT_ID', '$ASSIGNMENT_UID', '$PARTY_ID', '$INVENTORY_ID', '$SALE_ID', '$TENANT_ID',
    'bilateral', 'Sale', 1,
    'SN-TEST-12345', 'SN-LEFT-67890', 'SN-RIGHT-11111',
    15000.0, 11880.4, 'over18_working', 4239.2,
    'percentage', 10.0, 23760.8,
    'cash', 'pending', 'pending',
    '$INVENTORY_BRAND', '$INVENTORY_MODEL', 'Test atama - TÜM ALANLAR DOLU',
    datetime('now'), datetime('now')
);
EOF

echo "✅ Device assignment created: $ASSIGNMENT_ID"
echo "   Assignment UID: $ASSIGNMENT_UID"
echo "   Ear: bilateral"
echo "   Reason: Sale"
echo "   Serial Number: SN-TEST-12345"
echo "   Serial Left: SN-LEFT-67890"
echo "   Serial Right: SN-RIGHT-11111"
echo "   List Price: 15000.0 (per ear)"
echo "   Sale Price: 11880.4 (per ear)"
echo "   SGK Scheme: over18_working"
echo "   SGK Support: 4239.2 (per ear)"
echo "   Discount Type: percentage"
echo "   Discount Value: 10.0"
echo "   Net Payable: 23760.8 (total)"
echo "   Delivery Status: pending"
echo "   Report Status: pending"
echo "   Brand: $INVENTORY_BRAND"
echo "   Model: $INVENTORY_MODEL"

echo ""
echo "📋 TEST DATA:"
echo "   Party ID: $PARTY_ID"
echo "   Sale ID: $SALE_ID"
echo "   Assignment ID: $ASSIGNMENT_ID"
echo "   Tenant ID: $TENANT_ID"

echo ""
echo "✅ Test data created successfully!"
echo ""
echo "Now verify in frontend:"
echo "1. Go to party page: http://localhost:8080/parties/$PARTY_ID"
echo "2. Check 'Atanmış Cihazlar' tab"
echo "3. Check 'Satış Geçmişi' tab"
echo "4. Click 'Düzenle' on sale: $SALE_ID"
echo "5. Verify ALL fields are populated (no 0 or empty)"
