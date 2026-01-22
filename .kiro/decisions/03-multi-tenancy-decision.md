**Decision:** Maintain strict tenant ContextVar usage and prevent context leaks

**Summary / Problem**
- Multi-tenancy isolation is implemented via ContextVar patterns and `tenant_task` decorators. Mistakes (e.g., `set_current_tenant_id(None)` misuse) can cause cross-tenant leakage.

**Decision**
- Enforce token-based ContextVar reset pattern (`token = _current_tenant_id.set(None)` / `_current_tenant_id.reset(token)`) in all middleware and background tasks.
- Add additional property tests and CI checks for tenant isolation for background jobs and async tasks.

**Owner**: Backend Security Owner (owner: @sec-backend@example.com)
**Reviewer**: QA Lead (owner: @qa-lead@example.com)

**Acceptance Criteria**
- Middleware and tenant utilities audited; no use of `set_current_tenant_id(None)` (CI currently checks; make it blocking).
- Add integration tests that create two tenants and verify no cross-tenant visibility for party/financial endpoints.
- Background tasks run under `gather_with_tenant_context()` helper where necessary.

**Rollout Plan**
1. Immediate: make the existing CI detection of `set_current_tenant_id(None)` blocking (Day 0–2).
2. Add tenant isolation tests for background tasks, run in CI (Day 3–10).

**Sign-off**
- Security Owner: ________________ Date: ______
- QA Lead: ______________________ Date: ______
