# Operation ID Evidence — Batch 11

Routers covered: inventory.py, communications.py, pos_commission.py, admin_integrations.py, auth.py, admin_birfatura.py, registration.py, timeline.py, payments.py, admin_dashboard.py

---

## x-ear/apps/api/routers/inventory.py
```py
@router.get("/inventory", operation_id="listInventory", response_model=ResponseEnvelope[List[InventoryItemRead]])
def get_all_inventory(
    page: int = 1,
    per_page: int = 20,
```

```py
@router.get("/inventory/search", operation_id="listInventorySearch", response_model=ResponseEnvelope[InventorySearchResponse])
def advanced_search(
    q: Optional[str] = None,
    category: Optional[str] = None,
```

```py
@router.get("/inventory/stats", operation_id="listInventoryStats", response_model=ResponseEnvelope[InventoryStats])
def get_inventory_stats(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
```

```py
@router.get("/inventory/low-stock", operation_id="listInventoryLowStock", response_model=ResponseEnvelope[List[InventoryItemRead]])
def get_low_stock(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
```

```py
@router.get("/inventory/units", operation_id="listInventoryUnits", response_model=ResponseEnvelope[Dict[str, List[str]]])
def get_units(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
```

```py
@router.get("/inventory/{item_id}/activity", operation_id="listInventoryActivity", response_model=ResponseEnvelope[List[Dict[str, Any]]])
def get_inventory_activities(
    item_id: str,
    access: UnifiedAccess = Depends(require_access()),
```

```py
@router.post("/inventory", operation_id="createInventory", response_model=ResponseEnvelope[InventoryItemRead], status_code=201)
def create_inventory(
    item_in: InventoryItemCreate,
    access: UnifiedAccess = Depends(require_access()),
```

```py
@router.get("/inventory/{item_id}", operation_id="getInventory", response_model=ResponseEnvelope[InventoryItemRead])
def get_inventory_item(
    item_id: str,
    access: UnifiedAccess = Depends(require_access()),
```

```py
@router.put("/inventory/{item_id}", operation_id="updateInventory", response_model=ResponseEnvelope[InventoryItemRead])
def update_inventory(
    item_id: str,
    item_in: InventoryItemUpdate,
```

```py
@router.delete("/inventory/{item_id}", operation_id="deleteInventory")
def delete_inventory(
    item_id: str,
    access: UnifiedAccess = Depends(require_access()),
```

```py
@router.post("/inventory/{item_id}/serials", operation_id="createInventorySerials")
def add_serials(
    item_id: str,
    payload: Dict[str, List[str]], # manual schema
```

