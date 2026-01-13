# Migration Plan: Multi-Product Monorepo (Zero-Break)

> **STATUS:** DRAFT — Awaiting approval before any implementation begins.

---

## Goals

- Future-ready platform supporting 6+ products
- Zero breakage of existing backend/frontend behavior
- Incremental, opt-in changes only
- Solo-developer sustainable

## Non-Goals

- ❌ No big-bang refactors
- ❌ No removal of existing endpoints/flows without deprecation window
- ❌ No microservices until strictly necessary
- ❌ No repo cloning or splitting

## Product Isolation Statement

> **XCALP** is developed inside the same monorepo but is treated as an **isolated product** with no dependency on `xear_*` products beyond `core/`. This prevents future "should XCALP be a separate repo?" debates.

---

## Current State Snapshot

| Component | Path | Status |
|-----------|------|--------|
| Backend | `apps/backend` | ✅ Running (FastAPI + SQLAlchemy + Alembic) |
| Web App | `apps/web` | ✅ Running (React + Vite) |
| Admin Panel | `apps/admin` | ✅ Running |
| Landing | `apps/landing` | ✅ Running |
| Mobile | `apps/mobile` | 🟡 Minimal |
| Database | **SQLite (dev)** | ✅ Current — No Postgres migration planned yet |
| Migrations | `apps/backend/alembic` | ✅ 18 versions |

> **NOTE:** We are in **DEVELOPMENT PHASE**. Production deployment and Postgres migration are future concerns. All "prod" references in this document are preparation, not immediate action.

---

## Target Repo Layout

```
/
├── apps/
│   ├── api/                         # (rename: apps/backend → apps/api) [LATE PHASE]
│   │   ├── main.py
│   │   ├── core/                    # auth, tenants, plans, billing, ai/ocr, notifications
│   │   │   ├── __init__.py
│   │   │   ├── auth/
│   │   │   ├── tenants/
│   │   │   ├── billing/
│   │   │   ├── ai/
│   │   │   └── notifications/
│   │   ├── products/                # product packs (sector-specific)
│   │   │   ├── xear_hearing/
│   │   │   ├── xear_pharmacy/
│   │   │   ├── xear_hospital/
│   │   │   ├── xear_general/
│   │   │   ├── xear_hotel/
│   │   │   └── xcalp/
│   │   ├── tools/                   # safe tooling only
│   │   │   ├── dev_scripts/         # check_*.py, seed_*.py
│   │   │   └── ops_scripts/         # backup, cleanup
│   │   ├── legacy_shims/            # re-export modules to preserve old imports
│   │   │   └── __init__.py          # from apps.api.core.auth import * (etc.)
│   │   └── db/
│   │       ├── alembic/
│   │       └── migrations/
│   │
│   ├── xear-shell-web/              # (evolve from apps/web)
│   ├── platform-admin/              # (evolve from apps/admin)
│   ├── xcalp-web/                   # (future)
│   └── xcalp-mobile/                # (future)
│
├── packages/
│   ├── ui/                          # (evolve from ui-web)
│   ├── sdk/                         # generated API client
│   ├── feature-flags/               # shared feature gate logic
│   └── ai-core/                     # shared AI/OCR types and utils
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MIGRATION_PLAN.md            # ← THIS DOCUMENT
│   ├── RUNBOOK.md
│   ├── decisions/                   # ADRs (Architecture Decision Records)
│   └── archive/                     # old markdown files from root
│
├── infra/
│   ├── docker/
│   │   ├── docker-compose.dev.yml   # Postgres for dev (opt-in)
│   │   └── docker-compose.prod.yml  # (when needed)
│   └── ci/
│
└── __legacy/
    ├── root_src/                    # moved from /src (debris)
    ├── root_backend/                # moved from /backend (debris)
    └── graveyard/                   # deprecated scripts
```

> **CRITICAL:** First 2–3 weeks, `apps/backend` name stays unchanged.
> Only internal folders are added + scripts moved + shims created.

