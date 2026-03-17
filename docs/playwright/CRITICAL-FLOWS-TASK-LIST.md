# Critical Flows E2E Test Implementation - Task List

## Status: 1/16 Complete

### Priority: P0 (Revenue & Legal)

- [x] **FLOW-01: Patient CRUD** ✅
  - Status: COMPLETE
  - File: `tests/e2e/critical-flows/p0-revenue-legal/patient-crud.critical-flow.spec.ts`
  - Steps: CREATE → READ → UPDATE (DELETE skipped per user request)
  - Duration: ~12s
  - Notes: All infrastructure fixes applied, test passing

- [ ] **FLOW-02: Device Assignment** ⚠️ BLOCKED
  - Status: BLOCKED - Missing inventory/device assignment implementation
  - File: `tests/e2e/critical-flows/p0-revenue-legal/device-assignment.critical-flow.spec.ts`
  - Steps: Create party → Assign device → Verify assignment → Update device → Verify update
  - API Endpoints: POST /api/parties, POST /api/inventory, POST /api/sales (device assignment via sale)
  - Critical: Device inventory tracking, party-device relationship
  - **BLOCKER**: Device assignment happens through sales creation, not direct assignment
  - **DECISION**: Skip for now, will be covered by FLOW-03 (Sale Creation)

- [ ] **FLOW-03: Sale Creation**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p0-revenue-legal/sale-creation.critical-flow.spec.ts`
  - Steps: Create party → Select device → Create sale → Verify sale → Check inventory
  - API Endpoints: POST /api/sales, GET /api/sales/{id}, GET /api/inventory
  - Critical: Revenue tracking, inventory deduction

- [ ] **FLOW-04: Invoice Generation**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p0-revenue-legal/invoice-generation.critical-flow.spec.ts`
  - Steps: Create sale → Generate invoice → Verify invoice data → Check PDF generation
  - API Endpoints: POST /api/invoices, GET /api/invoices/{id}, GET /api/invoices/{id}/pdf
  - Critical: Legal compliance, e-invoice integration

- [ ] **FLOW-05: Payment Processing**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p0-revenue-legal/payment-processing.critical-flow.spec.ts`
  - Steps: Create sale → Record payment → Verify payment → Check balance → Partial payment
  - API Endpoints: POST /api/payments, GET /api/payments, GET /api/sales/{id}/payments
  - Critical: Financial accuracy, payment reconciliation

- [ ] **FLOW-06: SGK Submission**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p0-revenue-legal/sgk-submission.critical-flow.spec.ts`
  - Steps: Create party with SGK → Verify eligibility → Create sale → Submit SGK claim → Track status
  - API Endpoints: POST /api/sgk/claims, GET /api/sgk/claims/{id}, PUT /api/sgk/claims/{id}/status
  - Critical: Government compliance, reimbursement tracking

### Priority: P1 (Operations)

- [ ] **FLOW-07: Appointment Scheduling**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p1-operations/appointment-scheduling.critical-flow.spec.ts`
  - Steps: Create party → Schedule appointment → Verify calendar → Reschedule → Cancel
  - API Endpoints: POST /api/appointments, GET /api/appointments, PUT /api/appointments/{id}
  - Critical: Patient flow management, resource allocation

- [ ] **FLOW-08: Multi-Device Sale**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p1-operations/multi-device-sale.critical-flow.spec.ts`
  - Steps: Create party → Add multiple devices → Create sale → Verify total → Generate invoice
  - API Endpoints: POST /api/sales (with multiple line items)
  - Critical: Complex sale scenarios, accurate pricing

- [ ] **FLOW-09: Refund Processing**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p1-operations/refund-processing.critical-flow.spec.ts`
  - Steps: Create sale → Process refund → Verify inventory return → Check financial records
  - API Endpoints: POST /api/refunds, PUT /api/sales/{id}/refund, GET /api/inventory
  - Critical: Financial accuracy, inventory management

- [ ] **FLOW-10: Bulk Patient Import**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p1-operations/bulk-patient-import.critical-flow.spec.ts`
  - Steps: Upload CSV → Validate data → Import parties → Verify results → Check errors
  - API Endpoints: POST /api/parties/bulk-import, GET /api/parties/bulk-import/{id}/status
  - Critical: Data migration, bulk operations

### Priority: P2 (Admin & Reporting)

