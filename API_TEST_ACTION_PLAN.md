# API Testing - Prioritized Action Plan

**Date:** 2026-02-21  
**Current Success Rate:** 52.63%  
**Target Success Rate:** 95%

---

## Phase 1: Critical Backend Fixes (Estimated: 2-4 hours)

### 1.1 Fix Invoice Creation Database Error ⚠️ CRITICAL

**Issue:** SQLite datatype mismatch in sequences table  
**Error:** `datatype mismatch` when inserting into sequences table  
**Impact:** Blocks all invoice-related testing (10+ endpoints)

**Action:**
```python
# File: apps/api/alembic/versions/xxx_fix_sequences_table.py
# Check sequences table schema - year column should be INTEGER not TEXT

# Migration:
def upgrade():
    # Ensure year column is INTEGER
    op.alter_column('sequences', 'year',
                    existing_type=sa.String(),
                    type_=sa.Integer(),
                    existing_nullable=False)
```

**Files to Check:**
- `apps/api/core/models/sequence.py`
- `apps/api/alembic/versions/*_sequences.py`

**Expected Impact:** +15 passing tests

---

### 1.2 Fix User Creation Internal Error ⚠️ CRITICAL

**Issue:** `POST /api/users` returns 500 Internal Server Error  
**Impact:** Cannot test user management flows

**Action:**
1. Check server logs for stack trace
2. Likely issues:
   - Missing required fields in request
   - Database constraint violation
   - Password hashing error
   - Tenant context issue

**Files to Check:**
- `apps/api/routers/users.py`
- `apps/api/services/user_service.py`
- `apps/api/core/models/user.py`

**Debug Command:**
```bash
# Check backend logs during test
tail -f apps/api/logs/app.log | grep "POST /api/users"
```

**Expected Impact:** +5 passing tests

---

### 1.3 Fix Addon Enum Validation Error ⚠️ CRITICAL

**Issue:** `GET /api/admin/addons` fails with enum error  
**Error:** `'FEATURE' is not among the defined enum values`  
**Impact:** Admin addon management broken

**Action:**
```python
# File: apps/api/core/models/addon.py or schemas/addon.py

# Current enum (incorrect):
class AddonType(str, Enum):
    PER_USER = "PER_USER"
    FLAT_FEE = "FLAT_FEE"
    USAGE_BASED = "USAGE_BASED"

# Fix: Add FEATURE to enum
class AddonType(str, Enum):
    PER_USER = "PER_USER"
    FLAT_FEE = "FLAT_FEE"
    USAGE_BASED = "USAGE_BASED"
    FEATURE = "FEATURE"  # Add this
```

**Files to Check:**
- `apps/api/core/models/addon.py`
- `apps/api/schemas/addon.py`
- Database: Check existing addon records for 'FEATURE' type

**Expected Impact:** +2 passing tests

---

## Phase 2: Test Framework Improvements (Estimated: 3-5 hours)

### 2.1 Fix Sale Creation Schema

**Issue:** Sale creation fails with missing `productId` field  
**Impact:** Blocks 15+ sale-related tests

**Action:**
```python
# File: tests/api_testing/data_generator.py

def generate_sale_data(self, party_id: str, device_id: str, product_id: str) -> dict:
    return {
        "partyId": party_id,
        "deviceId": device_id,
        "productId": product_id,  # Add this field
        "saleDate": datetime.now().isoformat(),
        "totalAmount": 15000.00,
        "currency": "TRY",
        "paymentMethod": "CASH",
        "status": "COMPLETED"
    }
```

**Files to Modify:**
- `tests/api_testing/data_generator.py`
- `tests/api_testing/resource_manager.py` - Update create_sale() method

**Expected Impact:** +20 passing tests

---

### 2.2 Implement Resource Isolation Strategy

**Issue:** Tests delete resources that other tests depend on  
**Impact:** Cascading failures, inconsistent test results

**Solution Options:**

#### Option A: Test-Specific Resources (Recommended)
```python
# Each test creates its own resources
# Cleanup happens after ALL tests complete

class TestRunner:
    def __init__(self):
        self.created_resources = []  # Track all created resources
    
    def cleanup_all(self):
        # Delete in reverse order of creation
        for resource in reversed(self.created_resources):
            self.delete_resource(resource)
```