---

## Compatibility Contract (Must Not Break)

### API Contract
| Rule | Verification |
|------|--------------|
| `/health` returns `200 OK` | CI smoke test |
| `/api/auth/login` unchanged | Integration test |
| OpenAPI schema deterministic | `api-sync-check` CI job |
| No endpoint removal without 2-sprint deprecation | PR review policy |

### Import Path Contract
| Rule | Mechanism |
|------|-----------|
| Moving a module requires shim | `legacy_shims/` re-exports |
| Old paths work for 2 sprints minimum | Test coverage |
| No silent breaks | CI import validation |

### DB Contract
| Rule | Enforcement |
|------|-------------|
| No destructive migrations without rollback | `downgrade()` required |
| No auto-run migrations in production | Manual `alembic upgrade head` |
| Schema changes backward-compatible | Add columns nullable first |

### Admin Authority Contract
| Rule | Enforcement |
|------|-------------|
| Admin write actions on tenant data must be explicit and logged | `ActivityLog` with admin_user_id |
| Read-only access is default for support roles | `AdminRoleModel.scope = READ_ONLY` |
| SUPER_ADMIN required for write operations | Permission check in routers |

---

## Engineering Contracts

> These contracts formalize implicit best practices. Breaking any contract is a **blocking change** requiring explicit ADR and 2-sprint deprecation.

### 1. Unified Access Contract

All access control is enforced via FastAPI dependencies.

| Rule | Enforcement |
|------|-------------|
| No direct access to `request.user` or `tenant_id` inside routers | Code review |
| All permission checks pass through dependency layer | `get_current_user`, `AccessContext` |
| Admin access resolved separately from tenant-scoped access | Separate dependency chain |
| This contract MUST remain stable across all products | CI + architecture review |

### 2. FastAPI Structure Contract

| Rule | Why |
|------|-----|
| Routers must not import ORM models directly | Decoupling |
| All response shapes defined via Pydantic schemas | Type safety |
| ORM models never returned directly from endpoints | Serialization control |
| Schema changes backward-compatible for 2 sprints | Frontend stability |

### 3. Schema Stability Rule

Pydantic response schemas are part of the public API contract.

| Action | Allowed? |
|--------|----------|
| Add optional fields | ✅ Yes |
| Remove fields | ❌ No (without deprecation) |
| Rename fields | ❌ No (without deprecation) |
| Change field types | ❌ No |
| Change default values | ⚠️ Only if preserves previous behavior |

### 4. operationId Stability Contract

> **CRITICAL:** This is what makes Orval/frontend SDK generation stable.

| Rule | Enforcement |
|------|-------------|
| `operationId` values are part of the public API contract | OpenAPI diff in CI |
| `operationId` MUST be deterministic and stable | No random generation |
| `operationId` MUST NOT change once released | PR review policy |
| Renaming, reordering, or regenerating operationId is forbidden | CI block |
| Any operationId change requires explicit ADR + 2 sprint deprecation | Mandatory |

Frontend SDK generation depends on operationId stability.
**Breaking this rule is considered a breaking change.**

### 5. API Client Generation Contract

| Rule | Enforcement |
|------|-------------|
| Frontend SDK is generated via Orval | `npm run gen:api` |
| Generated files MUST NOT be manually edited | `.gitignore` or CI check |
| Any API change requires OpenAPI update + regeneration | CI `api-sync-check` |
| CI blocks merges if drift is detected | Required job |

### 6. Legacy Artefact Cleanup Policy

After FastAPI migration and unified access implementation, the following artefacts MUST be identified and archived:

| Artefact Type | Action |
|---------------|--------|
| Scripts not referenced by CLI, CI, or docs | Archive |
| One-off migration helpers no longer applicable | Archive |
| Pre-FastAPI auth or permission helpers | Archive |
| Manual OpenAPI / schema generation artefacts | Archive |
| Unused `check_*.py` or `fix_*.py` scripts | Archive |

