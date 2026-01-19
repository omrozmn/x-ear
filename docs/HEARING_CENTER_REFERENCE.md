# Hearing Center Reference Implementation

This document details all hearing-specific logic, endpoints, and data structures that must remain intact during the Party + Role + Profile migration.

---

## 1. Hearing-Specific Data Structures

### 1.1 Patient.sgk_info (JSON)

**Location:** `core/models/patient.py` L48, L70-75

```python
sgk_info = db.Column(db.Text)  # JSON string

# Structure:
{
    "insuranceNumber": "SGK123456",
    "approvalNumber": "APP2024001",
    "coveragePercentage": 90,
    "validUntil": "2025-12-31",
    "lastQueryDate": "2024-01-15"
}
```

**Migration Target:** `HearingProfile.sgk_info`

---

### 1.2 HearingTest Model

**Location:** `core/models/medical.py` L99-144

```python
class HearingTest(BaseModel):
    patient_id = db.Column(db.String(50), ForeignKey('patients.id'))
    test_date = db.Column(db.DateTime)
    test_type = db.Column(db.String(50))  # 'audiometry', etc.
    conducted_by = db.Column(db.String(100))
    results = db.Column(db.Text)  # JSON: {leftEar: {}, rightEar: {}}
```

**Migration Target:** `HearingProfile.hearing_tests` relationship

---

### 1.3 EReceipt Model

**Location:** `core/models/medical.py` L40-97

```python
class EReceipt(BaseModel):
    patient_id = db.Column(db.String(50), ForeignKey('patients.id'))
    receipt_number = db.Column(db.String(50))
    doctor_name = db.Column(db.String(100))
    hospital_name = db.Column(db.String(200))
    materials = db.Column(db.Text)  # JSON: [{type, productCode, serial}]
```

**Migration Target:** `HearingProfile.ereceipts` relationship

---

## 2. Hearing-Specific API Endpoints

### 2.1 Patient Subresources (Hearing)

| Endpoint | operationId | Description |
|----------|-------------|-------------|
| `GET /api/patients/{id}/hearing-tests` | `listPatientHearingTests` | List hearing tests |
| `POST /api/patients/{id}/hearing-tests` | `createPatientHearingTests` | Create hearing test |
| `PUT /api/patients/{id}/hearing-tests/{test_id}` | `updatePatientHearingTest` | Update test |
| `DELETE /api/patients/{id}/hearing-tests/{test_id}` | `deletePatientHearingTest` | Delete test |
| `GET /api/patients/{id}/ereceipts` | `listPatientEreceipts` | List e-receipts |
| `POST /api/patients/{id}/ereceipts` | `createPatientEreceipt` | Create e-receipt |
| `GET /api/patients/{id}/sgk-documents` | `listPatientSgkDocuments` | List SGK docs |

**File:** `routers/patient_subresources.py`

---

### 2.2 SGK Integration Endpoints

| Endpoint | operationId | Description |
|----------|-------------|-------------|
| `GET /api/sgk/documents` | `listSgkDocuments` | List SGK documents |
| `POST /api/sgk/documents` | `createSgkDocument` | Upload SGK document |
| `POST /api/sgk/upload` | `createSgkUpload` | Upload with OCR |
| `POST /api/sgk/patient-rights` | `createSgkPatientRights` | Query patient rights |
| `POST /api/sgk/workflows` | `createSgkWorkflow` | Create workflow |
| `GET /api/sgk/workflows/{id}` | `getSgkWorkflow` | Get workflow status |

**File:** `routers/sgk.py` (584 lines)

---

## 3. Hearing-Specific Enums & Constants

### 3.1 DeviceCategory

**Location:** `core/models/enums.py` L65

```python
class DeviceCategory(Enum):
    HEARING_AID = 'HEARING_AID'
    # ... future categories
```

### 3.2 Hearing Device Types

**Location:** `routers/devices.py` L199

```python
hearing_device_types = ['BTE', 'ITE', 'RIC', 'CIC', 'RIC-BTE', 'HEARING_AID', 'hearing_aid']
```

### 3.3 Product Code

**Location:** `core/models/enums.py` L179

```python
class ProductCode(Enum):
    XEAR_HEARING = "xear_hearing"
    # ... future products
```

---

## 4. Hearing-Specific Frontend Components

### 4.1 Components

| Component | Path |
|-----------|------|
| `PatientHearingTestsTab` | `components/patients/PatientHearingTestsTab.tsx` |
| `PatientSGKTab` | `components/patients/PatientSGKTab.tsx` |
| `SgkMultiUpload` | `packages/ui-web/src/components/ui/SgkMultiUpload.tsx` |

### 4.2 Hooks

| Hook | Path |
|------|------|
| `useSgk` | `hooks/sgk/useSgk.ts` |
| `useSgkDocuments` | `hooks/sgk/useSgkDocuments.ts` |
| `usePatientHearingTests` | `hooks/patient/usePatientHearingTests.ts` |

### 4.3 Services

| Service | Path |
|---------|------|
| `sgk.service.ts` | `services/sgk/sgk.service.ts` |
| `sgkService.ts` | `services/sgkService.ts` |

---

## 5. Critical Hearing Workflows

### 5.1 Device Assignment with SGK Coverage

```
1. Select patient
2. Query SGK rights (POST /api/sgk/patient-rights)
3. Get coverage percentage
4. Assign device (POST /api/sales)
5. Calculate SGK vs Patient payment split
6. Create sale with sgk_coverage field
```

### 5.2 Hearing Test Recording

```
1. Create hearing test (POST /patients/{id}/hearing-tests)
2. Record audiogram data in results JSON
3. Store left/right ear measurements
4. Link to appointment if applicable
```

### 5.3 E-Receipt Submission

```
1. Upload documents (POST /api/sgk/upload)
2. OCR processing extracts data
3. Create e-receipt (POST /patients/{id}/ereceipts)
4. Link materials (hearing aids) to receipt
```

---

## 6. Test Coverage Requirements

All workflows above MUST have integration tests in `tests/test_hearing_flows.py`:

- [ ] `test_patient_sgk_info_crud`
- [ ] `test_hearing_test_crud`
- [ ] `test_ereceipt_workflow`
- [ ] `test_device_assignment_bilateral`
- [ ] `test_sgk_document_upload`
- [ ] `test_sgk_patient_rights_query`

---

## 7. Migration Mapping

| Current (Patient-centric) | Target (Party + HearingProfile) |
|---------------------------|--------------------------------|
| `Patient.sgk_info` | `HearingProfile.sgk_info` |
| `Patient.hearing_tests[]` | `HearingProfile.hearing_tests[]` |
| `Patient.ereceipts[]` | `HearingProfile.ereceipts[]` |
| `/patients/{id}/hearing-tests` | `/parties/{id}/profiles/hearing/tests` |
| `/patients/{id}/ereceipts` | `/parties/{id}/profiles/hearing/ereceipts` |
| `/patients/{id}/sgk-documents` | `/parties/{id}/profiles/hearing/sgk-documents` |
| `DeviceCategory.HEARING_AID` | Keep (product-specific) |
| `ProductCode.XEAR_HEARING` | Keep (multi-product aware) |

---

*This document serves as the "source of truth" for hearing-specific functionality during migration.*
