**Decision:** Harden CI to prevent silent contract/regression breaks

**Summary / Problem**
- Current CI contains non-blocking steps and `|| echo` fallbacks in critical places (OpenAPI generation, some tests). This allows regressions to produce a green CI despite runtime or contract breakage.

**Decision**
- Make the following CI checks blocking (fail the job on failure):
  - `gen:api:check` / OpenAPI vs generated client diff
  - Spectral OpenAPI lint
  - `tsc --noEmit` typecheck
  - Playwright smoke tests for auth + payments (basic flows)
  - Prohibit deep imports of generated client (existing check currently runs; keep and fail on detection)

**Owner**: DevOps / CI Owner (owner: @devops@example.com)
**Reviewer**: Tech Lead (owner: @tech-lead@example.com)

**Acceptance Criteria**
- CI pipeline updated in `.github/workflows/ci.yml` so that `api-sync-check` and `typecheck` are required and fail the merge.
- No CI step uses `|| echo` as a permanent suppression for failing commands (only allowed in experimental branches with explicit flag).
- Playwright smoke test stage added as a required gate for merges to `develop`/`main`.

**Rollout Plan**
1. Change CI to block on `gen:api:check` and operationId snapshot (Week 0–1).
2. Add Spectral lint step and make it blocking (Week 1).
3. Integrate lightweight Playwright smoke tests in CI (Week 1–2).

**Rollback**
- If pipeline flakiness increases, temporarily gate failing tests behind a `--staging-only` flag and triage flakes with flaky-test priority.

**Sign-off**
- CI Owner: __________________  Date: ______
- Tech Lead: _________________  Date: ______
