#!/bin/bash

# Test Sale 2603020114 - the one showing in the screenshot
# This is a bilateral sale with 10 TRY discount

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMzQ1Njc4IiwidGVuYW50X2lkIjoiOTU2MjU1ODktYTRhZC00MWZmLWE5OWUtNDk1NTk0M2JiNDIxIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzQwODU1NjAwfQ.Zy8VqZxQxGxQxGxQxGxQxGxQxGxQxGxQxGxQxGxQxGxQ"

echo "=== Testing Sale 2603020114 ==="
echo ""

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
    deviceCount: (.data.devices | length),
    firstDevice: {
      listPrice: .data.devices[0].listPrice,
      salePrice: .data.devices[0].salePrice,
      discountType: .data.devices[0].discountType,
      discountValue: .data.devices[0].discountValue
    }
  }'
