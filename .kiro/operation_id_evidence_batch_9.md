# Operation ID Evidence — Batch 9

This file contains code-backed evidence (decorator lines + function signatures) for the following routers processed in this batch:

- apps/api/routers/subscriptions.py
- apps/api/routers/uts.py
- apps/api/routers/registration.py
- apps/api/routers/audit.py
- apps/api/routers/branches.py
- apps/api/routers/config.py
- apps/api/routers/timeline.py
- apps/api/routers/upload.py
- apps/api/routers/sgk.py
- apps/api/routers/party_subresources.py

---

## subscriptions.py

```py
@router.post("/subscribe", operation_id="createSubscriptionSubscribe", response_model=ResponseEnvelope[SubscriptionResponse])
def subscribe(
    request_data: SubscribeRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.post("/complete-signup", operation_id="createSubscriptionCompleteSignup", response_model=ResponseEnvelope[SignupResponse])
def complete_signup(
    request_data: CompleteSignupRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/current", operation_id="listSubscriptionCurrent", response_model=ResponseEnvelope[CurrentSubscriptionResponse])
def get_current(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.post("/register-and-subscribe", operation_id="createSubscriptionRegisterAndSubscribe", response_model=ResponseEnvelope[SignupResponse])
def register_and_subscribe(
    request_data: RegisterAndSubscribeRequest,
    db: Session = Depends(get_db)
)
```

## uts.py

```py
@router.get("/registrations", operation_id="listUtRegistrations", response_model=ResponseEnvelope[UtsRegistrationListResponse])
async def list_registrations(
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/registrations/bulk", operation_id="createUtRegistrationBulk", response_model=ResponseEnvelope[UtsJobStartResponse])
async def start_bulk_registration(
    data: BulkRegistration,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.get("/jobs/{job_id}", operation_id="getUtJob", response_model=ResponseEnvelope[UtsJobStatusResponse])
async def get_job_status(
    job_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/jobs/{job_id}/cancel", operation_id="createUtJobCancel", response_model=ResponseEnvelope[UtsCancelResponse])
async def cancel_job(
    job_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)
```

## registration.py

```py
@router.get("/config/turnstile", operation_id="listConfigTurnstile", response_model=ResponseEnvelope[TurnstileConfigResponse])
def get_turnstile_config():

@router.post("/register-phone", operation_id="createRegisterPhone")
def register_phone(
    request_data: RegisterPhoneRequest,
    db: Session = Depends(get_db)
)

@router.post("/verify-registration-otp", operation_id="createVerifyRegistrationOtp", status_code=201, response_model=ResponseEnvelope[RegistrationVerifyResponse])
def verify_registration_otp(
    request_data: VerifyRegistrationOTPRequest,
    db: Session = Depends(get_db)
)
```

## audit.py

```py
@router.get("", operation_id="listAudit", response_model=ResponseEnvelope[List[ActivityLogRead]])
async def list_audit(
    entity_type: Optional[str] = None,
    limit: int = Query(200, ge=1, le=500),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("audit.read", admin_only=True))
)
```

## branches.py

```py
@router.get("/branches", operation_id="listBranches", response_model=ResponseEnvelope[List[BranchRead]])
def get_branches(
    tenant_id: Optional[str] = Query(None, alias="tenantId"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.post("/branches", operation_id="createBranches", status_code=201, response_model=ResponseEnvelope[BranchRead])
def create_branch(
    branch_in: BranchCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.put("/branches/{branch_id}", operation_id="updateBranch", response_model=ResponseEnvelope[BranchRead])
def update_branch(
    branch_id: str,
    branch_in: BranchUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.delete("/branches/{branch_id}", operation_id="deleteBranch")
def delete_branch(
    branch_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)
```

## config.py

```py
@router.get("/config", operation_id="listConfig")
def get_config():
```

## timeline.py

```py
@router.get("/timeline", operation_id="listTimeline", response_model=ResponseEnvelope[TimelineListResponse])
def get_timeline(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/parties/{party_id}/timeline", operation_id="listPartyTimeline", response_model=ResponseEnvelope[TimelineListResponse])
def get_party_timeline(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.post("/parties/{party_id}/timeline", operation_id="createPartyTimeline", status_code=201, response_model=ResponseEnvelope[TimelineEventRead])
def add_timeline_event(
    party_id: str,
    request_data: TimelineEventCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.post("/parties/{party_id}/activities", operation_id="createPartyActivities", status_code=201, response_model=ResponseEnvelope[TimelineEventRead])
def log_party_activity(
    party_id: str,
    request_data: TimelineEventCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.delete("/parties/{party_id}/timeline/{event_id}", operation_id="deletePartyTimeline")
def delete_timeline_event(
    party_id: str,
    event_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```

