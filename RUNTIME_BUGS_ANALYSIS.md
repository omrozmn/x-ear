# Runtime Bug Analysis Report
**Date:** 2025-01-27  
**Status:** Critical Issues Found  
**Scope:** Web App & Admin Panel Data Loading Issues

---

## 🔴 CRITICAL BUGS FOUND

### 1. **useParty Hook Returns Mock Data** 
**File:** `apps/web/src/hooks/useParty.ts`  
**Severity:** 🔴 CRITICAL  
**Impact:** Party details page shows fake data

**Problem:**
```typescript
const mockParty: Party = {
  id: partyId,
  email: 'mock@example.com',
  phone: '555-0123',
  birthDate: '1990-01-01',
  // ... all mock data
};
setParty(mockParty);
```

**Why It Fails:**
- Hook doesn't call real API
- Always returns hardcoded mock data
- No actual database query

**Fix Required:**
- Replace with `apps/web/src/hooks/party/useParty.ts` (which uses real API)
- Update imports in `DesktopPartyDetailsPage.tsx`

---

### 2. **Debug Switchers Not Loading**
**Files:** 
- `apps/web/src/components/layout/DebugRoleSwitcher.tsx`
- `apps/web/src/components/layout/DebugTenantSwitcher.tsx`

**Severity:** 🟡 HIGH  
**Impact:** Admin users can't switch roles/tenants

**Problem:**
```typescript
const { data: rolesResponse, isLoading: rolesLoading } = useListAdminDebugAvailableRoles({
  query: {
    enabled: isDebugAdmin && isOpen,  // ⚠️ Only fetches when dropdown is open
    staleTime: 5 * 60 * 1000,
  }
});
```

**Why It Fails:**
- Data only loads when dropdown opens
- If API is slow, dropdown appears empty
- No loading state shown to user
- `isDebugAdmin` check might be failing

**Potential Issues:**
1. `is_super_admin` vs `role === 'super_admin'` inconsistency
2. Token payload not containing admin flag
3. API endpoint `/admin/debug/available-roles` might be failing

**Fix Required:**
- Add loading spinner in dropdown
- Prefetch roles on component mount (not just when open)
- Add error boundary and fallback UI
- Debug `isDebugAdmin` logic with console logs

---

### 3. **Invoice Template Service Returns Empty**
**File:** `apps/web/src/services/invoice.service.ts`  
**Severity:** 🟡 HIGH  
**Impact:** Invoice templates don't load

**Problem:**
```typescript
async getTemplates(): Promise<InvoiceTemplate[]> {
  // TODO: Implement listInvoiceTemplates when available in generated API
  console.warn('listInvoiceTemplates API not available');
  return [];  // ⚠️ Always returns empty array
}
```

**Why It Fails:**
- API endpoint not implemented
- Returns empty array instead of calling backend
- Users can't use invoice templates

**Fix Required:**
- Implement `listInvoiceTemplates` in backend
- Generate OpenAPI schema
- Regenerate frontend client
- Update service to use real API

---

### 4. **Print Queue Not Implemented**
**File:** `apps/web/src/services/invoice.service.ts`  
**Severity:** 🟡 MEDIUM  
**Impact:** Invoice printing queue doesn't work

**Problem:**
```typescript
async getPrintQueue(): Promise<unknown[]> {
  // TODO: Implement listInvoicePrintQueue when available in generated API
  console.warn('listInvoicePrintQueue API not available');
  return [];
}
```

**Fix Required:**
- Implement backend endpoint
- Update frontend service

---

### 5. **BirFatura Create Not Implemented**
**File:** `apps/web/src/services/birfatura.service.ts`  
**Severity:** 🔴 CRITICAL  
**Impact:** E-invoice creation fails

**Problem:**
```typescript
async create(invoiceData: InvoiceFormData): Promise<BirFaturaResponse> {
  // TODO: Implement when createEfaturaCreate is available in API
  throw new Error('createEfaturaCreate fonksiyonu API\'de mevcut değil');
}
```

