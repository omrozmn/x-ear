#!/bin/bash

# Get token from localStorage (you need to copy from browser console)
# Run this in browser console: localStorage.getItem('auth_token')

echo "Please copy your token from browser console:"
echo "localStorage.getItem('auth_token')"
echo ""
echo "Then run: export TOKEN='your_token_here'"
echo ""

if [ -z "$TOKEN" ]; then
  echo "ERROR: TOKEN not set. Please set it first:"
  echo "export TOKEN='eyJhbGci...'"
  exit 1
fi

echo "=== Testing Sale 2603020114 with real token ==="
curl -s -X GET "http://localhost:5003/sales/2603020114" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" | jq '{
    id: .data.id,
    listPriceTotal: .data.listPriceTotal,
    discountAmount: .data.discountAmount,
    discountType: .data.discountType,
    discountValue: .data.discountValue,
    sgkCoverage: .data.sgkCoverage,
    finalAmount: .data.finalAmount,
    totalAmount: .data.totalAmount,
    paidAmount: .data.paidAmount,
    remainingAmount: .data.remainingAmount,
    deviceCount: (.data.devices | length)
  }'
