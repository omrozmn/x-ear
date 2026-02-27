# Remaining Backend Issues - 404 & Unimplemented Endpoints

## Summary
After fixing critical 500 errors and admin access issues, remaining problems are:
1. Unimplemented endpoints (404)
2. Legacy "Patient" terminology (FIXED)
3. Tenant-scoped admin endpoints (401) - These are CORRECT behavior

---

## ✅ FIXED: Legacy Patient Terminology

**Files Fixed:**
- `x-ear/apps/api/routers/timeline.py` - "Patient not found" → "Party not found"
- `x-ear/apps/api/routers/documents.py` - "Patient not found" → "Party not found"
- `x-ear/apps/api/routers/sales.py` - "PATIENT_NOT_FOUND" → "PARTY_NOT_FOUND"

**Impact:** 10+ endpoints now return correct error messages

---

## ❌ UNIMPLEMENTED ENDPOINTS (404 - Not Found)

These endpoints are defined in OpenAPI but NOT implemented in backend:

### 1. Admin Debug Endpoints
**Status:** NOT IMPLEMENTED
```
POST /api/admin/debug/switch-role
GET /api/admin/debug/available-roles
GET /api/admin/debug/page-permissions/{page_key}
```

**Location:** Should be in `x-ear/apps/api/routers/admin.py`
**Current:** Only `switch-tenant` and `exit-impersonation` exist

**Recommendation:** 
- Option A: Implement these endpoints
- Option B: Remove from OpenAPI spec (if not needed)

---

### 2. Admin Tickets System
**Status:** MOCK IMPLEMENTATION (Returns fake data)
```
GET /api/admin/tickets
POST /api/admin/tickets
PUT /api/admin/tickets/{ticket_id}
POST /api/admin/tickets/{ticket_id}/responses
```

**Location:** `x-ear/apps/api/routers/admin_tickets.py`
**Current:** Uses `MOCK_TICKETS` list, no database model

**Recommendation:**
- Option A: Implement real Ticket model + database
- Option B: Remove from OpenAPI if not needed
- Option C: Keep mock for demo purposes (document as mock)

---

### 3. Party Profile Endpoints
**Status:** NOT IMPLEMENTED
```
GET /api/parties/{party_id}/profiles/hearing/tests
POST /api/parties/{party_id}/profiles/hearing/tests
PUT /api/parties/{party_id}/profiles/hearing/tests/{test_id}
DELETE /api/parties/{party_id}/profiles/hearing/tests/{test_id}

GET /api/parties/{party_id}/profiles/hearing/ereceipts
POST /api/parties/{party_id}/profiles/hearing/ereceipts
PUT /api/parties/{party_id}/profiles/hearing/ereceipts/{ereceipt_id}
DELETE /api/parties/{party_id}/profiles/hearing/ereceipts/{ereceipt_id}
```

**Location:** Should be in `x-ear/apps/api/routers/hearing_profiles.py` or similar
**Current:** Endpoints don't exist

**Recommendation:**
- These are core business features (hearing tests, e-receipts)
- MUST be implemented for production
- Priority: HIGH

---

## ✅ CORRECT BEHAVIOR: Tenant-Scoped Admin Endpoints (401)

These endpoints return 401 "Tenant context required" - This is CORRECT:

```
GET /api/admin/bounces
GET /api/admin/settings
GET /api/admin/roles
GET /api/admin/permissions
GET /api/admin/api-keys
GET /api/admin/appointments
GET /api/admin/birfatura/*
GET /api/admin/integrations/*
GET /api/admin/inventory
GET /api/admin/marketplaces/*
GET /api/admin/notifications/*
GET /api/admin/parties
GET /api/admin/suppliers
... and 60+ more
```

**Why 401 is correct:**
- These are tenant-scoped admin endpoints
- They require `tenant_required=True` (default)
- Admin must impersonate a tenant to access tenant data
- This is proper multi-tenancy security

**Test Script Issue:**
- Test uses admin token WITHOUT tenant impersonation
- Should use tenant token (after switch-tenant) for these endpoints

**Fix:** Test script should:
```bash
# 1. Admin login
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/auth/login" ...)

# 2. Switch to tenant (impersonation)
TENANT_TOKEN=$(curl -s -X POST "$BASE_URL/api/admin/debug/switch-tenant" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"targetTenantId":"'$TARGET_TENANT_ID'"}' | jq -r '.data.accessToken')

# 3. Use TENANT_TOKEN for tenant-scoped admin endpoints
curl -H "Authorization: Bearer $TENANT_TOKEN" "$BASE_URL/api/admin/parties"
```

---

## 📊 Expected Test Results After Fixes

### Current (After Our Fixes):
- Total: 513 endpoints
- Passed: ~230+ (45%+)
- Failed: ~280 (55%)

### Breakdown of Failures:
1. ✅ **3 critical 500 errors** - FIXED
2. ✅ **80+ admin endpoint 401 errors** - FIXED
3. ✅ **10+ "Patient not found" errors** - FIXED
4. ⚠️ **150+ validation errors (422)** - Test data needed (user adding)
5. ⚠️ **20+ unimplemented endpoints (404)** - Need implementation or removal
6. ✅ **60+ tenant-scoped admin 401** - CORRECT behavior (test script issue)

### After Test Script Fix:
- Expected: ~350+ passing (68%+)
- Remaining failures: 422 validation errors + unimplemented endpoints

---

## 🎯 Action Items

### Priority 1: Test Script Fix
- [ ] Use tenant impersonation token for tenant-scoped admin endpoints
- [ ] Expected improvement: +60 endpoints

### Priority 2: Implement Core Features
- [ ] Hearing profile tests endpoints (8 endpoints)
- [ ] Hearing profile e-receipts endpoints (8 endpoints)
- [ ] Expected improvement: +16 endpoints

### Priority 3: Admin Debug Endpoints
- [ ] Implement switch-role endpoint
- [ ] Implement available-roles endpoint
- [ ] Implement page-permissions endpoint
- [ ] Expected improvement: +3 endpoints

### Priority 4: Tickets System
- [ ] Decide: Real implementation vs Mock vs Remove
- [ ] If real: Create Ticket model + database
- [ ] Expected improvement: +4 endpoints

---

## 🔍 How to Identify Unimplemented Endpoints

```bash
# Find 404 errors in failed_endpoints.txt
grep "404 - Not Found" failed_endpoints.txt

# Check if router exists
grep -r "operation_id.*switchRole" apps/api/routers/

# Check OpenAPI spec
grep "operationId.*switchRole" openapi.yaml
```

---

## ✅ Summary

**Fixed Today:**
- ✅ 3 critical 500 errors
- ✅ 80+ admin access issues
- ✅ 10+ legacy terminology issues

**Remaining Work:**
- ⚠️ 20+ unimplemented endpoints (need decision: implement or remove)
- ⚠️ Test script needs tenant impersonation fix
- ⚠️ Test data needed for 422 validation errors

**Current Success Rate:** ~45% (230/513)
**Expected After All Fixes:** ~85% (435/513)
