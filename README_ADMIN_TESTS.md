# Admin Endpoints Test Suite

Comprehensive test suite for all X-Ear CRM admin endpoints.

## Test Files

### 1. `test_all_admin_endpoints.py`
Tests all GET endpoints (read operations).

**Coverage:**
- Authentication & user management
- Tenants & dashboard
- Analytics & reporting
- Plans, addons, campaigns
- Email management (bounces, unsubscribes, complaints)
- Notifications & templates
- Settings, roles, permissions
- API keys, appointments
- BirFatura integration
- Integrations, inventory, invoices
- Marketplaces, parties, payments
- Production, scan queue, suppliers, tickets
- Example documents

### 2. `test_admin_mutations.py`
Tests POST/PUT/PATCH/DELETE endpoints (write operations).

**Coverage:**
- User creation
- Plan & addon management
- Campaign creation
- Supplier management
- Ticket creation
- Notification sending & templates
- API key generation
- Marketplace integrations
- Invoice creation
- Database initialization endpoints

### 3. `test_admin_posts_curl.sh`
Bash script using curl for POST endpoint testing (legacy).

### 4. `test_admin_all.sh`
Master test runner that executes all test suites.

## Prerequisites

1. **Backend must be running:**
   ```bash
   cd x-ear/apps/api
   python main.py
   ```

2. **Admin credentials configured:**
   - Email: `admin@x-ear.com`
   - Password: `admin123`

3. **Python dependencies:**
   ```bash
   pip install requests
   ```

## Usage

### Run All Tests
```bash
./test_admin_all.sh
```

### Run Individual Test Suites

**GET endpoints only:**
```bash
python3 test_all_admin_endpoints.py
```

**Mutation endpoints only:**
```bash
python3 test_admin_mutations.py
```

**Curl-based tests:**
```bash
./test_admin_posts_curl.sh
```

## Test Output

### Success Example
```
✓ GET    /api/admin/users
✓ GET    /api/admin/tenants
✓ GET    /api/admin/dashboard
...

Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Passed:        45
⚠ Failed:        0
✗ Missing (404): 0
━ Total:         45

✅ All tests passed!
```

### Failure Example
```
✓ GET    /api/admin/users
✗ GET    /api/admin/missing-endpoint [404 NOT FOUND]
⚠ GET    /api/admin/broken [VALIDATION ERROR]
...

Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Passed:        43
⚠ Failed:        1
✗ Missing (404): 1
━ Total:         45

Failed Endpoints:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  /api/admin/missing-endpoint
    → 404 NOT FOUND
  /api/admin/broken
    → VALIDATION ERROR

❌ Some tests failed
```

## Exit Codes

- `0`: All tests passed
- `1`: One or more tests failed

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Test Admin Endpoints
  run: |
    cd x-ear
    ./test_admin_all.sh
```

## Troubleshooting

### Backend Not Running
```
❌ Cannot connect to backend at http://localhost:5003
   Error: Connection refused

💡 Make sure the backend is running:
   cd x-ear/apps/api && python main.py
```

**Solution:** Start the backend server first.

### Authentication Failed
```
❌ Failed to login: 401
```

**Solution:** Check admin credentials in the database or environment variables.

### Timeout Errors
```
⚠ GET /api/admin/slow-endpoint [TIMEOUT]
```

**Solution:** Increase timeout in test scripts or optimize the endpoint.

## Adding New Tests

### Add GET Endpoint Test

Edit `test_all_admin_endpoints.py`:

```python
ENDPOINTS = [
    # ... existing endpoints ...
    ("GET", "/api/admin/new-endpoint", {"page": 1, "perPage": 10}),
]
```

### Add Mutation Test

Edit `test_admin_mutations.py`:

```python
MUTATION_TESTS = [
    # ... existing tests ...
    {
        "name": "Create New Resource",
        "method": "POST",
        "endpoint": "/api/admin/new-resource",
        "body": {
            "name": "Test Resource",
            "description": "Test description"
        }
    },
]
```

## Test Coverage

Current coverage: **60+ admin endpoints**

### Covered Areas
- ✅ Authentication & authorization
- ✅ User & tenant management
- ✅ Dashboard & analytics
- ✅ Plans & subscriptions
- ✅ Email deliverability
- ✅ Notifications
- ✅ Integrations (BirFatura, SMS, Telegram)
- ✅ Inventory & invoices
- ✅ Marketplaces
- ✅ Parties (Party/Role/Profile architecture)
- ✅ Payments & POS
- ✅ Production orders
- ✅ Suppliers & tickets

### Architecture Compliance

Tests verify compliance with X-Ear architecture:
- **ResponseEnvelope**: All responses use standard envelope
- **Tenant Isolation**: Multi-tenancy security
- **Permission Model**: RBAC enforcement
- **Party Model**: Unified Party/Role/Profile architecture
- **Idempotency**: Idempotency-Key header on mutations

## Performance Benchmarks

Typical execution times:
- GET endpoints: ~30-60 seconds
- Mutation endpoints: ~20-40 seconds
- Full suite: ~60-120 seconds

## Related Documentation

- [Project Rules](../.kiro/steering/project-rules.md)
- [Tech Stack](../.kiro/steering/tech.md)
- [Party Architecture](../.kiro/steering/party-role-profile-architecture.md)
- [API Contract Pipeline](../.kiro/steering/structure.md)