## upload.py

```py
@router.post("/presigned", operation_id="createUploadPresigned", response_model=ResponseEnvelope[PresignedUploadResponse])
def get_presigned_upload_url(
    request_data: PresignedUploadRequest,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/files", operation_id="listUploadFiles", response_model=ResponseEnvelope[FileListResponse])
def list_files(
    folder: str = Query("uploads"),
    tenant_id: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.delete("/files", operation_id="deleteUploadFiles")
def delete_file(
    key: str = Query(...),
    request: Request = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```

## sgk.py

```py
@router.get("/sgk/documents", operation_id="listSgkDocuments")
def list_sgk_documents(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/sgk/documents", operation_id="createSgkDocuments")
def upload_sgk_document(
    request_data: UploadSGKDocumentRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.get("/sgk/documents/{document_id}", operation_id="getSgkDocument")
def get_sgk_document(
    document_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.delete("/sgk/documents/{document_id}", operation_id="deleteSgkDocument")
def delete_sgk_document(
    document_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/sgk/upload", operation_id="createSgkUpload")
async def upload_and_process_files(
    files: List[UploadFile] = File(...),
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.get("/parties/{party_id}/sgk-documents", operation_id="listPartySgkDocuments")
def get_party_sgk_documents(
    party_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/sgk/e-receipt/query", operation_id="createSgkEReceiptQuery")
def query_e_receipt(
    request_data: EReceiptQueryRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.get("/sgk/e-receipts/delivered", operation_id="listSgkEReceiptDelivered")
def list_delivered_ereceipts(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/sgk/patient-rights/query", operation_id="createSgkPatientRightQuery")
def query_patient_rights(
    request_data: PatientRightsQueryRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/sgk/workflow/create", operation_id="createSgkWorkflowCreate")
def create_sgk_workflow(
    request_data: WorkflowCreateRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.put("/sgk/workflow/{workflow_id}/update", operation_id="updateSgkWorkflowUpdate")
def update_sgk_workflow(
    workflow_id: str,
    request_data: WorkflowUpdateRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.get("/sgk/workflow/{workflow_id}", operation_id="getSgkWorkflow")
def get_sgk_workflow(
    workflow_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.put("/sgk/workflows/{workflow_id}/status", operation_id="updateSgkWorkflowStatus")
def update_workflow_status(
    workflow_id: str,
    request_data: WorkflowStatusUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.get("/sgk/e-receipts/{receipt_id}/download-patient-form", operation_id="listSgkEReceiptDownloadPatientForm")
def download_patient_form(
    receipt_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/sgk/seed-test-patients", operation_id="createSgkSeedTestPatients")
def seed_test_patients(
    db_session: Session = Depends(get_db)
)
```

## party_subresources.py

```py
@router.get("/parties/{party_id}/devices", operation_id="listPartyDevices", response_model=ResponseEnvelope[List[DeviceAssignmentRead]])
def get_party_devices(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/parties/{party_id}/notes", operation_id="listPartyNotes", response_model=ResponseEnvelope[List[PartyNoteRead]])
def get_party_notes(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.post("/parties/{party_id}/notes", operation_id="createPartyNotes", status_code=201, response_model=ResponseEnvelope[PartyNoteRead])
def create_party_note(
    party_id: str,
    request_data: PatientNoteCreate,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.put("/parties/{party_id}/notes/{note_id}", operation_id="updatePartyNote", response_model=ResponseEnvelope[PartyNoteRead])
def update_party_note(
    party_id: str,
    note_id: str,
    request_data: PatientNoteUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.delete("/parties/{party_id}/notes/{note_id}", operation_id="deletePartyNote", response_model=ResponseEnvelope)
def delete_party_note(
    party_id: str,
    note_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/parties/{party_id}/sales", operation_id="listPartySales", response_model=ResponseEnvelope[List[SaleRead]])
def get_party_sales(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/parties/{party_id}/appointments", operation_id="listPartyAppointments", response_model=ResponseEnvelope[List[AppointmentRead]])
def get_party_appointments(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```