**Cleanup Rules:**
- No deletion without first moving to `__legacy/graveyard`
- Each archived artefact must include a short README explaining:
  - What it was used for
  - Why it is deprecated
- CI must not depend on any archived script

### 7. Naming & Serialization Contract

| Layer | Convention |
|-------|------------|
| Python internal identifiers | `snake_case` |
| Database columns | `snake_case` |
| Pydantic fields (internal) | `snake_case` |
| **API request/response JSON** | **`camelCase`** (via `alias_generator=to_camel`) |
| Frontend variables | `camelCase` (no mapping needed) |

- Frontend must treat API payloads as camelCase; no ad-hoc transforms in UI code
- Changing alias strategy is a breaking change (ADR + 2-sprint deprecation)
- `operationId` generation is independent of camelCase aliasing

### 8. API Path Stability Contract

| Rule | Enforcement |
|------|-------------|
| API paths are part of the public contract | OpenAPI diff in CI |
| Path segments MUST NOT change without deprecation | PR review policy |
| No versioning via path (no `/v2`) unless ADR approved | Architecture review |
| No dynamic path renaming per product | Code review |

### 9. Python Module Export Contract

| Rule | Why |
|------|-----|
| Public imports MUST be re-exported via `__init__.py` | Stable import paths |
| Internal modules MUST NOT be imported directly across domains | Encapsulation |
| Moving a file requires updating re-export, not changing imports | Zero-break |

### 10. Environment Variable Stability Contract

| Rule | Enforcement |
|------|-------------|
| Env var names are part of the platform contract | Documentation |
| Existing env vars MUST NOT be renamed or removed | PR review |
| New behavior via new env vars only | Backward compatibility |
| Default behavior must remain backward-compatible | Testing |

### 11. Script Scope Contract

| Rule | Enforcement |
|------|-------------|
| Scripts MUST NOT be imported by runtime code | Code review |
| Scripts are executed manually or via CI only | Documentation |
| Runtime code must not depend on `tools/`, `scripts/`, or `ops_scripts/` | CI validation |

### 12. JSON Key Contract

| Context | Convention |
|---------|------------|
| Public API JSON keys | `camelCase` |
| Internal JSON blobs (e.g., `Plan.features`) | `snake_case` (stored) |
| If internal JSON exposed via API | Transform to `camelCase` |

- Feature flag names must be stable and lowercase
- Renaming feature flags requires migration + deprecation

---

## Risk Register

| ID | Risk | Impact | Mitigation | Verification | Status |
|----|------|--------|------------|--------------|--------|
| R1 | Prod migration execution | Downtime if failed | Release runbook + backup | Pre-deploy checklist | ⚠️ Open |
| R2 | SQLite → Postgres data loss | Data loss | Export/import script + checksums | Row count validation | ⚠️ Open |
| R3 | Interface drift | Frontend breaks | Contract freeze + smoke tests | CI gates | ⚠️ Open |
| R4 | Import path breaks | Runtime errors | Shims for moved modules | Import smoke test | ✅ Planned |
| R5 | Feature flag bypass | Quota abuse | FeatureGate with logging | Usage audit | ✅ Planned |
| R6 | Unbounded log growth | Storage cost | Retention policy + cleanup | Cron job | ✅ Planned |

---

## Risk Mitigations (Detailed)

### Risk A — Production Migration Execution

**Problem:** "Migrations auto-run olmasın" is correct, but WHO runs them and WHEN?

**Mitigation:** Release Runbook (see below)

### Risk B — SQLite → Postgres Data Migration

**Problem:** Dev uses SQLite; prod needs Postgres. How does existing data move?

**Mitigation:**

1. **Export Script:**
   ```bash
   python tools/ops_scripts/export_sqlite_to_json.py --db xear_crm.db --output data.json
   ```

2. **Import Script:**
   ```bash
   python tools/ops_scripts/import_json_to_postgres.py --input data.json --db $DATABASE_URL
   ```

