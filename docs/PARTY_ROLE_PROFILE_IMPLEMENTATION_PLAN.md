# Party + Role + Profile Implementation Plan

**Created:** 2026-01-13  
**Version:** 2.0 (Final)  
**Status:** Ready for Execution  
**Estimated Duration:** 7 weeks  
**Reference:** [MIGRATION_GAP_RISK_AUDIT.md](./MIGRATION_GAP_RISK_AUDIT.md)

---

## Critical Rules

> [!IMPORTANT]
> **Router Scope Rule (Phase 1+):**
> Routers may ONLY:
> - Validate input
> - Call service methods
> - Return response
>
> **NO branching, NO domain logic, NO conditional mapping in routers.**
> This minimizes Phase 3 diff significantly.

---

## Phase 0: Preparation (Week 1)

### 0.1 Documentation & Approval
- [ ] Copy `MIGRATION_GAP_RISK_AUDIT.md` to `docs/PARTY_ROLE_PROFILE_MIGRATION.md`
- [ ] Create `HEARING_CENTER_REFERENCE.md` documenting all hearing-specific logic
- [ ] Get stakeholder sign-off on migration plan

### 0.2 Test Infrastructure
- [ ] Create `apps/api/tests/test_hearing_flows.py`
  - [ ] `test_patient_sgk_info_crud()`
  - [ ] `test_hearing_test_crud()`
  - [ ] `test_ereceipt_workflow()`
  - [ ] `test_device_assignment_bilateral()`
  - [ ] `test_sgk_document_upload()`
- [ ] Verify all hearing flow tests pass on current codebase
- [ ] Add tests to CI pipeline with `@pytest.mark.hearing_flow`

### 0.3 Baseline Snapshots
- [ ] Create `scripts/snapshot-operationids.sh`
- [ ] Run snapshot and commit `.operation-ids-snapshot.txt`
- [ ] Create `scripts/verify-codegen.sh`
- [ ] Document current IndexedDB schema version

**Gate:** All hearing tests pass, snapshots committed

---

## Phase 1: Internal Adapters (Week 2-3)

### 1.1 Service Layer
- [ ] Create `apps/api/services/__init__.py`
- [ ] Create `apps/api/services/party_service.py`
  ```python
  class PartyService:
      def get_party(self, party_id: str) -> Patient
      def list_parties(self, filters: dict) -> list[Patient]
      def create_party(self, data: dict) -> Patient
      def update_party(self, party_id: str, data: dict) -> Patient
      def delete_party(self, party_id: str) -> None
  ```
- [ ] Create `apps/api/services/hearing_profile_service.py`
  ```python
  class HearingProfileService:
      def get_hearing_profile(self, party_id: str)
      def create_hearing_test(self, party_id: str, data: dict)
      def get_sgk_info(self, party_id: str)
  ```

### 1.2 Refactor Routers to Use Services

> ⚠️ **Router Scope Rule applies here!**

- [ ] Refactor `routers/patients.py`:
  - Move ALL business logic to `PartyService`
  - Router only: validate → call service → return response
- [ ] Refactor `routers/patient_subresources.py`:
  - Move hearing logic to `HearingProfileService`
  - Move device/appointment logic to `PartyService`
- [ ] Keep ALL operationIds unchanged
- [ ] Keep ALL response schemas unchanged

### 1.3 Verification
- [ ] All existing tests pass
- [ ] All hearing flow tests pass
- [ ] `npm run gen:api` produces no diff
- [ ] API behavior identical (smoke test)

**Gate:** No public API changes, services working internally

---

## Phase 2: Database Migration (Week 4)

### 2.1 Create New Tables (Additive)
- [ ] Create migration: `alembic revision -m "create_party_roles_table"`
  ```python
  def upgrade():
      op.create_table('party_roles',
          sa.Column('id', sa.String(50), primary_key=True),
          sa.Column('party_id', sa.String(50), nullable=False),
          sa.Column('role_code', sa.String(20), nullable=False),
          sa.Column('assigned_at', sa.DateTime),
      )
  ```
