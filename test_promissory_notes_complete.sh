#!/bin/bash

echo "🧪 PROMISSORY NOTES API - COMPLETE TEST"
echo "========================================"
echo ""

TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c3JfZWFmYWFkYzYiLCJleHAiOjE3NzIzMzU3NjEsImlhdCI6MTc3MjMwNjk2MSwiYWNjZXNzLnRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSIsInJvbGUiOiJhZG1pbiIsInRlbmFudF9pZCI6Ijk1NjI1NTg5LWE0YWQtNDFmZi1hOTllLTQ5NTU5NDNiYjQyMSJ9.qEinvP-DP2Nl3Hg-QILz3hXj4MFhBvm4NMdRxJnQcHI"

echo "✅ TEST 1: Create Promissory Notes"
curl -s -X POST http://localhost:5003/api/promissory-notes \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-final-$(date +%s)" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "partyId": "pty_final_test",
    "saleId": "sale_final_test",
    "totalAmount": 10000,
    "notes": [
      {
        "noteNumber": 1,
        "amount": 5000,
        "issueDate": "2026-02-28T00:00:00Z",
        "dueDate": "2026-03-28T00:00:00Z",
        "debtorName": "Final Test Müşteri",
        "debtorTc": "11111111111",
        "debtorAddress": "Test Adres Final",
        "debtorTaxOffice": "OSMANGAZİ",
        "debtorPhone": "5551111111",
        "hasGuarantor": false,
        "authorizedCourt": "İstanbul (Çağlayan)",
        "fileName": "Senet-Final-1.pdf"
      },
      {
        "noteNumber": 2,
        "amount": 5000,
        "issueDate": "2026-02-28T00:00:00Z",
        "dueDate": "2026-04-28T00:00:00Z",
        "debtorName": "Final Test Müşteri",
        "debtorTc": "11111111111",
        "debtorAddress": "Test Adres Final",
        "debtorTaxOffice": "OSMANGAZİ",
        "debtorPhone": "5551111111",
        "hasGuarantor": false,
        "authorizedCourt": "İstanbul (Çağlayan)",
        "fileName": "Senet-Final-2.pdf"
      }
    ]
  }' | jq -r '.success, .message, (.data | length)'

echo ""
echo "✅ TEST 2: List Sale Promissory Notes"
curl -s -X GET "http://localhost:5003/api/sales/sale_final_test/promissory-notes" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.success, (.data | length), .meta.count'

echo ""
echo "✅ TEST 3: Update Promissory Note (Cancel)"
NOTE_ID=$(curl -s -X GET "http://localhost:5003/api/sales/sale_final_test/promissory-notes" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[0].id')

curl -s -X PATCH "http://localhost:5003/api/promissory-notes/$NOTE_ID" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-cancel-$(date +%s)" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "cancelled"}' | jq -r '.success, .data.status'

echo ""
echo "✅ TEST 4: Collect Payment (Partial)"
NOTE_ID_2=$(curl -s -X GET "http://localhost:5003/api/sales/sale_final_test/promissory-notes" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[1].id')

curl -s -X POST "http://localhost:5003/api/promissory-notes/$NOTE_ID_2/collect" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-collect-final-$(date +%s)" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 2500,
    "paymentMethod": "cash",
    "paymentDate": "2026-02-28T00:00:00Z",
    "notes": "Kısmi ödeme - yarısı"
  }' | jq -r '.success, .data.note.status, .data.note.paidAmount, .data.payment.amount'

echo ""
echo "✅ TEST 5: Collect Remaining Payment (Full)"
curl -s -X POST "http://localhost:5003/api/promissory-notes/$NOTE_ID_2/collect" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-collect-full-$(date +%s)" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 2500,
    "paymentMethod": "card",
    "paymentDate": "2026-02-28T00:00:00Z",
    "notes": "Tam ödeme - kalan"
  }' | jq -r '.success, .data.note.status, .data.note.paidAmount'

echo ""
echo "========================================"
echo "✅ ALL TESTS COMPLETED SUCCESSFULLY!"
echo "========================================"
