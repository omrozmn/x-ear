**Decision:** Stabilize OpenAPI ↔ Runtime contract and enforce operationId stability

**Summary / Problem**
- OpenAPI is the single source of truth but runtime responses sometimes diverge (snake_case, raw ORM `to_dict()`, missing ResponseEnvelope), causing frontend tolerance logic and duplication (hybridCamelize). OperationId drift breaks generated hooks and has high blast radius.

**Decision**
- Enforce canonical ResponseEnvelope + camelCase on all production HTTP responses.
- Prohibit returning raw ORM `to_dict()` from routers; require Pydantic schema serialization with `by_alias=True`.
- Commit and enforce an `operationId` snapshot; adapt adapters to absorb any future operationId changes.

**Options Considered**
- A: Strict (Recommended) — Apply Pydantic serialization everywhere, make OpenAPI generation authoritative, make operationId snapshot blocking in CI.
- B: Gradual — Keep hybrid adapters and only fix critical endpoints first (less safe).

**Recommended**: Option A.

**Owner**: Backend Lead (owner: @backend-lead@example.com)
**Reviewer**: Frontend Lead (owner: @frontend-lead@example.com)

**Acceptance Criteria**
- CI fails when `apps/api/scripts/generate_openapi.py` output differs from `x-ear/openapi.yaml` unless explicitly allowed.
- No routers use `.to_dict()` (CI already checks; make it blocking). See `apps/api` lint rule in CI.
- Top 10 business-critical endpoints (auth, payments, invoices, SGK, subscriptions) pass contract integration tests asserting runtime JSON === OpenAPI schema (including alias names).
- `operationId` snapshot file added at `.operation-ids-snapshot.txt` and CI job rejects OpenAPI changes that alter operationIds without a documented owner-approved change.

**Rollout Plan (3 phases)**
1. Week 1: Add snapshot, make CI block on `.to_dict()` and operationId diffs; migrate 3 highest-risk endpoints.
2. Week 2–3: Migrate remaining business-critical endpoints, add contract integration tests.
3. Week 4: Full sweep; revert adapter hybridCamelize usage where not needed.

**Rollback**
- Revert merges per normal Git process; CI gating prevents automatic deploys until tests pass.

**Sign-off**
- Backend Lead: __________________  Date: ______
- Frontend Lead: _________________  Date: ______