3. **Validation Metrics:**
   - Row counts per table (before/after)
   - Checksums for critical tables (tenants, users, patients)
   - Foreign key integrity check

4. **Cutover Strategy:**
   - Option A: Read-only window (30 min downtime)
   - Option B: Dual-write period (complex, not recommended for solo dev)

### Risk C — Interface Freeze Policy

**Problem:** How to guarantee frontend never unexpectedly breaks?

**Mitigation:**

1. **Endpoint Freeze:**
   - No endpoint URL changes without deprecation header
   - `Deprecation: true` header + 2 sprint warning period

2. **Import Path Freeze:**
   - Any moved file gets a shim:
     ```python
     # legacy_shims/models.py
     from apps.api.core.models import *  # noqa
     ```

3. **Smoke Test Suite (CI Required):**
   - Backend boots successfully
   - `/health` returns 200
   - `/api/auth/login` with test credentials succeeds
   - `/api/patients` returns 200 (tenant-scoped)
   - `/api/ocr/process` accepts file upload

---

## Phased Plan

### Phase 0 — Visibility Only (Week 1-2)
*No behavior change. Only additions and documentation.*

- [ ] Create empty `apps/backend/core/` folder
- [ ] Create empty `apps/backend/tools/` folder
- [ ] Create `apps/backend/legacy_shims/__init__.py` (empty)
- [ ] Add `product_code` column to `Tenant` (nullable, default `xear_hearing`)
- [ ] Add `retention_days` column to `Plan` (nullable, default 365)
- [ ] Add `DATABASE_TYPE` env var documentation (unused)
- [ ] Create `infra/docker/docker-compose.dev.yml` (Postgres, opt-in)
- [ ] Move root `src/` and `backend/` debris to `__legacy/`
- [ ] Move root markdown files to `docs/archive/`

**Verification Checklist:**
- [ ] All existing tests pass
- [ ] `npm run dev` works unchanged
- [ ] `python main.py` works unchanged
- [ ] CI pipeline green

### Phase 1 — Side-by-Side / Opt-In (Week 3-4)
*New functionality available but not enforced.*

- [ ] Move `check_*.py`, `seed_*.py` scripts to `tools/dev_scripts/`
- [ ] Create shims for any moved files
- [ ] Implement `FeatureGate` class (always returns True)
  - **CRITICAL:** FeatureGate must be **fail-open by default**. If FeatureGate fails or misconfigures, features remain accessible. This prevents 03:00 "customer locked out" disasters.
- [ ] Add `ocr_requests_count` to `Subscription` (tracking only)
- [ ] Create `export_sqlite_to_json.py` script
- [ ] Create `import_json_to_postgres.py` script
- [ ] Document admin authority in `docs/ADMIN_AUTHORITY.md`
- [ ] Add smoke tests to CI (backend boot + /health)

**Verification Checklist:**
- [ ] Scripts work from new location
- [ ] Old import paths still work via shims
- [ ] FeatureGate logs checks without blocking
- [ ] Export/import scripts tested on copy of prod data

### Phase 2 — Default-On (Week 5-6)
*Only after explicit approval and validation.*

- [ ] Extract `core/` modules (auth, tenants) with re-exports
- [ ] Enable `ENFORCE_FEATURE_LIMITS=true` option (soft warning)
- [ ] Make `api-sync-check` CI job required
- [ ] Add smoke tests as CI gate (fail build if /health fails)
- [ ] Rename `apps/backend` → `apps/api` (with shim)
  - **HARD RULE:** Rename must be the **ONLY change** in that release. No other code, schema, or config changes allowed in the same deployment.
- [ ] Recommend Postgres for dev in docs (optional, SQLite remains default)

**Verification Checklist:**
- [ ] Full regression test
- [ ] ~~Prod deployment rehearsal on staging~~ (Future: when staging exists)
- [ ] Rollback procedure tested on local

---

## Database Plan

