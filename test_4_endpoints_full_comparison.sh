#!/bin/bash

# Test 4 endpoints for consistency
# 1. Device Card: GET /api/parties/{party_id}/devices
# 2. Sales History: GET /api/sales
# 3. Sale Detail: GET /api/sales/{sale_id}
# 4. Database: Direct query

PARTY_ID="pat_01464a2b"
SALE_ID="2603010102"
TOKEN=$(python3 gen_token_deneme.py 2>&1 | tail -1)

echo "=========================================="
echo "TEST: 4 Endpoint Consistency Check"
echo "=========================================="
echo ""

echo "1️⃣  DEVICE CARD: GET /api/parties/$PARTY_ID/devices"
echo "=========================================="
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5003/api/parties/$PARTY_ID/devices" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['success'] and data['data']:
    for device in data['data']:
        if device['saleId'] == '$SALE_ID':
            print(f\"Assignment ID: {device['id']}\")
            print(f\"Device Name: {device['deviceName']}\")
            print(f\"Barcode: {device['barcode']}\")
            print(f\"Serial Number: {device['serialNumber']}\")
            print(f\"Reason: {device['reason']}\")
            print(f\"Category: {device.get('category', 'N/A')}\")
            print(f\"List Price: {device['listPrice']}\")
            print(f\"Sale Price: {device['salePrice']}\")
            print(f\"SGK Support: {device['sgkSupport']}\")
            print(f\"SGK Scheme: {device['sgkScheme']}\")
            print(f\"Discount Type: {device['discountType']}\")
            print(f\"Discount Value: {device['discountValue']}\")
            print(f\"Net Payable: {device['netPayable']}\")
            print(f\"Down Payment: {device['downPayment']}\")
            print(f\"Payment Method: {device['paymentMethod']}\")
            print(f\"Delivery Status: {device['deliveryStatus']}\")
            print(f\"Report Status: {device['reportStatus']}\")
            print(f\"Is Loaner: {device['isLoaner']}\")
            break
"
echo ""

echo "2️⃣  SALES HISTORY: GET /api/sales?partyId=$PARTY_ID"
echo "=========================================="
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5003/api/sales?partyId=$PARTY_ID" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['success'] and data['data']:
    for sale in data['data']:
        if sale['id'] == '$SALE_ID':
            print(f\"Sale ID: {sale['id']}\")
            print(f\"Product Name: {sale.get('productName', 'N/A')}\")
            print(f\"Barcode: {sale.get('barcode', 'N/A')}\")
            print(f\"Serial Number: {sale.get('serialNumber', 'N/A')}\")
            print(f\"Category: {sale.get('category', 'N/A')}\")
            print(f\"List Price: {sale.get('listPrice', 'N/A')}\")
            print(f\"Sale Price: {sale.get('salePrice', 'N/A')}\")
            print(f\"SGK Support: {sale.get('sgkSupport', 'N/A')}\")
            print(f\"Discount: {sale.get('discount', 'N/A')}\")
            print(f\"Total Amount: {sale.get('totalAmount', 'N/A')}\")
            print(f\"Paid Amount: {sale.get('paidAmount', 'N/A')}\")
            print(f\"Remaining: {sale.get('remainingAmount', 'N/A')}\")
            print(f\"Payment Status: {sale.get('paymentStatus', 'N/A')}\")
            print(f\"Invoice Status: {sale.get('invoiceStatus', 'N/A')}\")
            break
"
echo ""

echo "3️⃣  SALE DETAIL: GET /api/sales/$SALE_ID"
echo "=========================================="
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:5003/api/sales/$SALE_ID" | \
  python3 -c "
import sys, json
data = json.load(sys.stdin)
if data['success'] and data['data']:
    sale = data['data']
    print(f\"Sale ID: {sale['id']}\")
    print(f\"Product Name: {sale.get('productName', 'N/A')}\")
    print(f\"Brand: {sale.get('brand', 'N/A')}\")
    print(f\"Model: {sale.get('model', 'N/A')}\")
    print(f\"Barcode: {sale.get('barcode', 'N/A')}\")
    print(f\"Serial Number: {sale.get('serialNumber', 'N/A')}\")
    print(f\"Category: {sale.get('category', 'N/A')}\")
    print(f\"List Price: {sale.get('listPrice', 'N/A')}\")
    print(f\"Sale Price: {sale.get('salePrice', 'N/A')}\")
    print(f\"SGK Support: {sale.get('sgkSupport', 'N/A')}\")
    print(f\"SGK Scheme: {sale.get('sgkScheme', 'N/A')}\")
    print(f\"Discount Type: {sale.get('discountType', 'N/A')}\")
    print(f\"Discount Value: {sale.get('discountValue', 'N/A')}\")
    print(f\"Down Payment: {sale.get('downPayment', 'N/A')}\")
    print(f\"Total Amount: {sale.get('totalAmount', 'N/A')}\")
    print(f\"Paid Amount: {sale.get('paidAmount', 'N/A')}\")
    print(f\"Remaining: {sale.get('remainingAmount', 'N/A')}\")
    print(f\"Payment Method: {sale.get('paymentMethod', 'N/A')}\")
    print(f\"Payment Status: {sale.get('paymentStatus', 'N/A')}\")
    print(f\"Delivery Status: {sale.get('deliveryStatus', 'N/A')}\")
    print(f\"Report Status: {sale.get('reportStatus', 'N/A')}\")
    print(f\"Invoice Status: {sale.get('invoiceStatus', 'N/A')}\")
    print(f\"KDV Rate: {sale.get('kdvRate', 'N/A')}\")
    print(f\"KDV Amount: {sale.get('kdvAmount', 'N/A')}\")
"
echo ""

echo "4️⃣  DATABASE: Direct Query"
echo "=========================================="
sqlite3 apps/api/instance/xear_crm.db << 'EOF'
.mode column
.headers on
SELECT 
    da.id as assignment_id,
    da.reason,
    da.list_price,
    da.sale_price,
    da.sgk_support,
    da.sgk_scheme,
    da.discount_type,
    da.discount_value,
    da.net_payable,
    da.payment_method,
    da.delivery_status,
    da.report_status,
    da.serial_number,
    da.is_loaner,
    s.id as sale_id,
    s.total_amount,
    s.paid_amount,
    s.payment_status,
    s.invoice_status,
    s.kdv_rate,
    s.kdv_amount,
    i.brand,
    i.model,
    i.barcode,
    i.category
FROM device_assignments da
LEFT JOIN sales s ON da.sale_id = s.id
LEFT JOIN inventory i ON da.inventory_id = i.id
WHERE da.sale_id = '2603010102';
EOF
echo ""

echo "=========================================="
echo "✅ Comparison Complete"
echo "=========================================="
echo ""
echo "Check for consistency:"
echo "- Reason should be 'Satış' (not 'Sale')"
echo "- Category should be 'hearing_aid'"
echo "- All prices should match across endpoints"
echo "- SGK scheme should match"
echo "- Discount values should match"
echo "- Payment info should match"
echo "- Delivery/Report status should match"
echo "- Barcode/Serial should match"
