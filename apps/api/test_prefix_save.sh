#!/bin/bash

# Test script to verify invoice prefix CRUD operations
# Run from x-ear/apps/api directory

BASE_URL="http://localhost:5003"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1fYTY1ZGMwMDkiLCJ0ZW5hbnRfaWQiOiI5NTYyNTU4OS1hNGFkLTQxZmYtYTk5ZS00OTU1OTQzYmI0MjEiLCJleHAiOjE3NDE1MDI2NjF9.xxx"

echo "=== TEST 1: Get current tenant (should auto-generate prefix) ==="
curl -s -X GET "${BASE_URL}/api/tenants/current" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.data.settings.invoice_integration'

echo -e "\n=== TEST 2: Update with DDD prefix ==="
curl -s -X PATCH "${BASE_URL}/api/tenants/current" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "invoice_integration": {
        "use_manual_numbering": true,
        "invoice_prefix": "DDD",
        "invoice_prefixes": ["DDD"]
      }
    }
  }' | jq '.data.settings.invoice_integration'

echo -e "\n=== TEST 3: Add additional prefixes ABU and KKK ==="
curl -s -X PATCH "${BASE_URL}/api/tenants/current" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "invoice_integration": {
        "invoice_prefix": "DDD",
        "invoice_prefixes": ["DDD", "ABU", "KKK"]
      }
    }
  }' | jq '.data.settings.invoice_integration'

echo -e "\n=== TEST 4: Verify persistence (GET again) ==="
curl -s -X GET "${BASE_URL}/api/tenants/current" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.data.settings.invoice_integration'

echo -e "\n=== TEST 5: Remove KKK, keep DDD and ABU ==="
curl -s -X PATCH "${BASE_URL}/api/tenants/current" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": {
      "invoice_integration": {
        "invoice_prefix": "DDD",
        "invoice_prefixes": ["DDD", "ABU"]
      }
    }
  }' | jq '.data.settings.invoice_integration'

echo -e "\n=== TEST 6: Final verification ==="
curl -s -X GET "${BASE_URL}/api/tenants/current" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" | jq '.data.settings.invoice_integration'