#### Option B: Resource Pooling
```python
# Create a pool of resources at start
# Tests use resources from pool but don't delete them
# Cleanup happens at end

class ResourcePool:
    def __init__(self):
        self.parties = []
        self.devices = []
        self.sales = []
    
    def get_party(self) -> str:
        return random.choice(self.parties)
```

**Files to Modify:**
- `tests/api_testing/test_runner.py`
- `tests/api_testing/resource_manager.py`
- `tests/api_testing/cleanup_manager.py`

**Expected Impact:** +30 passing tests

---

### 2.3 Add File Upload Support

**Issue:** All bulk upload endpoints fail with validation errors  
**Impact:** 5+ file upload tests failing

**Action:**
```python
# File: tests/api_testing/data_generator.py

def generate_file_upload(self, file_type: str) -> dict:
    """Generate multipart/form-data for file uploads"""
    if file_type == "csv":
        content = "name,email,phone\nTest User,test@example.com,+905551234567"
        return {
            "file": ("test.csv", content, "text/csv")
        }
    elif file_type == "excel":
        # Generate minimal Excel file
        import io
        import pandas as pd
        df = pd.DataFrame({"name": ["Test"], "email": ["test@example.com"]})
        buffer = io.BytesIO()
        df.to_excel(buffer, index=False)
        return {
            "file": ("test.xlsx", buffer.getvalue(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        }
```

**Files to Modify:**
- `tests/api_testing/data_generator.py`
- `tests/api_testing/test_runner.py` - Handle multipart requests

**Expected Impact:** +5 passing tests

---

### 2.4 Improve Resource ID Extraction

**Issue:** Assignment creation doesn't extract ID properly  
**Impact:** 3+ assignment tests skipped

**Action:**
```python
# File: tests/api_testing/resource_manager.py

def extract_id(self, response_data: dict, resource_type: str) -> Optional[str]:
    """Extract ID from various response formats"""
    
    # Try common patterns
    patterns = [
        lambda d: d.get("data", {}).get("id"),
        lambda d: d.get("id"),
        lambda d: d.get("data", {}).get(f"{resource_type}Id"),
        lambda d: d.get(f"{resource_type}Id"),
        lambda d: d.get("data", {}).get("assignmentId"),  # Specific for assignments
    ]
    
    for pattern in patterns:
        try:
            id_value = pattern(response_data)
            if id_value:
                return str(id_value)
        except (KeyError, TypeError):
            continue
    
    return None
```

**Files to Modify:**
- `tests/api_testing/resource_manager.py`

**Expected Impact:** +3 passing tests

---

## Phase 3: Backend Implementation Gaps (Estimated: 8-16 hours)

### 3.1 Implement Product Management Endpoints

**Issue:** `POST /api/products` returns 404  
**Impact:** Cannot test product workflows

**Action:**
1. Create product model (if not exists)
2. Create product router
3. Implement CRUD operations
4. Add to main.py router includes

**Files to Create/Modify:**
- `apps/api/core/models/product.py`
- `apps/api/routers/products.py`
- `apps/api/schemas/products.py`
- `apps/api/services/product_service.py`
- `apps/api/main.py` - Add router

**Expected Impact:** +8 passing tests

---

### 3.2 Implement Ticket System Endpoints

**Issue:** `POST /api/tickets` returns 404  
**Impact:** Support ticket functionality unavailable

**Action:**
1. Verify ticket model exists (`apps/api/core/models/ticket.py`)
2. Create ticket router
3. Implement CRUD operations
4. Add to main.py router includes

**Files to Check/Create:**
- `apps/api/core/models/ticket.py` (exists)
- `apps/api/routers/tickets.py` (create)
- `apps/api/schemas/tickets.py` (create)
- `apps/api/services/ticket_service.py` (create)
- `apps/api/main.py` - Add router

**Expected Impact:** +6 passing tests

---

### 3.3 Fix Resource Lookup Issues

**Issue:** Created resources return 404 on subsequent requests  
**Examples:**
- Campaign created but not found
- Device created but not found
- Appointment created but not found

**Possible Causes:**
1. Tenant isolation issue - resource created in one tenant, queried in another
2. Database transaction not committed
3. ID format mismatch (UUID vs string)