- [ ] **FLOW-11: Report Generation**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p2-admin/report-generation.critical-flow.spec.ts`
  - Steps: Navigate to reports → Select date range → Generate sales report → Export PDF/Excel
  - API Endpoints: POST /api/reports/sales, GET /api/reports/{id}, GET /api/reports/{id}/export
  - Critical: Business intelligence, decision making

- [ ] **FLOW-12: User Management**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p2-admin/user-management.critical-flow.spec.ts`
  - Steps: Create user → Assign role → Set permissions → Login as user → Verify access
  - API Endpoints: POST /api/users, PUT /api/users/{id}/role, GET /api/permissions
  - Critical: Security, access control

- [ ] **FLOW-13: Branch Management**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p2-admin/branch-management.critical-flow.spec.ts`
  - Steps: Create branch → Assign users → Transfer inventory → Verify isolation
  - API Endpoints: POST /api/branches, PUT /api/branches/{id}, GET /api/branches/{id}/users
  - Critical: Multi-location support, data isolation

- [ ] **FLOW-14: Inventory Management**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p2-admin/inventory-management.critical-flow.spec.ts`
  - Steps: Add inventory → Update stock → Transfer between branches → Check low stock alerts
  - API Endpoints: POST /api/inventory, PUT /api/inventory/{id}, POST /api/inventory/transfer
  - Critical: Stock tracking, supply chain

- [ ] **FLOW-15: Communication (SMS/Email)**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p2-admin/communication.critical-flow.spec.ts`
  - Steps: Send SMS → Verify delivery → Send email → Check template → Bulk send
  - API Endpoints: POST /api/sms/send, POST /api/email/send, GET /api/communications/history
  - Critical: Patient engagement, notifications

- [ ] **FLOW-16: Admin Panel Access**
  - Status: TODO
  - File: `tests/e2e/critical-flows/p2-admin/admin-panel-access.critical-flow.spec.ts`
  - Steps: Login as admin → Access tenant list → View tenant details → Impersonate user
  - API Endpoints: GET /api/admin/tenants, GET /api/admin/tenants/{id}, POST /api/admin/impersonate
  - Critical: System administration, support

## Implementation Rules

### CRITICAL RULES (NO EXCEPTIONS)
1. ✅ **NO SIMPLIFICATION** - Full feature implementation, no shortcuts
2. ✅ **NO MOCKING** - Real backend, real data, real flows
3. ✅ **COMPLETE FLOWS** - All steps must pass, no skipping (except DELETE per user)
4. ✅ **PROPER SELECTORS** - Use data-testid + text-based filters
5. ✅ **API VERIFICATION** - Verify via API after each UI action
6. ✅ **ERROR HANDLING** - Test must handle and report errors properly
7. ✅ **CLEANUP** - Each test must clean up its data (except DELETE)

### Test Structure Template
```typescript
test.describe('FLOW-XX: [Name]', () => {
  test('should complete [flow name] successfully', async ({ tenantPage, apiContext, authTokens }) => {
    // STEP 1: Setup
    // STEP 2: Action
    // STEP 3: Verify via UI
    // STEP 4: Verify via API
    // STEP 5: Next action
    // ... continue until flow complete
  });
});
```

### Selector Strategy
- ✅ Primary: `data-testid` attributes
- ✅ Fallback: Text-based with `.filter({ hasText: /pattern/i })`
- ✅ Wait: Always wait for elements with proper timeouts
- ✅ Animation: Add 500-1000ms wait after modal opens

### API Verification Pattern
```typescript
const response = await apiContext.get('/api/endpoint');
expect(response.ok()).toBeTruthy();
const data = await response.json();
validateResponseEnvelope(data);
expect(data.data.field).toBe(expectedValue);
```

## Progress Tracking

- **Total Tests**: 16
- **Completed**: 1 (6.25%)
- **In Progress**: 0
- **Remaining**: 15 (93.75%)
- **Estimated Time**: ~15 hours (1 hour per test average)

## Next Steps

1. ✅ FLOW-01: Patient CRUD - COMPLETE
2. 🔄 FLOW-02: Device Assignment - STARTING NOW
3. ⏳ FLOW-03: Sale Creation - PENDING
4. ⏳ FLOW-04: Invoice Generation - PENDING
5. ⏳ FLOW-05: Payment Processing - PENDING
... (continue for all 16)

## Notes

- All tests use ADMIN user (admin@xear.com / Admin123!)
- Backend running on port 5003
- Web app on port 8080
- Admin panel on port 8082
- All services verified running before starting
