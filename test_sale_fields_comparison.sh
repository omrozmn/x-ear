#!/bin/bash

# Compare all fields between sales table and edit modal for a specific party

PARTY_ID="pat_a722c0ae"
echo "🔍 Comparing Sale Fields for Party: $PARTY_ID"
echo "================================================"

# Get auth token
TOKEN=$(python3 get_token.py 2>/dev/null | grep -o 'eyJ[^"]*' | head -1)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get auth token"
    exit 1
fi

echo "✅ Got auth token"

# Get sales for this party
echo ""
echo "📋 Fetching sales from API..."
SALES_RESPONSE=$(curl -s -X GET "http://localhost:5003/sales?search=$PARTY_ID&per_page=50" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")

# Parse and display all sales
echo "$SALES_RESPONSE" | python3 << 'PYTHON'
import sys, json
from datetime import datetime

data = json.load(sys.stdin)
sales = data.get('data', [])

if not sales:
    print("❌ No sales found for this party")
    sys.exit(1)

print(f"\n✅ Found {len(sales)} sale(s)\n")

for idx, sale in enumerate(sales, 1):
    print(f"{'='*80}")
    print(f"SALE #{idx}: {sale.get('id')}")
    print(f"{'='*80}")
    
    # Basic Info
    print(f"\n📅 BASIC INFO:")
    print(f"  Sale ID: {sale.get('id')}")
    print(f"  Sale Date: {sale.get('saleDate')}")
    print(f"  Party ID: {sale.get('partyId')}")
    print(f"  Status: {sale.get('status')}")
    
    # Product Info
    print(f"\n📦 PRODUCT INFO:")
    print(f"  Product Name: {sale.get('productName', 'N/A')}")
    print(f"  Brand: {sale.get('brand', 'N/A')}")
    print(f"  Model: {sale.get('model', 'N/A')}")
    print(f"  Category: {sale.get('category', 'N/A')}")
    print(f"  Barcode: {sale.get('barcode', 'N/A')}")
    
    # Serial Numbers
    print(f"\n🔢 SERIAL NUMBERS:")
    print(f"  Serial Number: {sale.get('serialNumber', 'N/A')}")
    print(f"  Serial Number Left: {sale.get('serialNumberLeft', 'N/A')}")
    print(f"  Serial Number Right: {sale.get('serialNumberRight', 'N/A')}")
    
    # Pricing
    print(f"\n💰 PRICING:")
    print(f"  List Price Total: {sale.get('listPriceTotal', 0)} TRY")
    print(f"  Total Amount: {sale.get('totalAmount', 0)} TRY")
    print(f"  Discount Amount: {sale.get('discountAmount', 0)} TRY")
    print(f"  Discount Type: {sale.get('discountType', 'N/A')}")
    print(f"  Discount Value: {sale.get('discountValue', 'N/A')}")
    print(f"  Final Amount: {sale.get('finalAmount', 0)} TRY")
    
    # SGK
    print(f"\n🏥 SGK INFO:")
    print(f"  SGK Coverage: {sale.get('sgkCoverage', 0)} TRY")
    print(f"  SGK Scheme: {sale.get('sgkScheme', 'N/A')}")
    print(f"  SGK Support: {sale.get('sgkSupport', 'N/A')}")
    
    # Payment
    print(f"\n💳 PAYMENT:")
    print(f"  Payment Method: {sale.get('paymentMethod', 'N/A')}")
    print(f"  Paid Amount: {sale.get('paidAmount', 0)} TRY")
    print(f"  Remaining Amount: {sale.get('remainingAmount', 0)} TRY")
    print(f"  Patient Payment: {sale.get('patientPayment', 0)} TRY")
    print(f"  Down Payment: {sale.get('downPayment', 0)} TRY")
    
    # Status
    print(f"\n📊 STATUS:")
    print(f"  Delivery Status: {sale.get('deliveryStatus', 'N/A')}")
    print(f"  Report Status: {sale.get('reportStatus', 'N/A')}")
    print(f"  Payment Status: {sale.get('paymentStatus', 'N/A')}")
    print(f"  Invoice Status: {sale.get('invoiceStatus', 'N/A')}")
    
    # Devices Array
    devices = sale.get('devices', [])
    if devices:
        print(f"\n🔧 DEVICES ({len(devices)} device(s)):")
        for d_idx, device in enumerate(devices, 1):
            print(f"\n  Device #{d_idx}:")
            print(f"    ID: {device.get('id')}")
            print(f"    Name: {device.get('deviceName', 'N/A')}")
            print(f"    Brand: {device.get('brand', 'N/A')}")
            print(f"    Model: {device.get('model', 'N/A')}")
            print(f"    Ear: {device.get('ear', 'N/A')}")
            print(f"    Serial Number: {device.get('serialNumber', 'N/A')}")
            print(f"    Serial Number Left: {device.get('serialNumberLeft', 'N/A')}")
            print(f"    Serial Number Right: {device.get('serialNumberRight', 'N/A')}")
            print(f"    List Price: {device.get('listPrice', 0)} TRY")
            print(f"    Sale Price: {device.get('salePrice', 0)} TRY")
            print(f"    SGK Support: {device.get('sgkSupport', 0)} TRY")
            print(f"    SGK Scheme: {device.get('sgkScheme', 'N/A')}")
            print(f"    Discount Type: {device.get('discountType', 'N/A')}")
            print(f"    Discount Value: {device.get('discountValue', 'N/A')}")
            print(f"    Net Payable: {device.get('netPayable', 0)} TRY")
            print(f"    Delivery Status: {device.get('deliveryStatus', 'N/A')}")
            print(f"    Report Status: {device.get('reportStatus', 'N/A')}")
    
    print(f"\n")

# Check for missing critical fields
print(f"\n{'='*80}")
print("🔍 FIELD AVAILABILITY CHECK")
print(f"{'='*80}\n")

critical_fields = [
    'discountType', 'discountValue', 'sgkCoverage', 'sgkScheme', 
    'remainingAmount', 'deliveryStatus', 'reportStatus'
]

for field in critical_fields:
    has_field = field in sales[0] if sales else False
    value = sales[0].get(field) if sales else None
    status = "✅" if has_field and value is not None else "❌"
    print(f"{status} {field}: {value if has_field else 'MISSING'}")

PYTHON

echo ""
echo "================================================"
echo "✅ Comparison completed"