### Dev DB Strategy
| Option | Env Var | Default |
|--------|---------|---------|
| SQLite | `DATABASE_URL=sqlite:///xear_crm.db` | ✅ Yes |
| Postgres | `DATABASE_URL=postgresql://...` | Via docker-compose.dev.yml |

### Production DB Strategy
- **Database:** Postgres only
- **Migration execution:** Manual via release runbook
- **Backup policy:** Before every migration (pg_dump)
- **Connection pooling:** PgBouncer (when scale requires)

### Data Migration Procedure

1. **Pre-migration:**
   ```bash
   pg_dump $PROD_DB > backup_$(date +%Y%m%d).sql
   python export_sqlite_to_json.py --validate
   ```

2. **Migration:**
   ```bash
   python import_json_to_postgres.py --dry-run
   python import_json_to_postgres.py --execute
   ```

3. **Validation:**
   ```bash
   python validate_migration.py --compare sqlite:source postgres:target
   ```

4. **Cutover:**
   - Update `DATABASE_URL` in production env
   - Restart application
   - Monitor /health for 5 minutes

---

## CI / Testing Gates

### Required Jobs (Must Pass)
| Job | Purpose |
|-----|---------|
| `typecheck` | TypeScript errors |
| `lint` | ESLint critical errors |
| `build` | Production bundle |
| `backend-tests` | Python tests with Postgres |
| `security-scan` | NPM audit + secret scan |

### Smoke Tests (To Be Added)
| Test | Endpoint | Expected |
|------|----------|----------|
| Boot | N/A | Backend starts without error |
| Health | `GET /health` | 200 OK |
| Auth | `POST /api/auth/login` | 200 with token |
| Patients | `GET /api/patients?per_page=1` | 200 with array |
| OCR | `POST /api/ocr/process` (test file) | 200 or 202 |

### Contract Checks
| Check | Trigger | Action on Fail |
|-------|---------|----------------|
| OpenAPI drift | PR | Block merge |
| Import path break | PR | Block merge |
| Smoke test fail | Deploy | Abort deploy |

---

## Release Runbook (Production)

### Pre-Deploy
1. [ ] Create database backup
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```
2. [ ] Review migration files (any destructive DDL?)
3. [ ] Notify team of deployment window

### Deploy
4. [ ] Apply migrations
   ```bash
   cd apps/backend && alembic upgrade head
   ```
5. [ ] Deploy new application version
6. [ ] Verify /health returns 200
7. [ ] Run smoke tests
   ```bash
   ./scripts/smoke_test.sh
   ```

### Post-Deploy
8. [ ] Monitor error rates for 15 minutes
9. [ ] Verify critical flows (login, patient create, OCR)
10. [ ] Confirm in team channel

### Rollback Trigger Conditions
- /health returns non-200
- Error rate exceeds baseline by 3x
- Smoke tests fail
- Any data corruption detected

---

## Rollback Plan

### Application Rollback
```bash
# Revert to previous version
git checkout <previous-tag>
# Redeploy
./deploy.sh
```

### Database Rollback
```bash
# Downgrade one migration
cd apps/backend && alembic downgrade -1

# If multiple migrations
alembic downgrade <target-revision>

