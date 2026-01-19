Party + Role + Profile Migration Gap/Risk Audit
Final Comprehensive Version
Date: 2026-01-13
Version: 2.0 (Final)
Scope: Multi-Sector Platform Migration
Reference Implementation: X-Ear Hearing CRM (must remain intact)

0. Critical Clarifications (Read First)
IMPORTANT

This document describes TWO distinct phases:

Phase 1: Non-breaking internal adapters — NO public API changes
Phase 3: Breaking atomic cutover — ONE controlled breaking change
No partial API exposure is allowed between these phases. There will be exactly ONE breaking public contract switch.

0.1 operationId Cutover Exception
The project has an established operationId Stability Contract (see 
docs/MIGRATION_PLAN.md
 L177-190):

"operationId MUST NOT change once released"

Migration Exception Clause:

operationId Stability Rule Clarification:
- operationId values MUST remain stable within a public contract version
- operationId values ARE EXPECTED to change exactly ONCE during Phase 3 (Atomic Cutover)
- No further operationId changes are allowed after cutover
- This is the ONLY planned breaking change to the public API contract
0.2 ENUM Migration Policy
CAUTION

Postgres native ENUM types are dangerous to modify in production.

Policy:

ENUM Migration Policy:
- No Postgres native ENUM alteration (ALTER TYPE) will be performed
- All domain enums will use VARCHAR columns + application-level validation
- This applies to: PatientStatus → PartyStatus, DeviceCategory, etc.
- SQLAlchemy LowercaseEnum wrapper continues to work with VARCHAR
0.3 IndexedDB Migration Rule
Policy:

IndexedDB Migration Rule:
- IndexedDB migration MUST run on app startup, BEFORE any write operation
- If migration fails: clear store + force full resync from server
- User sees loading spinner during migration, not broken state
- Old store kept for 30 days for potential rollback
1. Scope & Non-Negotiables
1.1 Mission
Transform existing hearing-center CRM into multi-sector platform supporting:

General CRM (any business)
Pharmacy-specific flows
HBYS / Hospital flows
Hotel flows
1.2 Target Architecture
Party (canonical counterparty)
├── PartyRole[] (PATIENT, CUSTOMER, GUEST, SUPPLIER, etc.)
├── HearingProfile (domain extension for hearing centers)
├── PharmacyProfile (future)
├── HospitalProfile (future)
└── HotelProfile (future)
1.3 Non-Negotiables
Rule	Enforcement	Phase
❌ Hearing-center functionality MUST NOT break	Integration tests, smoke tests	ALL
❌ operationId values MUST NOT change	CI api-sync-check	Phase 1, 2
✅ operationId values WILL change ONCE	Atomic cutover PR	Phase 3 ONLY
❌ Orval regen MUST NOT break existing hooks	tags-split mode	Phase 1, 2
✅ Orval regen WILL create new folders/hooks	Atomic cutover PR	Phase 3 ONLY
❌ OpenAPI auto-generation MUST remain intact	CI verification	ALL
❌ No permanent technical debt	Code review policy	ALL
✅ Internal adapters ARE allowed	Service layer abstraction	Phase 1
✅ Short-lived dual-write IS allowed	Controlled cutover window only	Phase 2
2. Codebase Inventory (Evidence-Based)
2.1 Canonical Entities
Entity	Location	Evidence
Patient
 model	
apps/api/core/models/patient.py
 L7-202	class Patient(BaseModel, JSONMixin)
PatientRead
 schema	
apps/api/schemas/patients.py
 L80+	Pydantic schema for API responses
PatientCreate
 schema	
apps/api/schemas/patients.py
 L61+	Pydantic schema for API requests
PatientStatus
 enum	
apps/api/core/models/enums.py
 L125-165	ACTIVE, INACTIVE, LEAD, TRIAL, CUSTOMER, NEW
patient_id FK	13 models in 
core/models/
Device, Appointment, Invoice, Sale, etc.
patients
 DB table	SQLAlchemy __tablename__	Primary entity table
2.2 Codegen & Contract Stability Mechanisms
Mechanism	Location	Evidence	Impact on Migration
Explicit operationId	
routers/patients.py
 L53,155,259,349,371,381,418,435	operation_id="listPatients"	Hook names derived from this
Pydantic AppBaseModel	
schemas/base.py
 L9-20	alias_generator=to_camel	JSON field names stay camelCase
ResponseEnvelope[T]	
schemas/base.py
 L44-63	Generic wrapper with camelCase	Response structure unchanged
