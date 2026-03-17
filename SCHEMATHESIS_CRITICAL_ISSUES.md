# Schemathesis Critical Issues Report

## Test Summary
- **Total Endpoints:** 511/511 tested
- **Test Cases Generated:** 2,230
- **Test Cases Passed:** 1,308 (59%)
- **Test Cases Failed:** 922 (41%)
- **Unique Failure Types:** 922
- **Test Duration:** 78.30s

### Comparison with Bash Test
- **Bash Test:** 142/166 endpoints passing (85%)
- **Schemathesis:** 1,308/2,230 test cases passing (59%)
- **Note:** Schemathesis generates multiple test cases per endpoint with edge cases, so lower pass rate is expected

## Issue Categories

### 1. Server Errors (57 critical bugs) ❌

#### A. Missing SGK Model (2 endpoints)
- `GET /api/sgk/documents/{document_id}` - 500 error
- `DELETE /api/sgk/documents/{document_id}` - 500 error
**Error:** `No module named 'core.models.sgk'`
**Fix:** Create SGK model or remove endpoints

#### B. Database Constraint Violations
- **Invoice creation:** `NOT NULL constraint failed: invoices.tenant_id`
- **User creation:** `NOT NULL constraint failed: users.tenant_id`
- **Tenant creation:** `NOT NULL constraint failed: tenants.owner_email`
**Fix:** Add tenant_id to create schemas or set defaults

#### C. Attribute Errors
- `'TemplateCreate' object has no attribute 'bodyText'` - Schema mismatch
- `'AdminUser' object has no attribute 'get'` - Wrong object type
- `'InvoiceCreate' object has no attribute 'tenant_id'` - Missing field
- `'PlanCreate' object has no attribute 'slug'` - Missing field

#### D. Type Binding Errors
- `Error binding parameter 7: type 'list' is not supported` - SQLite list binding
- `Python int too large to convert to SQLite INTEGER` - Integer overflow

#### E. Validation Errors
- `Invalid isoformat string: 'null'` - Date parsing
- `Invalid isoformat string: ''` - Empty date string
- `'NULL'` - Enum validation

#### F. Missing Dependencies
- `name 'sync_service' is not defined` - Import missing
- `Failed to send test email: error` - SMTP config

### 2. Response Schema Violations (32 endpoints) ⚠️

#### A. Unicode Character Issues
- `/api/activity-logs` - Unicode in details field
- `/api/audit` - Unicode in details field
- `/api/devices` - Unicode in brand names
- `/api/admin/inventory` - Unicode in brand names

#### B. Datetime → String Conversion
- `/api/admin/birfatura/invoices` - `sent_to_gib_at` datetime not string
- `/api/admin/invoices` - Same issue
- `/api/sms/admin/headers` - `documents_submitted_at` datetime not string

#### C. String → Dict/List Parsing
- `/api/sms/headers` - `documents` stored as string '[]'
- `/api/sms/audiences` - `filter_criteria` stored as string '{}'
- Already fixed with validators

### 3. Undocumented HTTP Status Codes (301 cases) 📝

Most common:
- **404 Not Found** (150+ cases) - Missing in OpenAPI spec
- **403 Forbidden** (40 cases) - Permission errors not documented
- **400 Bad Request** (50+ cases) - Validation errors not documented

**Fix:** Add these status codes to OpenAPI responses

### 4. API Rejected Schema-Compliant Requests (49 cases) 🔧

#### A. Validation Too Strict
- Required fields that should be optional
- Enum values not matching DB values
- Date format mismatches

#### B. Business Logic Validation
- "brand, model, and type are required (or provide a valid inventoryId)"
- "Invalid severity: Must be one of: info, warning, error, critical"
- "System-level rates update not yet implemented"

### 5. Unsupported Methods (472 cases) ℹ️

**Not Critical** - FastAPI doesn't support TRACE/OPTIONS by default
- Already excluded from tests with `--exclude-method TRACE --exclude-method OPTIONS`

## Priority Fixes

### P0 - Critical (Breaks Production)
1. ✅ Fix SGK model import or remove endpoints
2. ✅ Fix `sent_to_gib_at` datetime → string conversion
3. ✅ Fix `tenant_id` NOT NULL constraints in create operations
4. ✅ Fix attribute errors in schemas

### P1 - High (OpenAPI Compliance)
5. Add 404/403/400 status codes to all OpenAPI endpoint definitions
6. Fix unicode handling in activity logs
7. Fix datetime serialization in SMS headers

### P2 - Medium (Validation)
8. Review and fix enum values (source_type, severity, etc.)
9. Add missing schema fields (slug, bodyText, etc.)
10. Fix SQLite integer overflow (use BIGINT or validate input)

### P3 - Low (Nice to Have)
11. Document permission requirements in OpenAPI
12. Add request examples to OpenAPI spec
13. Improve error messages

## Already Fixed (Previous Session)
- ✅ ORJSONResponse → JSONResponse (3 endpoints)
- ✅ DeviceRead.price Optional (2 endpoints)
- ✅ SmsHeaderRequestRead.documents validator (2 endpoints)
- ✅ InvoiceRead.metadata validator (2 endpoints)
- ✅ DeliverabilityMetrics timestamps (3 endpoints)

## Next Steps
1. Fix P0 issues (SGK, datetime, tenant_id, attribute errors)
2. Add missing HTTP status codes to OpenAPI
3. Run Schemathesis again to verify fixes
4. Update bash test to reflect new passing count