- [ ] Create migration: `alembic revision -m "create_hearing_profiles_table"`
  ```python
  def upgrade():
      op.create_table('hearing_profiles',
          sa.Column('id', sa.String(50), primary_key=True),
          sa.Column('party_id', sa.String(50), nullable=False),
          sa.Column('sgk_info', sa.Text),
          sa.Column('created_at', sa.DateTime),
      )
  ```
- [ ] Run migrations on dev database
- [ ] Verify migrations are reversible (`alembic downgrade`)

### 2.2 Data Population (Copy, Not Dual-Write)

> [!NOTE]
> **Strategy: Copy + Cutover (not dual-write)**
> - One-time copy from patients → new tables
> - No ongoing dual-write complexity
> - Cutover is cleaner and safer

- [ ] Create script: `scripts/populate_party_roles.py`
  - Assign PATIENT role to all existing patients
- [ ] Create script: `scripts/populate_hearing_profiles.py`
  - Extract `sgk_info` from patients to hearing_profiles
  - Link hearing_tests to hearing_profiles
- [ ] Run population scripts on dev database
- [ ] Verify data integrity with validation script
- [ ] **Freeze point:** No new patient writes during cutover window

**Gate:** New tables populated, data verified, reversible

---

## Phase 3.0: Database Cutover (Week 5 - Day 1)

> ⚠️ **DB ONLY — API still uses /patients**

### 3.0.1 Table Renames
- [ ] Create migration: `alembic revision -m "rename_patients_to_parties"`
  ```python
  def upgrade():
      op.rename_table('patients', 'parties')
  ```
- [ ] Create migration: `alembic revision -m "rename_patient_id_to_party_id"`
  ```python
  def upgrade():
      for table in ['devices', 'appointments', 'invoices', 'sales', ...]:
          op.alter_column(table, 'patient_id', new_column_name='party_id')
  ```
- [ ] Run migrations on dev database
- [ ] Verify application still works with renamed tables

### 3.0.2 Model Internal Updates
- [ ] Update `Patient` model to query from `parties` table
- [ ] Update all FK references internally
- [ ] Keep external API unchanged (`/patients` still works)

### 3.0.3 Verification
- [ ] All tests pass
- [ ] API still responds at `/api/patients`
- [ ] Hearing flows work

**Gate:** DB renamed, API unchanged, rollback possible via alembic

---

## Phase 3.1: API Cutover (Week 5 - Day 2)

> ⚠️ **SINGLE PR, SINGLE MERGE, SINGLE BREAKING CHANGE**

### 3.1.1 Backend Renames
- [ ] `routers/patients.py` → `routers/parties.py`
- [ ] `routers/patient_subresources.py` → split:
  - `routers/party_subresources.py` (devices, notes, appointments)
  - `routers/hearing_profiles.py` (hearing tests, ereceipts, SGK)
- [ ] `routers/admin_patients.py` → `routers/admin_parties.py`
- [ ] `schemas/patients.py` → `schemas/parties.py`
- [ ] All `PatientRead` → `PartyRead`
- [ ] All `PatientCreate` → `PartyCreate`
- [ ] All `operation_id="*Patient*"` → `operation_id="*Party*"`
- [ ] All `tags=["Patients"]` → `tags=["Parties"]`
- [ ] Update `main.py` router imports

### 3.1.2 Model Alias with Deprecation Warning
- [ ] `core/models/patient.py` → `core/models/party.py`
- [ ] `class Patient` → `class Party`
- [ ] Create `patient.py` alias with warning:
  ```python
  # core/models/patient.py (DEPRECATED)
  import warnings
  warnings.warn(
      "Patient is deprecated. Use Party instead.",
      DeprecationWarning,
      stacklevel=2,
  )
  from .party import Party as Patient
  ```
- [ ] Update `core/models/__init__.py`

### 3.1.3 OpenAPI Regeneration
- [ ] Start backend: `python main.py`
- [ ] Verify OpenAPI at `http://localhost:5003/openapi.json`
- [ ] Commit `openapi.json`