Orval tags-split	
apps/web/orval.config.mjs
 L10	mode: 'tags-split'	Tag change = folder change
Orval clean mode	
apps/web/orval.config.mjs
 L16	clean: true	Old folders deleted on regen
Orval indexFiles	
apps/web/orval.config.mjs
 L17	indexFiles: true	Auto index.ts generation
Custom mutator	
apps/web/src/api/orval-mutator.ts
Axios wrapper with auth	Unchanged during migration
API Sync CI Job	
.github/workflows/ci.yml
 L333-384	api-sync-check blocks merge	Must commit generated files
Contract Gates CI	
.github/workflows/ci-contract-gates.yml
Spectral lint + MD enforcement	OpenAPI validation
operationId Contract	
docs/MIGRATION_PLAN.md
 L177-190	"operationId MUST NOT change"	Exception for Phase 3
Auto index.ts	
generated/index.ts
 L1-5	scripts/generate-api-index.mjs	Regenerates on Orval run
2.3 OpenAPI Tag → Orval Folder Mapping
WARNING

This is critical for understanding migration impact.

Current Router Tags:

# apps/api/routers/patients.py
router = APIRouter(tags=["Patients"])
# apps/api/routers/patient_subresources.py
router = APIRouter(tags=["Patient-Subresources"])
Orval Output Folders:

apps/web/src/api/generated/
├── patients/           ← from tag "Patients"
│   └── patients.ts
├── patient-subresources/  ← from tag "Patient-Subresources"
│   └── patient-subresources.ts
└── index.ts
Migration Impact:

Tag "Patients" → "Parties"
CAUSES:
1. Old folder deleted: patients/
2. New folder created: parties/
3. ALL imports break: 
   FROM: import { useListPatients } from '@/api/generated/patients/patients'
   TO:   import { useListParties } from '@/api/generated/parties/parties'
2.4 Pydantic Schema → OpenAPI → Orval Type Chain
Pydantic Schema                    OpenAPI                         Orval TypeScript
─────────────────────────────────────────────────────────────────────────────────────
class PatientRead(AppBaseModel)  →  PatientRead (schema)         →  export interface PatientRead
class PatientCreate(...)         →  PatientCreate (schema)       →  export interface PatientCreate
ResponseEnvelope[PatientRead]    →  ResponseEnvelope_PatientRead →  export type ResponseEnvelope...
Rename Impact:

PatientRead → PartyRead
CAUSES:
1. OpenAPI schema name changes
2. Orval generates new interface name
3. ALL frontend type imports break
2.5 Hearing-Specific Couplings
Coupling	Files	Severity	Extraction Target
SGK Integration	73 files (*sgk*), 
routers/sgk.py
 (584 lines)	HIGH	HearingProfile
HearingTest Model	
core/models/medical.py
 L99-144	HIGH	HearingProfile
EReceipt Model	
core/models/medical.py
 L40-97	HIGH	HearingProfile
Patient.sgk_info	
patient.py
 L48, L70-75, L118, L195	HIGH	HearingProfile.sgk_info
DeviceCategory.HEARING_AID	
enums.py
 L65, L74, L80, L88	MEDIUM	Product-aware default
ensure_hearing_product()	
routers/devices.py
 L39-61	MEDIUM	Profile-scoped guard
Audiogram data	
patient_subresources.py
 L34, L39, L259, L302-303	HIGH	HearingProfile
