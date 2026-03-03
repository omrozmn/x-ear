#!/bin/bash

TOKEN=$(python3 gen_token_deneme.py 2>/dev/null)

echo "1. Önce tek kulak (left) yapalım..."
curl -s -X PUT "http://localhost:5003/api/sales/2602270102" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fix-single-$(date +%s)" \
  -d '{
    "listPriceTotal": 10000.0,
    "finalAmount": 10368.88,
    "ear": "left",
    "sgkScheme": "over18_retired"
  }' | python3 -c "import sys, json; d=json.load(sys.stdin); print('Success:', d.get('success'))"

sleep 1

echo ""
echo "2. Kontrol edelim..."
curl -s -X GET "http://localhost:5003/api/sales/2602270102" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
devices = data.get('data', {}).get('devices', [])
print(f'Total Devices: {len(devices)}')
for d in devices:
    print(f'  - {d.get(\"ear\")}: {d.get(\"id\")}')"

sleep 1

echo ""
echo "3. Şimdi bilateral yapalım..."
curl -s -X PUT "http://localhost:5003/api/sales/2602270102" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: fix-bilateral-$(date +%s)" \
  -d '{
    "listPriceTotal": 10000.0,
    "finalAmount": 10368.88,
    "ear": "both",
    "sgkScheme": "over18_retired"
  }' | python3 -c "import sys, json; d=json.load(sys.stdin); print('Success:', d.get('success'))"

sleep 1

echo ""
echo "4. Final kontrol..."
curl -s -X GET "http://localhost:5003/api/sales/2602270102" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "
import sys, json
data = json.load(sys.stdin)
devices = data.get('data', {}).get('devices', [])
print(f'Total Devices: {len(devices)}')
for d in devices:
    print(f'  - {d.get(\"ear\")}: {d.get(\"id\")}, SGK={d.get(\"sgkSupport\", 0):.2f}')"