# Emergency: restore from backup
psql $DATABASE_URL < backup_YYYYMMDD.sql
```

### Data Recovery Notes
- Backups retained for 30 days
- Point-in-time recovery available (if WAL archiving enabled)
- Contact: [DBA contact or self-service docs]

---

## "Do Not Touch" List

| Item | Reason |
|------|--------|
| `alembic/versions/*` | Immutable history; never edit existing migrations |
| `models/__init__.py` exports | Changing breaks all router imports |
| `main.py` router registration order | May affect middleware precedence |
| `TenantScopedQuery` in `base.py` | Core security; changes require full audit |
| `ci.yml` required jobs list | Changing gates risks broken deploys |
| `openapi.yaml` / `openapi.json` | operationId + SDK generation dependency |
| `apps/web/src/api/generated/**` | Generated SDK; manual edits forbidden |
| `/api/auth/*` endpoints | Session behavior must not change |
| `/api/patients/*` response shape | Frontend depends on exact fields |
| `schemas/base.py` alias_generator | camelCase output; changing breaks all clients |

---

## Required Shims/Re-exports

When files are moved, create shims to preserve old import paths:

| Old Path | New Path | Shim Location |
|----------|----------|---------------|
| `models/*` | `core/models/*` | `legacy_shims/models.py` |
| `database.py` | `core/database.py` | `legacy_shims/database.py` |
| `dependencies.py` | `core/dependencies.py` | `legacy_shims/dependencies.py` |
| `check_*.py` | `tools/dev_scripts/` | No shim (scripts, not imports) |

**Shim template:**
```python
# legacy_shims/models.py
# DEPRECATED: Import from core.models instead
# This shim will be removed after 2 sprints
from core.models import *  # noqa: F401, F403
```

---

## Approval Checklist

Before ANY implementation begins:

- [ ] Target repo layout approved
- [ ] Compatibility contracts understood
- [ ] Risk register reviewed (all ⚠️ → ✅)
- [ ] Release runbook validated (for future prod use)
- [ ] Rollback plan verified
- [ ] CI smoke tests defined
- [ ] Smoke tests executed manually on local with realistic test data

**Approver:** ________________  
**Date:** ________________

---

## Architectural Decisions (Resolved)

### 1. XCALP Consumer Model

**Decision:** ✅ Same DB + `tenant_type` flag

| Option | Status |
|--------|--------|
| Separate DB per consumer type | ❌ Rejected (premature optimization) |
| Same DB with `tenant_type` flag | ✅ Approved |

**Implementation:**
- Add `tenant_type` enum to `Tenant` model: `{B2B, CONSUMER}`
- Unified access, RBAC, audit, billing remain unchanged
- Separate DB only if regulation or scale mandates it

### 2. White-label Domains

**Decision:** ✅ Subdomain per tenant

| Pattern | Example |
|---------|---------|
| Tenant subdomain | `{tenant}.xear.app`, `{tenant}.xcalp.app` |

**Rationale:**
- Auth cookies, CORS, branding clearly scoped
- No admin/routing chaos
- Product-based subdomain avoided (future breakage risk)

### 3. AI/OCR Cost Allocation

**Decision:** ✅ Per-tenant metering + plan quota

| Component | Implementation |
|-----------|----------------|
| Plan limit | `Plan.ocr_requests_limit` (monthly) |
| Usage counter | `Tenant.ocr_requests_count` or `Subscription` field |
| Enforcement | Soft warning → hard block (via FeatureGate) |

**Rationale:**
- Most transparent and scalable
- Flat-rate = abuse risk
- AI costs controlled

## Critical Clarifications (From Consultant Review)

> **Q: Is production currently using SQLite or Postgres?**
>
> **A:** We are in **development phase**. There is no production deployment yet. SQLite is the current database. Postgres migration is a **future concern**, not immediate. This document prepares for that eventuality but does not require it for Phase 0-1.

---

## [NEW] Frontend Stability Contract

> **Purpose:** Explicitly protect frontend from backend changes.

### What MUST NEVER Change

| Item | Reason | CI Enforcement |
|------|--------|----------------|
| `operationId` values | Orval SDK hook names derive from these | OpenAPI diff |
| `apps/web/src/api/generated/**` | Generated SDK; manual edits forbidden | Git check |
| `schemas/base.py` `alias_generator=to_camel` | camelCase output; all clients depend on this | Code review |
| Response field names | Frontend destructures by exact name | Schema stability contract |
| Response envelope structure (`success`, `data`, `meta`) | All SDK consumers expect this shape | Contract test |

### What MAY Change (With Deprecation)

| Change Type | Deprecation Period | Notification |
|-------------|-------------------|--------------|
| Add new optional response field | None required | Changelog |
| Add new optional request field | None required | Changelog |
| Add new endpoint | None required | OpenAPI update |
| Deprecate endpoint | 2 sprints | `Deprecation: true` header |
| Remove endpoint | 2 sprints after deprecation | ADR required |

### CI Enforcement Points

| Check | Trigger | Blocks Merge |
|-------|---------|--------------|
| OpenAPI operationId diff | PR | ✅ Yes |
| Generated SDK drift | PR | ✅ Yes |
| Schema field removal | PR | ✅ Yes |
| alias_generator change | PR | ✅ Yes (code review) |

### [NEW] Frontend Environment Stability Contract

| Rule | Enforcement |
|------|-------------|
| `NEXT_PUBLIC_*` env vars are part of the public frontend contract | Documentation + code review |
| Existing `NEXT_PUBLIC_*` vars MUST NOT be renamed or removed | PR review |
| New frontend behavior requires new env vars only | Backward compatibility |
| Default values must preserve previous behavior | Manual test |
| Frontend must not hardcode API URLs or domains | Lint / code review |

### [NEW] Frontend Feature Flag Contract

| Rule | Enforcement |
|------|-------------|
| Frontend must treat feature flags as advisory only | Code review |
| Backend is the source of truth for feature availability | Architecture rule |
| Frontend must not assume feature availability based on plan alone | QA check |
| All new feature flags must be fail-open by default | Product safety |
| Feature flag UI must gracefully degrade when flag is disabled | UX review |

---

## [NEW] Affiliate Architecture Review

> **Purpose:** Document current affiliate system assumptions for multi-product future.

### Current Model (User-Based)

| Entity | Table | Key Fields |
|--------|-------|------------|
| Affiliate | `affiliate_user` | `id`, `email`, `code`, `iban`, `is_active` |
| Commission | `commission_ledger` | `affiliate_id`, `tenant_id`, `event`, `amount`, `status` |
| Tenant Link | `tenants` | `affiliate_id` (FK), `referral_code` |

### Attribution Flow

```
1. Landing page → ?ref=CODE or ?referralCode=CODE
2. /api/affiliate/lookup validates code
3. Registration captures referral_code
4. Tenant created with affiliate_id + referral_code
5. Commission events trigger commission_ledger entries
```

### What is SAFE (Must Remain Unchanged)

| Item | Reason |
|------|--------|
| `AffiliateUser` model | FK references from tenants + commissions |
| `affiliate_user.code` uniqueness | Attribution depends on this |
| `Tenant.referral_code` + `Tenant.affiliate_id` | Commission tracking |
| `/api/affiliate/lookup` endpoint | Landing page validation |

### What is RISKY (Can Be Fixed Incrementally)

| Risk | Impact | Safe Fix |
|------|--------|----------|
| No `product_code` on affiliate | Can't track which product referred | Add nullable column |
| No campaign tracking | Can't distinguish referral sources | Add `campaign_id` to tenant |
| Commission ledger has Integer `tenant_id` | Inconsistent with String `tenant.id` | Future migration |

### What MUST NOT Change

| Item | Reason |
|------|--------|
| `affiliate_user` table name | FK constraints |
| `commission_ledger` table name | Reports + payments depend on it |
| `?ref=` URL param convention | Existing links in the wild |

### Multi-Product Future Risks

| Risk | Current State | Mitigation |
|------|---------------|------------|
| Affiliate tied to product | No product association | Add `product_code` to `affiliate_user` |
| Single landing page | X-Ear only hardcoded | Parameterize or create separate landings |
| Commission rates | Not product-specific | Add `product_code` to commission rules |

---

## [NEW] Landing Page Architectural Assumptions & Risks

> **Purpose:** Make landing page assumptions explicit for multi-product future.

### Current State

| Aspect | Value | Evidence |
|--------|-------|----------|
| Framework | Next.js | `apps/landing/next.config.ts` |
| Product | X-Ear (İşitme Merkezi) only | Hardcoded in `page.tsx` |
| Routes | `/`, `/pricing`, `/register`, `/checkout`, `/affiliate`, `/faq` | `src/app/` structure |
| Domain coupling | Single domain assumed | `NEXT_PUBLIC_WEB_URL` env var |
| API client | Custom `apiClient` | `src/lib/api-client.ts` |

### Single-Product Assumptions (DANGEROUS for Multi-Product)

| Assumption | Location | Risk |
|------------|----------|------|
| "İşitme Merkezi" branding | `page.tsx` hero | Hardcoded, not parameterized |
| Feature list (SGK, cihaz takibi) | `page.tsx` features | X-Ear specific |
| No product selector | `/register` | Single product flow |
| No `product_code` in registration | API call | Backend doesn't receive product info |

### Affiliate Entry Points

| Entry Point | Implementation | Status |
|-------------|----------------|--------|
| `?ref=CODE` URL param | `useSearchParams()` in `register/page.tsx` | ✅ Working |
| `/api/affiliate/lookup` | Backend validation | ✅ Working |
| `referral_code` in registration payload | Captured and sent | ✅ Working |

### Multi-Product Transition Options

| Option | Effort | Recommendation |
|--------|--------|----------------|
| A. Parameterize landing by `?product=` | Medium | ⚠️ Not recommended (complexity) |
| B. Separate landing apps (`xcalp-landing`) | High | ✅ Recommended for isolation |
| C. Route-based (`/xcalp/*` vs `/xear/*`) | Medium | Possible but messy |

### What MUST NOT Change (Without Migration Plan)

| Item | Reason |
|------|--------|
| `/register` flow | Affiliate attribution depends on it |
| `?ref=` param convention | Links in the wild |
| `/api/affiliate/lookup` endpoint | Landing page validation |

---

## [EXPANDED] Legacy Artefact Cleanup Policy

> **Updated:** Concrete examples from codebase audit.

### Confirmed Artefacts to Archive

| File/Folder | Type | Reason | Action |
|-------------|------|--------|--------|
| `routes_flask_archive/` (75+ files) | Flask routes | Pre-FastAPI migration residue | Archive to `__legacy/` |
| `sales_full_backup.py` (133KB) | Backup file | Obsolete monolithic code | Archive |
| `sales_monolithic_backup.py` (143KB) | Backup file | Obsolete | Archive |
| `suppliers_old_backup.py` (26KB) | Backup file | Obsolete | Archive |
| `app.py.archived` (51KB) | Archived Flask app | Pre-FastAPI | Keep as reference |
| `unify_admin_access.py` (at root) | Migration script | One-off | Archive |
| `test_contract_*.py` (at root) | Test scripts | Should be in `tests/` | Move or archive |

### What to Keep (Do NOT Archive)

| Item | Reason |
|------|--------|
| `alembic/versions/*` | Migration history; immutable |
| `tests/*` | Active test suite |
| `routers/*` | Active FastAPI routers |
| `services/*` | Active business logic |
| `models/*` | Active ORM models |
| `scripts/generate_openapi.py` | Active OpenAPI generation |

### What MUST NEVER Be Deleted

| Item | Reason |
|------|--------|
| Any migration in `alembic/versions/` | Database history |
| `models/__init__.py` | Import structure |
| `schemas/base.py` | All schemas inherit from it |

### CI / Runtime Safety Rules

| Rule | Enforcement |
|------|-------------|
| Archived files not imported | CI grep check |
| No runtime dependency on `__legacy/` | Import validation |
| Archive has README per folder | PR review |

---

## Final Audit Check

| Question | Answer |
|----------|--------|
| Is frontend breakage now explicitly prevented? | ✅ Yes — Frontend Stability Contract defines immutable items |
| Are affiliate assumptions fully documented? | ✅ Yes — Model, flow, and multi-product risks documented |
| Are landing-page risks now explicit? | ✅ Yes — Single-product assumptions listed with migration options |
| Remaining architectural unknowns | None blocking Phase 0-1 |

---

> **NEXT STEP:** Review this document and provide explicit approval or feedback on each section before implementation begins.