PatientHearingTestsTab	
components/patients/PatientHearingTestsTab.tsx
HIGH	HearingProfileTab
PatientSGKTab	
components/patients/PatientSGKTab.tsx
HIGH	HearingProfileSGKTab
useSgk hooks	
hooks/sgk/useSgk.ts
, 
useSgkDocuments.ts
HIGH	Keep, reparent to HearingProfile
2.6 Frontend Patient Dependencies (Complete Count)
Category	Count	Key Files
Generated API schemas	83+	api/generated/schemas/patient*.ts
Generated hooks	3 modules	
patients.ts
, 
patient-subresources.ts
, 
admin-patients.ts
Custom hooks	17	hooks/patient/*.ts, 
hooks/usePatients.ts
Services	9	services/patient/*.ts
Components	65+	components/patients/*.tsx, components/patient/*.tsx
Pages	5+	
DesktopPatientsPage.tsx
, 
DesktopPatientDetailsPage.tsx
Routes	2	
routes/patients/$patientId.tsx
IndexedDB stores	1	
patients
 store in 
patientOfflineSync.ts
TOTAL AFFECTED FILES	180+	—
3. Transformation Mapping Tables
3.1 Database Transformations
Current	Target	Minimal Safe Change	Blast Radius
patients
 table	parties table	Alembic rename migration	All 13 FK models break
patient_id FK (13 models)	party_id FK	Alembic column rename	All backend queries break
patients.sgk_info	hearing_profiles.sgk_info	New table + data migration	SGK workflow breaks temporarily
PatientStatus
 → VARCHAR	PartyStatus → VARCHAR	Keep VARCHAR, change app validation	Low risk
hearing_tests.patient_id	hearing_tests.hearing_profile_id	FK target change	HearingTest queries break
Rollback Strategy: Each migration MUST have downgrade() function.

3.2 Backend Transformations
Current	Target	Blast Radius	Phase
Patient
 model	Party model	32 import sites	Phase 3
PatientRead
 schema	PartyRead schema	OpenAPI schema name change	Phase 3
routers/patients.py
routers/parties.py	Router tag changes → Orval folder	Phase 3
operation_id="listPatients"	operation_id="listParties"	Hook name change	Phase 3
PatientNote
 model	PartyNote model	Table rename	Phase 3
tags=["Patients"]	tags=["Parties"]	Orval folder rename	Phase 3
3.3 OpenAPI Transformations
Current operationId	Generated Hook	Target operationId	New Hook
listPatients
useListPatients
listParties	useListParties
createPatients
useCreatePatients
createParty	useCreateParty
getPatient
useGetPatient
getParty	useGetParty
updatePatient
useUpdatePatient
updateParty	useUpdateParty
deletePatient
useDeletePatient
deleteParty	useDeleteParty
listPatientHearingTests	useListPatientHearingTests	listHearingTests	useListHearingTests
30+ more...	...	...	...
3.4 Frontend Transformations (Blast Radius)
Current	Target	Files Affected	Blast Radius
generated/patients/ folder	generated/parties/ folder	ALL patient imports	180+ files
useListPatients
 hook	useListParties hook	15+ components	Component tree
PatientRead
 type	PartyRead type	50+ type usages	Type system
patients
 IndexedDB store	parties store	Offline sync	User offline data
/patients route	/parties route	Router config	Navigation
PatientCard.tsx
PartyCard.tsx	65+ components	Full rename
4. Risk Register
4.1 Critical Risks (Severity: CRITICAL)
ID	Risk	Likelihood	Detection	Mitigation
R1	operationId change breaks ALL frontend hooks	CERTAIN	CI api-sync-check	Atomic cutover: OpenAPI + Orval + Frontend in single PR
R2	Orval folder rename breaks ALL imports	CERTAIN	TypeScript errors	Phase 3 atomic PR with full import update
R3	Pydantic schema rename breaks ALL type imports	CERTAIN	TypeScript errors	Same atomic cutover PR
4.2 High Risks
ID	Risk	Likelihood	Detection	Mitigation
R4	Hearing-center flows break silently	MEDIUM	Integration tests	Create hearing flow E2E tests BEFORE migration
R5	IndexedDB store name change loses offline data	HIGH	Manual test	Migration script on app startup
R6	Postgres enum migration fails	MEDIUM	CI backend-tests	Use VARCHAR, not native ENUM
R7	SGK API integration breaks	MEDIUM	SGK smoke tests	Isolate SGK to HearingProfile first
4.3 Medium Risks
ID	Risk	Likelihood	Detection	Mitigation
R8	OpenAPI spec drift during migration	MEDIUM	CI api-sync-check	Single-PR atomic changes
R9	Multi-tenant defaults leak into core	MEDIUM	Code review	ProductCode checks at service layer
R10	External integrations break on path change	LOW	Manual audit	See guard note below
R11	API path changes break deep links	LOW	Manual test	Document path changes
R12	Import path changes break modules	LOW	TypeScript errors	Use re-exports
R13	Alembic migration irreversible	MEDIUM	Migration testing	Mandatory downgrade()
NOTE

External Integration Guard (R10): If any third-party integrations are added before Phase 3, they MUST be audited against the operationId mapping in Appendix 9.3. No external integration should depend on /api/patients paths or *Patient* operationIds without documented migration plan.

5. Best-Practice Guardrails
5.1 Pre-Migration Verification Checklist
#	Check	Command/Method	Must Pass
1	All CI jobs green	git push → GitHub Actions	✅ Yes
2	OpenAPI spec matches backend	api-sync-check job	✅ Yes
3	Orval generates without errors	npm run gen:api	✅ Yes
4	TypeScript check passes	npm run type-check	✅ Yes
5	Backend tests pass	pytest tests/	✅ Yes
6	Hearing flow E2E tests pass	New test suite	✅ Yes
7	operationId snapshot exists	scripts/snapshot-operationids.sh	✅ Yes
5.2 operationId Snapshot Script
#!/bin/bash
# scripts/snapshot-operationids.sh
# Run before migration to capture current state
curl -s http://localhost:5003/openapi.json | \
  jq -r '.paths | to_entries[] | .value | to_entries[] | .value.operationId' | \
  sort > .operation-ids-snapshot.txt
echo "Captured $(wc -l < .operation-ids-snapshot.txt) operationIds"
5.3 Hearing Flow Protection Tests
# apps/api/tests/test_hearing_flows.py
import pytest
@pytest.mark.hearing_flow
class TestHearingFlowsIntact:
    """These tests MUST pass before and after migration"""
    
    def test_patient_sgk_info_crud(self, client, test_patient):
        """SGK info can be read and updated"""
        # GET patient with sgkInfo
        resp = client.get(f"/api/patients/{test_patient.id}")
        assert resp.json()["data"]["sgkInfo"] is not None
        
        # UPDATE sgkInfo
        resp = client.put(f"/api/patients/{test_patient.id}", json={
            "sgkInfo": {"insuranceNumber": "TEST123"}
        })
        assert resp.status_code == 200
    
    def test_hearing_test_crud(self, client, test_patient):
        """Hearing tests can be created and listed"""
        # CREATE hearing test
        resp = client.post(f"/api/patients/{test_patient.id}/hearing-tests", json={
            "testDate": "2026-01-13T10:00:00",
            "testType": "audiometry"
        })
        assert resp.status_code == 201
        
        # LIST hearing tests
        resp = client.get(f"/api/patients/{test_patient.id}/hearing-tests")
        assert len(resp.json()["data"]) >= 1
    
    def test_ereceipt_workflow(self, client, test_patient):
        """E-receipts can be created and processed"""
        pass  # Implement
    
    def test_device_assignment_bilateral(self, client, test_patient):
        """Bilateral device assignment works"""
        pass  # Implement
    
    def test_sgk_document_upload(self, client, test_patient):
        """SGK documents can be uploaded and OCR processed"""
        pass  # Implement
5.4 IndexedDB Migration Script
// apps/web/src/utils/indexeddb-migration.ts
import { openDB } from 'idb';
const MIGRATION_VERSION = 2;
const MIGRATION_KEY = 'party-migration-v2';
export async function runIndexedDBMigration(): Promise<boolean> {
  // Check if already migrated
  if (localStorage.getItem(MIGRATION_KEY) === 'complete') {
    return true;
  }
  try {
    console.log('[Migration] Starting patients → parties migration...');
    
    // Open old database
    const oldDb = await openDB('xear-offline', 1);
    const oldStore = oldDb.transaction('patients', 'readonly').store;
    const records = await oldStore.getAll();
    
    if (records.length === 0) {
      console.log('[Migration] No records to migrate');
      localStorage.setItem(MIGRATION_KEY, 'complete');
      return true;
    }
    
    // Open new database with new schema
    const newDb = await openDB('xear-offline', MIGRATION_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('parties')) {
          db.createObjectStore('parties', { keyPath: 'id' });
        }
      }
    });
    
    // Migrate records
    const tx = newDb.transaction('parties', 'readwrite');
    for (const record of records) {
      await tx.store.put({
        ...record,
        // Map old field names to new
        partyId: record.patientId || record.id,
      });
    }
    await tx.done;
    
    console.log(`[Migration] Migrated ${records.length} records`);
    localStorage.setItem(MIGRATION_KEY, 'complete');
    return true;
    
  } catch (error) {
    console.error('[Migration] Failed:', error);
    // Fallback: Clear and resync
    await clearAndResync();
    return false;
  }
}
async function clearAndResync(): Promise<void> {
  const db = await openDB('xear-offline', MIGRATION_VERSION);
  const tx = db.transaction('parties', 'readwrite');
  await tx.store.clear();
  localStorage.setItem(MIGRATION_KEY, 'resync-required');
  // App will fetch fresh data from server on next load
}
5.5 Codegen Invariant Checks
#!/bin/bash
# scripts/verify-codegen.sh
set -e
echo "🔍 Verifying codegen infrastructure..."
# 1. Orval config exists
if [ ! -f "apps/web/orval.config.mjs" ]; then
  echo "❌ Orval config missing"
  exit 1
fi
# 2. Generated folder exists
if [ ! -d "apps/web/src/api/generated" ]; then
  echo "❌ Generated API folder missing"
  exit 1
fi
# 3. Index file exists
if [ ! -f "apps/web/src/api/generated/index.ts" ]; then
  echo "❌ Generated index.ts missing"
  exit 1
fi
# 4. Schemas folder exists
if [ ! -d "apps/web/src/api/generated/schemas" ]; then
  echo "❌ Generated schemas folder missing"
  exit 1
fi
# 5. Count generated files
HOOK_COUNT=$(find apps/web/src/api/generated -name "*.ts" | wc -l)
echo "📊 Found $HOOK_COUNT generated TypeScript files"
# 6. Verify no manual edits marker
if grep -r "MANUALLY EDITED" apps/web/src/api/generated/ 2>/dev/null; then
  echo "⚠️ Manual edits detected in generated files!"
  exit 1
fi
echo "✅ Codegen infrastructure verified"
6. Migration Execution Strategy
6.1 Phased Approach Overview
Phase	Scope	Duration	Risk	API Breaking?
Phase 0	Preparation, tests, documentation	1 week	LOW	NO
Phase 1	Internal adapters, service layer	2 weeks	LOW	NO
Phase 2	Database migration, dual-write	1 week	MEDIUM	NO
Phase 3	Atomic cutover	1 day	HIGH	YES (ONCE)
Phase 4	Cleanup, remove legacy	1 week	LOW	NO
6.2 Phase 0: Preparation Checklist
 Create test_hearing_flows.py with all hearing-specific tests
 Run operationId snapshot script
 Add operationId change detection to CI (optional)
 Create IndexedDB migration script
 Document all current operationIds
 Create HEARING_CENTER_REFERENCE.md documenting all hearing logic
 Review and approve this migration plan
6.3 Phase 1: Internal Adapters (NO API CHANGES)
# apps/api/services/party_service.py
"""
Internal service layer - abstracts Patient model
NO public API changes in this phase
"""
from core.models.patient import Patient
class PartyService:
    """Internal adapter - patients table, party semantics"""
    
    def get_party(self, party_id: str) -> Patient:
        """Get party by ID (uses Patient model internally)"""
        return Patient.query.get(party_id)
    
    def list_parties(self, filters: dict) -> list[Patient]:
        """List parties (queries patients table internally)"""
        return Patient.query.filter_by(**filters).all()
    
    def create_party(self, data: dict) -> Patient:
        """Create party (creates Patient internally)"""
        patient = Patient(**data)
        db.session.add(patient)
        db.session.commit()
        return patient
Phase 1 Rules:

✅ Create service layer abstractions
✅ Internal code can use "party" terminology
❌ NO changes to routers
❌ NO changes to operationIds
❌ NO changes to Pydantic schemas
❌ NO changes to OpenAPI output
6.4 Phase 2: Database Migration
# alembic/versions/xxx_create_parties_infrastructure.py
"""
Step 1: Create new tables (additive, safe)
"""
def upgrade():
    # Create party_roles table
    op.create_table('party_roles',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('party_id', sa.String(50), nullable=False),
        sa.Column('role_code', sa.String(20), nullable=False),
        sa.Column('assigned_at', sa.DateTime, default=datetime.utcnow),
    )
    
    # Create hearing_profiles table
    op.create_table('hearing_profiles',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('party_id', sa.String(50), nullable=False),
        sa.Column('sgk_info', sa.Text),
        sa.Column('created_at', sa.DateTime),
    )
def downgrade():
    op.drop_table('hearing_profiles')
    op.drop_table('party_roles')
Phase 2 Rules:

✅ Create new tables (additive)
✅ Populate new tables with data from patients
✅ Dual-write if needed (temporary)
❌ NO deletion of patients table yet
❌ NO API changes yet
6.5 Phase 3: Atomic Cutover (THE BREAKING CHANGE)
CAUTION

This is the ONLY breaking change. Everything in ONE PR.

Phase 3 PR MUST contain ALL of these:

□ Backend Changes:
  □ routers/patients.py → routers/parties.py
  □ routers/patient_subresources.py → split into parties.py + hearing_profiles.py
  □ schemas/patients.py → schemas/parties.py
  □ All operation_id="*Patient*" → operation_id="*Party*"
  □ All tags=["Patients"] → tags=["Parties"]
  □ main.py router imports updated
□ OpenAPI Changes:
  □ Regenerate openapi.json (automatic from FastAPI)
  □ Commit new openapi.json
□ Orval Regeneration:
  □ Run: cd apps/web && npm run gen:api
  □ Run: cd apps/admin && npm run gen:api
  □ Run: cd apps/landing && npm run gen:api
  □ Commit ALL generated files
□ Frontend Changes:
  □ Update ALL imports from generated/patients → generated/parties
  □ Update ALL hook usages: useListPatients → useListParties
  □ Update ALL type usages: PatientRead → PartyRead
  □ Update routes: /patients → /parties
  □ Update IndexedDB store name
  □ Rename components: PatientCard → PartyCard (optional, can be Phase 4)
□ Verification:
  □ npm run type-check passes
  □ npm run test passes
  □ npm run gen:api produces no diff
  □ All hearing flow tests pass
Single PR, Single Merge, Single Breaking Change.

6.6 Phase 4: Cleanup
Patient Model Deprecation Policy:

Decision:
- Patient model will remain as a thin alias to Party for ONE release cycle
- Marked as @deprecated in docstring
- Removed in the following major version
- This gives external consumers time to update imports
 Remove dual-write code
 Convert Patient model to thin alias → Party
 Add @deprecated decorator to Patient
 Remove old patients table (after 30-day verification period)
 Clean up temporary adapters
 Update documentation
 Archive migration scripts
7. Verification Checklist (Before Merge)
7.1 Pre-Cutover Gate
Check	Status	Owner
All hearing flow tests pass	☐	Dev
operationId snapshot compared	☐	Dev
IndexedDB migration tested	☐	Dev
Offline sync verified	☐	QA
SGK workflow manually tested	☐	QA
Device assignment tested	☐	QA
Type-check passes	☐	CI
All CI jobs green	☐	CI
7.2 Post-Cutover Verification
Check	Status	Owner
Production smoke test	☐	DevOps
Hearing center demo account works	☐	QA
SGK document upload works	☐	QA
Offline mode works	☐	QA
No console errors	☐	Dev
Sentry error rate stable	☐	DevOps
8. Key Metrics for Success
Metric	Target	Measurement
Hearing flow tests pass rate	100%	CI job
operationId changes	Exactly planned set	Diff check
Frontend type errors	0	npm run type-check
IndexedDB data preserved	100%	Manual verification
Backend test pass rate	100%	pytest
API sync check	No unplanned drift	CI job
Production error rate	No increase	Sentry
9. Appendix: File Inventory
9.1 Backend Files to Rename (Phase 3)
Current	Target
routers/patients.py
routers/parties.py
routers/patient_subresources.py
routers/party_subresources.py + routers/hearing_profiles.py
routers/admin_patients.py
routers/admin_parties.py
schemas/patients.py
schemas/parties.py
core/models/patient.py
core/models/party.py
9.2 Frontend Folders to Rename (Auto by Orval)
Current	Target
generated/patients/	generated/parties/
generated/patient-subresources/	generated/party-subresources/ + generated/hearing-profiles/
generated/admin-patients/	generated/admin-parties/
9.3 operationId Mapping (Complete)
Current	Target
listPatients
listParties
createPatients
createParty
getPatient
getParty
updatePatient
updateParty
deletePatient
deleteParty
listPatientExport
listPartyExport
listPatientCount
listPartyCount
createPatientBulkUpload
createPartyBulkUpload
listPatientDevices	listPartyDevices
createPatientDevices	createPartyDevices
listPatientHearingTests	listHearingTests
createPatientHearingTests	createHearingTest
updatePatientHearingTest	updateHearingTest
deletePatientHearingTest	deleteHearingTest
listPatientNotes	listPartyNotes
createPatientNotes	createPartyNote
listPatientEreceipts	listHearingEReceipts
createPatientEreceipt	createHearingEReceipt
listPatientAppointments	listPartyAppointments
getPatientTimeline	getPartyTimeline
listPatientDocuments	listPartyDocuments
listPatientSgkDocuments	listHearingSGKDocuments
listPatientPaymentRecords	listPartyPaymentRecords
listPatientPromissoryNotes	listPartyPromissoryNotes
listPatientReplacements	listPartyReplacements
This document is the authoritative source for Party + Role + Profile migration. All changes must follow the phased approach defined herein. Hearing-center functionality is the reference implementation and MUST remain intact.