**Action:**
```python
# Check tenant context in all operations
# File: apps/api/routers/*.py

@router.get("/{resource_id}")
async def get_resource(
    resource_id: str,
    tenant_id: str = Depends(get_current_tenant_id),  # Ensure tenant context
    db: Session = Depends(get_db)
):
    resource = db.query(Resource).filter(
        Resource.id == resource_id,
        Resource.tenant_id == tenant_id  # Critical: tenant filter
    ).first()
    
    if not resource:
        raise HTTPException(status_code=404, detail="Resource not found")
    
    return resource
```

**Files to Check:**
- All routers in `apps/api/routers/`
- `apps/api/core/dependencies.py` - Tenant context management

**Expected Impact:** +25 passing tests

---

## Phase 4: Edge Cases & Refinements (Estimated: 4-8 hours)

### 4.1 Fix Authentication Edge Cases

**Issues:**
- `POST /api/auth/login` - Field format requirements
- `POST /api/auth/refresh` - Token type validation
- OTP-related endpoints require specific setup

**Action:**
1. Document required auth field formats
2. Update test data generator with correct formats
3. Add OTP mocking for test environment

**Expected Impact:** +8 passing tests

---

### 4.2 Handle Plan Restrictions

**Issue:** `POST /api/branches` fails with plan limit  
**Solution:** Check plan limits before testing restricted operations

**Action:**
```python
# File: tests/api_testing/test_runner.py

def should_skip_test(self, endpoint: dict) -> bool:
    """Skip tests that would hit plan limits"""
    
    # Skip branch creation if limit reached
    if endpoint["path"] == "/api/branches" and endpoint["method"] == "POST":
        branches = self.get_existing_branches()
        if len(branches) >= self.plan_limits["branches"]:
            return True
    
    return False
```

**Expected Impact:** +1 passing test (or properly skipped)

---

## Phase 5: Validation & Documentation (Estimated: 2-4 hours)

### 5.1 Re-run Full Test Suite

After implementing fixes, run complete test suite:

```bash
cd x-ear
python -m tests.api_testing.cli \
  --base-url http://localhost:5003 \
  --openapi openapi.yaml \
  --admin-email admin@xear.com \
  --admin-password admin123 \
  --timeout 30 \
  --output test_results_phase5.txt
```

**Expected Results:**
- Success rate: 85-90%
- Remaining failures: Legitimate edge cases or unimplemented features

---

### 5.2 Document Known Limitations

Create documentation for:
1. Endpoints that are intentionally not implemented
2. Features that require specific setup (e.g., SMS integration)
3. Plan-restricted features
4. Test environment limitations

---

## Success Metrics

| Phase | Expected Success Rate | Estimated Time |
|-------|----------------------|----------------|
| Current | 52.63% | - |
| After Phase 1 | 65-70% | 2-4 hours |
| After Phase 2 | 75-80% | +3-5 hours |
| After Phase 3 | 85-90% | +8-16 hours |
| After Phase 4 | 90-95% | +4-8 hours |

**Total Estimated Time:** 17-33 hours

---

## Quick Wins (Can be done in 1-2 hours)

1. ✅ Fix addon enum (5 minutes)
2. ✅ Fix sale creation schema (15 minutes)
3. ✅ Improve resource ID extraction (30 minutes)
4. ✅ Add file upload support (1 hour)

**Expected Impact:** +10 passing tests in 2 hours

---

## Monitoring & Continuous Improvement

### Daily Test Runs
```bash
# Add to CI/CD pipeline
npm run test:api

# Or cron job
0 2 * * * cd /path/to/x-ear && python -m tests.api_testing.cli --base-url http://localhost:5003
```

### Success Rate Tracking
- Track success rate over time
- Alert on regression (success rate drops)
- Celebrate improvements

### Test Coverage Goals
- **Week 1:** 70% success rate
- **Week 2:** 85% success rate
- **Week 3:** 95% success rate
- **Ongoing:** Maintain 95%+ success rate

---

## Conclusion

The automated API testing system has successfully identified **specific, actionable issues**. By following this phased approach, we can systematically improve the success rate from 52.63% to 95%+ while building confidence in the API's reliability.

**Recommended Starting Point:** Phase 1 (Critical Backend Fixes) - Highest impact, lowest effort.