### 3.1.4 Orval Regeneration
- [ ] `cd apps/web && npm run gen:api`
- [ ] `cd apps/admin && npm run gen:api`
- [ ] `cd apps/landing && npm run gen:api`
- [ ] Commit ALL generated files

### 3.1.5 Frontend Updates
- [ ] Find-replace all imports:
  ```
  from '@/api/generated/patients' → '@/api/generated/parties'
  from '@/api/generated/patient-subresources' → '@/api/generated/party-subresources'
  ```
- [ ] Find-replace all hook usages:
  ```
  useListPatients → useListParties
  useGetPatient → useGetParty
  useCreatePatients → useCreateParty
  ... (25+ hooks)
  ```
- [ ] Find-replace all type usages:
  ```
  PatientRead → PartyRead
  PatientCreate → PartyCreate
  ```
- [ ] Update routes: `/patients` → `/parties`
- [ ] Update IndexedDB store name

### 3.1.6 Verification (ALL MUST PASS)
- [ ] `npm run type-check` passes
- [ ] `npm run test` passes
- [ ] `pytest tests/` passes
- [ ] All hearing flow tests pass
- [ ] **Orval diff lock:**
  ```bash
  npm run gen:api
  git diff --exit-code apps/web/src/api/generated
  # Must exit 0 (no diff)
  ```
- [ ] Manual smoke test: create/read/update/delete party

**Gate:** Single PR merged, all tests green, no Orval drift

---

## Phase 4: Cleanup (Week 6-7)

### 4.1 Remove Population Scripts
- [ ] Archive population scripts to `__legacy/graveyard/`
- [ ] Remove any temporary adapters

### 4.2 Deprecation Schedule
- [ ] `Patient` alias remains for 1 release cycle
- [ ] Document removal in CHANGELOG for next major version
- [ ] Set calendar reminder for alias removal

### 4.3 Documentation
- [ ] Update README with new API paths
- [ ] Update Postman/Insomnia collections
- [ ] Archive old migration docs to `docs/archive/`

### 4.4 Final Verification
- [ ] Production smoke test
- [ ] Monitor Sentry for errors (7 days)
- [ ] Verify no performance regression

**Gate:** Clean codebase, documented, monitored

---

## Timeline Summary

| Week | Phase | Key Deliverable | Risk |
|------|-------|-----------------|------|
| 1 | Phase 0 | Tests + Snapshots | LOW |
| 2-3 | Phase 1 | Service Layer | LOW |
| 4 | Phase 2 | Database Tables | LOW |
| 5 (Day 1) | Phase 3.0 | **DB Cutover** | MEDIUM |
| 5 (Day 2) | Phase 3.1 | **API Cutover** | HIGH |
| 6-7 | Phase 4 | Cleanup | LOW |

---

## Rollback Points

| Phase | Rollback Method | Time to Rollback |
|-------|-----------------|------------------|
| Phase 1 | Revert service layer PRs | Minutes |
| Phase 2 | `alembic downgrade` | Minutes |
| Phase 3.0 | `alembic downgrade` (DB only) | Minutes |
| Phase 3.1 | Revert PR + `alembic downgrade` | 1 hour |
| Phase 4 | N/A (cleanup only) | N/A |

---

## Go / No-Go Criteria

### ✅ Can Start Now
- Phase 0 (Preparation)
- Phase 1 (Service Layer)
- Phase 2 (Database Tables)

### ❌ Do Not Start Until Phase 0-2 Complete
- Orval regeneration
- Router renames
- `/patients` → `/parties`
- Schema renames

---

## Success Criteria

- [ ] All `/api/parties` endpoints working
- [ ] All hearing flows intact (SGK, HearingTest, EReceipt)
- [ ] No `/api/patients` endpoints remain
- [ ] Frontend type-check passes
- [ ] `npm run gen:api && git diff --exit-code` passes
- [ ] No production errors related to migration
- [ ] IndexedDB data preserved for existing users
- [ ] Patient import shows deprecation warning