**Why It Fails:**
- API endpoint missing
- Users can't create e-invoices
- Critical business function broken

**Fix Required:**
- Implement `createEfaturaCreate` in backend
- Update OpenAPI schema
- Regenerate client

---

### 6. **Bulk Operations Not Implemented**
**File:** `apps/web/src/hooks/parties/usePartyBulkActions.ts`  
**Severity:** 🟡 MEDIUM  
**Impact:** Bulk edit/email features don't work

**Problem:**
```typescript
case 'edit':
  // TODO: Implement bulk edit
  console.log('Bulk edit for parties:', bulkState.selectedParties)
  break
case 'email':
  // TODO: Implement bulk email
  console.log('Bulk email for parties:', bulkState.selectedParties)
  break
```

**Fix Required:**
- Implement bulk edit modal
- Implement bulk email functionality
- Add proper API calls

---

### 7. **Payment Records Mock Data**
**File:** `apps/web/src/components/parties/modals/edit-sale-modal/hooks/useEditSale.ts`  
**Severity:** 🟡 MEDIUM  
**Impact:** Payment history doesn't load

**Problem:**
```typescript
try {
  // TODO: Replace with actual payments API when available
  // For now, use mock data or get from sale data
  setPaymentRecords([]);  // ⚠️ Always empty
} catch (err) {
```

**Fix Required:**
- Implement payments API endpoint
- Update hook to fetch real data

---

### 8. **Captcha Not Implemented**
**File:** `apps/web/src/stores/authStore.ts`  
**Severity:** 🟢 LOW (Security Issue)  
**Impact:** Password reset vulnerable to bots

**Problem:**
```typescript
const responseEnvelope = await forgotPasswordApi({
  identifier: phone,
  captchaToken: 'dummy' // TODO: Implement proper captcha
});
```

**Fix Required:**
- Integrate reCAPTCHA or hCaptcha
- Update backend to validate captcha

---

## 📊 SUMMARY

### By Severity:
- 🔴 **CRITICAL:** 2 bugs (Mock data, E-invoice creation)
- 🟡 **HIGH:** 3 bugs (Debug switchers, Templates, Print queue)
- 🟡 **MEDIUM:** 2 bugs (Bulk operations, Payment records)
- 🟢 **LOW:** 1 bug (Captcha)

### By Category:
- **Data Loading:** 4 bugs (Mock data, Templates, Print queue, Payments)
- **Not Implemented:** 3 bugs (E-invoice, Bulk ops, Captcha)
- **UI/UX:** 1 bug (Debug switchers)

---

## 🔧 IMMEDIATE FIXES NEEDED

### Priority 1 (Today):
1. ✅ Fix `useParty` mock data → Use real API
2. ✅ Debug role/tenant switchers → Add logging & error handling
3. ✅ Fix BirFatura create → Implement API endpoint

### Priority 2 (This Week):
4. Implement invoice templates API
5. Implement print queue API
6. Fix payment records loading

### Priority 3 (Next Sprint):
7. Implement bulk operations
8. Add captcha to password reset

---

## 🎯 ROOT CAUSES

1. **Incomplete Migration:** Old mock hooks still in use
2. **Missing API Endpoints:** Backend not fully implemented
3. **TODO Comments:** Features marked as TODO but never completed
4. **No Integration Tests:** These bugs would be caught by E2E tests

---

## ✅ RECOMMENDATIONS

1. **Audit all hooks:** Search for mock data patterns
2. **Complete API implementation:** Finish all TODO endpoints
3. **Add E2E tests:** Test critical user flows
4. **Remove dead code:** Delete unused mock implementations
5. **Add error boundaries:** Graceful degradation when APIs fail

---

**Generated by:** Kiro AI Static Analysis  
**Next Steps:** Prioritize fixes and create implementation tasks
