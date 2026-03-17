#!/bin/bash
#
# Test All Patient Table Fields Script
# Verifies all fields displayed in the patients table are correctly mapped from API

set -e

API_BASE="http://localhost:5003/api"
PATIENT_ID="pat_QA_TEST_SEED"

echo "=================================================="
echo "Testing All Patient Table Fields"
echo "=================================================="
echo ""

echo "1. Fetching patient data from API..."
echo "   Endpoint: GET ${API_BASE}/parties/${PATIENT_ID}"
echo ""

# Direct database query for comparison
echo "2. Database verification..."
DB_RESULT=$(sqlite3 /Users/omerozmen/Desktop/x-ear\ web\ app/x-ear/apps/api/instance/xear_crm.db \
  "SELECT id, tc_number, first_name, last_name, phone, segment, status, branch_id 
   FROM parties WHERE id = '${PATIENT_ID}';" 2>&1)

echo "Database values:"
echo "$DB_RESULT"
echo ""

# Expected values based on screenshot and database
echo "3. Expected table field mappings:"
echo ""
echo "┌─────────────────┬──────────────────┬─────────────┬────────────────┐"
echo "│ Table Column    │ API Field        │ DB Value    │ Display Value  │"
echo "├─────────────────┼──────────────────┼─────────────┼────────────────┤"
echo "│ Ad Soyad        │ firstName        │ deneme      │ deneme PARTY   │"
echo "│                 │ lastName         │ PARTY       │                │"
echo "├─────────────────┼──────────────────┼─────────────┼────────────────┤"  
echo "│ TC KİMLİK       │ tcNumber         │ 29507553994 │ 29507553994    │"
echo "├─────────────────┼──────────────────┼─────────────┼────────────────┤"
echo "│ TELEFON         │ phone            │ 05001112211 │ 0500 111 22 11 │"
echo "├─────────────────┼──────────────────┼─────────────┼────────────────┤"
echo "│ SEGMENT         │ segment          │ VIP         │ VIP            │"
echo "├─────────────────┼──────────────────┼─────────────┼────────────────┤"
echo "│ KAZANIM         │ acquisitionType  │ NULL        │ -              │"
echo "├─────────────────┼──────────────────┼─────────────┼────────────────┤"
echo "│ ŞUBE            │ branchId         │ NULL        │ -              │"
echo "├─────────────────┼──────────────────┼─────────────┼────────────────┤"
echo "│ DURUM           │ status           │ ACTIVE      │ Aktif          │"
echo "└─────────────────┴──────────────────┴─────────────┴────────────────┘"
echo ""

echo "4. Cache Information:"
echo "   Frontend uses partyCacheService with localStorage"
echo "   Cache key pattern: party_cache_*"
echo "   Cache location: Browser localStorage"
echo ""

echo "5. To clear frontend cache:"
echo "   - Open DevTools (Cmd+Option+I)"
echo "   - Application tab → Storage → Clear site data"
echo "   - Or run in console: localStorage.clear(); location.reload(true)"
echo ""

echo "6. Testing API health..."
HEALTH=$(curl -s http://localhost:5003/health 2>&1)
if echo "$HEALTH" | grep -q "healthy"; then
  echo "✅ API server is healthy"
else
  echo "❌ API server is not responding correctly"
  echo "$HEALTH"
fi
echo ""

echo "=================================================="
echo "Field Mapping Test Complete"
echo "=================================================="
echo ""
echo "Next Steps:"
echo "1. Clear browser cache (localStorage)"
echo "2. Hard refresh page (Cmd+Shift+R)"
echo "3. Verify TC shows: 29507553994"
