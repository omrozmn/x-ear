#!/bin/bash

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZWFmYWFkYzYiLCJleHAiOjE3NzI0ODkyNjgsImlhdCI6MTc3MjQ2MDQ2OCwiYWNjZXNzLnRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSIsInJvbGUiOiJhZG1pbiIsInRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSJ9.IsDiuagq4eM9oXIwFklqWWc-IZM8lmcqtUBD_RiNYNQ"

echo "=== Testing Sale 2603020111 (percentage discount, bilateral) ==="
curl -s -X GET "http://localhost:5003/api/sales/2603020111" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
if data.get('success'):
    sale = data['data']
    print(f\"Sale ID: {sale['id']}\")
    print(f\"Discount Type: {sale.get('discountType')}\")
    print(f\"Discount Value: {sale.get('discountValue')}\")
    print(f\"Discount Amount: {sale.get('discountAmount')}\")
    print(f\"List Price Total: {sale.get('listPriceTotal')}\")
    print(f\"Total Amount: {sale.get('totalAmount')}\")
    print(f\"Final Amount: {sale.get('finalAmount')}\")
    print(f\"Paid Amount: {sale.get('paidAmount')}\")
    print(f\"Remaining: {sale.get('finalAmount', 0) - sale.get('paidAmount', 0)}\")
    print(f\"Device Count: {len(sale.get('devices', []))}\")
else:
    print(f\"Error: {data.get('error')}\")
"