```py
@router.get("/inventory/{item_id}/movements", operation_id="listInventoryMovements", response_model=ResponseEnvelope[List[StockMovementRead]])
def get_movements(
    item_id: str,
    startTime: Optional[str] = None,
```
```

## x-ear/apps/api/routers/communications.py
```py
@router.get("/messages", operation_id="listCommunicationMessages")
async def list_messages(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
```

```py
@router.post("/messages/send-sms", operation_id="createCommunicationMessageSendSms")
async def send_sms(
    data: SendSMS,
    db: Session = Depends(get_db),
```

```py
@router.post("/messages/send-email", operation_id="createCommunicationMessageSendEmail")
async def send_email(
    data: SendEmail,
    db: Session = Depends(get_db),
```

```py
@router.get("/templates", operation_id="listCommunicationTemplates")
async def list_templates(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
```

```py
@router.post("/templates", operation_id="createCommunicationTemplates")
async def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
```

```py
@router.get("/templates/{template_id}", operation_id="getCommunicationTemplate")
async def get_template(template_id: str, db: Session = Depends(get_db), access: UnifiedAccess = Depends(require_access())):
```

```py
@router.put("/templates/{template_id}", operation_id="updateCommunicationTemplate")
async def update_template(
    template_id: str,
    data: TemplateCreate,
```

```py
@router.delete("/templates/{template_id}", operation_id="deleteCommunicationTemplate")
async def delete_template(template_id: str, db: Session = Depends(get_db), access: UnifiedAccess = Depends(require_access())):
```

```py
@router.get("/history", operation_id="listCommunicationHistory")
async def list_communication_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
```

```py
@router.post("/history", operation_id="createCommunicationHistory")
async def create_communication_history(
    data: HistoryCreate,
    db: Session = Depends(get_db),
```

```py
@router.get("/stats", operation_id="listCommunicationStats")
async def communication_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
```
```

## x-ear/apps/api/routers/pos_commission.py
```py
@router.post("/calculate", operation_id="createPoCommissionCalculate")
async def calculate_commission_endpoint(
    data: CommissionCalculate,
    db: Session = Depends(get_db),
```

```py
@router.get("/rates", operation_id="listPoCommissionRates")
async def get_commission_rates(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
```

```py
@router.post("/installment-options", operation_id="createPoCommissionInstallmentOptions")
async def get_installment_options(
    data: CommissionCalculate,
    db: Session = Depends(get_db),
```

```py
@router.get("/rates/tenant/{tenant_id}", operation_id="getPoCommissionRateTenant")
async def get_tenant_rates_admin(
    tenant_id: str,
    db: Session = Depends(get_db),
```

```py
@router.put("/rates/tenant/{tenant_id}", operation_id="updatePoCommissionRateTenant")
async def update_tenant_rates_admin(
    tenant_id: str,
    data: TenantRatesUpdate,
```

```py
@router.get("/rates/system", operation_id="listPoCommissionRateSystem")
async def get_system_rates_endpoint(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
```

```py
@router.put("/rates/system", operation_id="updatePoCommissionRateSystem")
async def update_system_rates(
    data: TenantRatesUpdate,
    db: Session = Depends(get_db),
```
```

## x-ear/apps/api/routers/admin_integrations.py
```py
@router.get("", operation_id="listAdminIntegrations", response_model=IntegrationListResponse)
async def get_integrations(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
```

```py
@router.post("/init-db", operation_id="createAdminIntegrationInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
```

```py
@router.get("/vatan-sms/config", operation_id="listAdminIntegrationVatanSmConfig", response_model=IntegrationDetailResponse)
async def get_vatan_sms_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.read", admin_only=True))
```

```py
@router.put("/vatan-sms/config", operation_id="updateAdminIntegrationVatanSmConfig", response_model=IntegrationDetailResponse)
async def update_vatan_sms_config(
    data: VatanSmsConfigUpdate,
    db: Session = Depends(get_db),
```

```py
@router.get("/birfatura/config", operation_id="listAdminIntegrationBirfaturaConfig", response_model=IntegrationDetailResponse)
async def get_birfatura_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.read", admin_only=True))
```

```py
@router.put("/birfatura/config", operation_id="updateAdminIntegrationBirfaturaConfig", response_model=ResponseEnvelope)
async def update_birfatura_config(
    data: BirfaturaConfigUpdate,
    db: Session = Depends(get_db),
```
```

## x-ear/apps/api/routers/auth.py
```py
@router.post("/auth/lookup-phone", operation_id="createAuthLookupPhone", response_model=ResponseEnvelope[LookupPhoneResponse])
def lookup_phone(
    request_data: LookupPhoneRequest,
    db_session: Session = Depends(get_db)
```

```py
@router.post("/auth/forgot-password", operation_id="createAuthForgotPassword", response_model=ResponseEnvelope[MessageResponse])
def forgot_password(
    request_data: ForgotPasswordRequest,
    db_session: Session = Depends(get_db)
```

```py
@router.post("/auth/verify-otp", operation_id="createAuthVerifyOtp", response_model=ResponseEnvelope[VerifyOtpResponse])
def verify_otp(
    request_data: VerifyOtpRequest,
    authorization: Optional[str] = Header(None),
```

```py
@router.post("/auth/reset-password", operation_id="createAuthResetPassword", response_model=ResponseEnvelope[ResetPasswordResponse])
def reset_password(
    request_data: ResetPasswordRequest,
    db_session: Session = Depends(get_db)
```

```py
@router.post("/auth/login", operation_id="createAuthLogin", response_model=ResponseEnvelope[LoginResponse])
def login(
    request_data: LoginRequest,
    db_session: Session = Depends(get_db)
```

```py
@router.post("/auth/refresh", operation_id="createAuthRefresh", response_model=ResponseEnvelope[RefreshTokenResponse])
def refresh_token(
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
```

```py
@router.get("/auth/me", operation_id="getAuthMe", response_model=ResponseEnvelope[Union[AuthUserRead, AdminUserRead]])
def get_current_user(
    authorization: str = Depends(oauth2_scheme),
    db_session: Session = Depends(get_db)
```

```py
@router.post("/auth/send-verification-otp", operation_id="createAuthSendVerificationOtp", response_model=ResponseEnvelope[MessageResponse])
def send_verification_otp(
    request_data: SendVerificationOtpRequest,
    authorization: str = Depends(oauth2_scheme),
```

```py
@router.post("/auth/set-password", operation_id="createAuthSetPassword", response_model=ResponseEnvelope[MessageResponse])
def set_password(
    request_data: SetPasswordRequest,
    authorization: str = Depends(oauth2_scheme),
```
```

## x-ear/apps/api/routers/admin_birfatura.py
```py
@router.get("/stats", operation_id="listAdminBirfaturaStats", response_model=ResponseEnvelope[BirFaturaStats])
async def get_stats(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
```

```py
@router.get("/invoices", operation_id="listAdminBirfaturaInvoices", response_model=ResponseEnvelope[BirFaturaInvoicesResponse])
async def get_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
```

```py
@router.get("/logs", operation_id="listAdminBirfaturaLogs", response_model=ResponseEnvelope[BirFaturaLogsResponse])
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
```
```

## x-ear/apps/api/routers/registration.py
```py
@router.get("/config/turnstile", operation_id="listConfigTurnstile", response_model=ResponseEnvelope[TurnstileConfigResponse])
def get_turnstile_config():
```

```py
@router.post("/register-phone", operation_id="createRegisterPhone")
def register_phone(
    request_data: RegisterPhoneRequest,
    db: Session = Depends(get_db)
```

```py
@router.post("/verify-registration-otp", operation_id="createVerifyRegistrationOtp", status_code=201, response_model=ResponseEnvelope[RegistrationVerifyResponse])
def verify_registration_otp(
    request_data: VerifyRegistrationOTPRequest,
    db: Session = Depends(get_db)
```
```

## x-ear/apps/api/routers/timeline.py
```py
@router.get("/timeline", operation_id="listTimeline", response_model=ResponseEnvelope[TimelineListResponse])
def get_timeline(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
```

```py
@router.get("/parties/{party_id}/timeline", operation_id="listPartyTimeline", response_model=ResponseEnvelope[TimelineListResponse])
def get_party_timeline(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
```

```py
@router.post("/parties/{party_id}/timeline", operation_id="createPartyTimeline", status_code=201, response_model=ResponseEnvelope[TimelineEventRead])
def add_timeline_event(
    party_id: str,
    request_data: TimelineEventCreate,
```

```py
@router.post("/parties/{party_id}/activities", operation_id="createPartyActivities", status_code=201, response_model=ResponseEnvelope[TimelineEventRead])
def log_party_activity(
    party_id: str,
    request_data: TimelineEventCreate,
```

```py
@router.delete("/parties/{party_id}/timeline/{event_id}", operation_id="deletePartyTimeline")
def delete_timeline_event(
    party_id: str,
    event_id: str,
```
```

## x-ear/apps/api/routers/payments.py
```py
@router.post("/payment-records", operation_id="createPaymentRecords", status_code=201, response_model=ResponseEnvelope[PaymentRecordRead])
def create_payment_record(
    payment_in: PaymentRecordCreate,
    access: UnifiedAccess = Depends(require_access()),
```

```py
@router.get("/parties/{party_id}/payment-records", operation_id="listPartyPaymentRecords", response_model=ResponseEnvelope[List[PaymentRecordRead]])
def get_party_payment_records(
    party_id: str,
    page: int = Query(1, ge=1),
```

```py
@router.patch("/payment-records/{record_id}", operation_id="updatePaymentRecord", response_model=ResponseEnvelope[PaymentRecordRead])
def update_payment_record(
    record_id: str,
    payment_in: PaymentRecordUpdate,
```

```py
@router.get("/parties/{party_id}/promissory-notes", operation_id="listPartyPromissoryNotes", response_model=ResponseEnvelope[List[PromissoryNoteRead]])
def get_party_promissory_notes(
    party_id: str,
    sale_id: Optional[str] = Query(None, alias="sale_id"),
```

```py
@router.post("/promissory-notes", operation_id="createPromissoryNotes", status_code=201, response_model=ResponseEnvelope[List[PromissoryNoteRead]])
def create_promissory_notes(
    notes_in: PromissoryNotesCreate,
    access: UnifiedAccess = Depends(require_access()),
```

```py
@router.patch("/promissory-notes/{note_id}", operation_id="updatePromissoryNote", response_model=ResponseEnvelope[PromissoryNoteRead])
def update_promissory_note(
    note_id: str,
    note_in: PromissoryNoteUpdate,
```

```py
@router.post("/promissory-notes/{note_id}/collect", operation_id="createPromissoryNoteCollect", status_code=201, response_model=ResponseEnvelope[PromissoryNoteCollectionResponse])
def collect_promissory_note(
    note_id: str,
    collect_in: CollectPaymentRequest,
```

```py
@router.get("/sales/{sale_id}/promissory-notes", operation_id="listSalePromissoryNotes", response_model=ResponseEnvelope[List[PromissoryNoteRead]])
def get_sale_promissory_notes(
    sale_id: str,
    access: UnifiedAccess = Depends(require_access()),
```
```

## x-ear/apps/api/routers/admin_dashboard.py
```py
@router.get("", operation_id="getAdminDashboard", response_model=ResponseEnvelope[AdminDashboardMetrics])
def get_dashboard_metrics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
```

```py
@router.get("/stats", operation_id="listAdminDashboardStats", response_model=ResponseEnvelope[AdminDashboardStats])
def get_dashboard_stats(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
```
```
