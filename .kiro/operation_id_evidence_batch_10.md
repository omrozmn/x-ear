# Operation ID Evidence — Batch 10

This file contains code-backed evidence (decorator lines + function signatures) for the following routers processed in this batch:

- apps/api/routers/activity_logs.py
- apps/api/routers/addons.py
- apps/api/routers/affiliates.py
- apps/api/routers/appointments.py
- apps/api/routers/apps.py
- apps/api/routers/cash_records.py
- apps/api/routers/checkout.py
- apps/api/routers/commissions.py
- apps/api/routers/communications.py
- apps/api/routers/campaigns.py

---

## activity_logs.py

```py
@router.get("/activity-logs", operation_id="listActivityLogs", response_model=ResponseEnvelope[List[ActivityLogRead]])
def get_activity_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100, alias="limit"),
    tenant_id: Optional[str] = None,
    user_id: Optional[str] = None,
    action: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/activity-logs/stats", operation_id="listActivityLogStats", response_model=ResponseEnvelope[ActivityLogStats])
def get_activity_stats(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/activity-logs/filter-options", operation_id="listActivityLogFilterOptions")
def get_activity_log_filter_options(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/audit", operation_id="listAudit", response_model=ResponseEnvelope[List[ActivityLogRead]])
def get_audit_logs_alias(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100, alias="perPage"),
    entity_type: Optional[str] = Query(None, alias="entityType"),
    entity_id: Optional[str] = Query(None, alias="entityId"),
    action: Optional[str] = None,
    user_id: Optional[str] = Query(None, alias="userId"),
    start_date: Optional[str] = Query(None, alias="startDate"),
    end_date: Optional[str] = Query(None, alias="endDate"),
    access: UnifiedAccess = Depends(require_access("activity_logs.view")),
    db_session: Session = Depends(get_db)
)
```

## addons.py

```py
@router.get("", operation_id="listAddons", response_model=ResponseEnvelope[List[AddonRead]])
def get_addons(db: Session = Depends(get_db))

@router.get("/admin", operation_id="listAddonAdmin", response_model=ResponseEnvelope[List[AddonRead]])
def get_admin_addons(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.post("", operation_id="createAddon", status_code=201, response_model=ResponseEnvelope[AddonRead])
def create_addon(
    request_data: AddonCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.put("/{addon_id}", operation_id="updateAddon", response_model=ResponseEnvelope[AddonRead])
def update_addon(
    addon_id: str,
    request_data: AddonUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.delete("/{addon_id}", operation_id="deleteAddon")
def delete_addon(
    addon_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```

## affiliates.py

```py
@router.get("/check/{code}", operation_id="getAffiliateCheck")
async def check_affiliate(code: str, db: Session = Depends(get_db))

@router.post("/register", operation_id="createAffiliateRegister", response_model=ResponseEnvelope[AffiliateRead])
async def register_affiliate(data: AffiliateCreate, db: Session = Depends(get_db))

@router.post("/login", operation_id="createAffiliateLogin")
async def login_affiliate(email: str, password: str, db: Session = Depends(get_db))

@router.get("/me", operation_id="listAffiliateMe", response_model=ResponseEnvelope[AffiliateRead])
async def get_me(affiliate_id: int, db: Session = Depends(get_db))

@router.patch("/{affiliate_id}", operation_id="updateAffiliate", response_model=ResponseEnvelope[AffiliateRead])
async def update_affiliate_payment(affiliate_id: int, data: AffiliateUpdate, db: Session = Depends(get_db))

@router.get("/{affiliate_id}/commissions", operation_id="listAffiliateCommissions", response_model=ResponseEnvelope[List[CommissionRead]])
async def get_affiliate_commissions(affiliate_id: int, db: Session = Depends(get_db))

@router.get("/{affiliate_id}/details", operation_id="listAffiliateDetails", response_model=ResponseEnvelope[AffiliateRead])
async def get_affiliate_details(affiliate_id: int, db: Session = Depends(get_db))

@router.patch("/{affiliate_id}/toggle-status", operation_id="updateAffiliateToggleStatus", response_model=ResponseEnvelope[AffiliateRead])
async def toggle_affiliate_status(affiliate_id: int, db: Session = Depends(get_db))

@router.get("/list", operation_id="listAffiliateList", response_model=ResponseEnvelope[List[AffiliateRead]])
async def list_affiliates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db))

@router.get("/lookup", operation_id="listAffiliateLookup")
async def lookup_affiliate(
    code: Optional[str] = None,
    email: Optional[str] = None,
    db: Session = Depends(get_db)
)
```

## appointments.py

```py
@router.get("/appointments", operation_id="listAppointments", response_model=ResponseEnvelope[List[AppointmentRead]])
def get_appointments(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    party_id: Optional[str] = Query(None, alias="party_id"),
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=1000),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.post("/appointments", operation_id="createAppointments", status_code=201, response_model=ResponseEnvelope[AppointmentRead])
def create_appointment(
    appointment_in: AppointmentCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.get("/appointments/availability", operation_id="listAppointmentAvailability", response_model=ResponseEnvelope[AppointmentAvailability])
def get_availability(
    date: str,
    duration: int = Query(30, ge=15, le=120),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.get("/appointments/list", operation_id="listAppointmentList", response_model=ResponseEnvelope[List[AppointmentRead]])
def list_appointments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    party_id: Optional[str] = Query(None, alias="party_id"),
    status: Optional[str] = None,
    start_date: Optional[str] = Query(None, alias="start_date"),
    end_date: Optional[str] = Query(None, alias="end_date"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.get("/appointments/{appointment_id}", operation_id="getAppointment", response_model=ResponseEnvelope[AppointmentRead])
def get_appointment(
    appointment_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.put("/appointments/{appointment_id}", operation_id="updateAppointment", response_model=ResponseEnvelope[AppointmentRead])
def update_appointment(
    appointment_id: str,
    appointment_in: AppointmentUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.delete("/appointments/{appointment_id}", operation_id="deleteAppointment")
def delete_appointment(
    appointment_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.post("/appointments/{appointment_id}/reschedule", operation_id="createAppointmentReschedule", response_model=ResponseEnvelope[AppointmentRead])
def reschedule_appointment(
    appointment_id: str,
    reschedule_data: RescheduleRequest,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.post("/appointments/{appointment_id}/cancel", operation_id="createAppointmentCancel", response_model=ResponseEnvelope[AppointmentRead])
def cancel_appointment(
    appointment_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)

@router.post("/appointments/{appointment_id}/complete", operation_id="createAppointmentComplete", response_model=ResponseEnvelope[AppointmentRead])
def complete_appointment(
    appointment_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
)
```

## apps.py

```py
@router.get("", operation_id="listApps")
async def list_apps(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.read"))
)

@router.post("", operation_id="createApp")
async def create_app(
    data: AppCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.write", admin_only=True))
)

@router.get("/{app_id}", operation_id="getApp")
async def get_app(
    app_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.put("/{app_id}", operation_id="updateApp")
async def update_app(
    app_id: str,
    data: AppUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.delete("/{app_id}", operation_id="deleteApp")
async def delete_app(
    app_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.write", admin_only=True))
)

@router.post("/{app_id}/assign", operation_id="createAppAssign")
async def assign_user_to_app(
    app_id: str,
    data: RoleAssign,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.write", admin_only=True))
)

@router.post("/{app_id}/transfer_ownership", operation_id="createAppTransferOwnership")
async def transfer_app_ownership(
    app_id: str,
    data: OwnerTransfer,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("apps.write", admin_only=True))
)
```

## cash_records.py

```py
@router.get("/cash-records", operation_id="listCashRecords")
def get_cash_records(
    limit: int = Query(200, ge=1, le=1000),
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.post("/cash-records", operation_id="createCashRecords", status_code=201)
def create_cash_record(
    request_data: CashRecordCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.delete("/cash-records/{record_id}", operation_id="deleteCashRecord")
def delete_cash_record(
    record_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```

## checkout.py

```py
@router.post("/session", operation_id="createCheckoutSession", response_model=ResponseEnvelope[CheckoutSessionResponse])
async def create_checkout_session(data: CheckoutSessionCreate, db: Session = Depends(get_db))

@router.post("/confirm", operation_id="createCheckoutConfirm", response_model=ResponseEnvelope[PaymentConfirmResponse])
async def confirm_payment(data: PaymentConfirmRequest, db: Session = Depends(get_db))
```

## commissions.py

```py
@router.post("/create", operation_id="createCommissionCreate")
def create_commission(
    data: CommissionCreate,
    access: UnifiedAccess = Depends(require_access(admin_only=True)),
    db: Session = Depends(get_db)
)

@router.post("/update-status", operation_id="createCommissionUpdateStatus")
def update_commission_status(
    commission_id: int = Query(..., description="ID of commission to update"),
    status: str = Query(..., description="New status"),
    access: UnifiedAccess = Depends(require_access(admin_only=True)),
    db: Session = Depends(get_db)
)

@router.get("/by-affiliate", operation_id="listCommissionByAffiliate")
def get_commissions_by_affiliate(
    affiliate_id: int,
    access: UnifiedAccess = Depends(require_access(admin_only=True)),
    db: Session = Depends(get_db)
)

@router.get("/audit", operation_id="listCommissionAudit")
def audit_trail(
    commission_id: int,
    access: UnifiedAccess = Depends(require_access(admin_only=True)),
    db: Session = Depends(get_db)
)
```

## communications.py

```py
@router.get("/messages", operation_id="listCommunicationMessages")
async def list_messages(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    status: Optional[str] = None,
    party_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/messages/send-sms", operation_id="createCommunicationMessageSendSms")
async def send_sms(
    data: SendSMS,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/messages/send-email", operation_id="createCommunicationMessageSendEmail")
async def send_email(
    data: SendEmail,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.get("/templates", operation_id="listCommunicationTemplates")
async def list_templates(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/templates", operation_id="createCommunicationTemplates")
async def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.get("/history", operation_id="listCommunicationHistory")
async def list_communication_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    party_id: Optional[str] = None,
    type: Optional[str] = None,
    direction: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.post("/history", operation_id="createCommunicationHistory")
async def create_communication_history(
    data: HistoryCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)

@router.get("/stats", operation_id="listCommunicationStats")
async def communication_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
)
```

## campaigns.py

```py
@router.get("/campaigns", operation_id="listCampaigns", response_model=ResponseEnvelope[List[CampaignRead]])
def get_campaigns(
    page: int = 1,
    per_page: int = 20,
    status_filter: Optional[str] = Query(None, alias="status"),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.post("/campaigns", operation_id="createCampaigns", response_model=ResponseEnvelope[CampaignRead], status_code=201)
def create_campaign(
    campaign_in: CampaignCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/campaigns/{campaign_id}", operation_id="getCampaign", response_model=ResponseEnvelope[CampaignRead])
def get_campaign(
    campaign_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.put("/campaigns/{campaign_id}", operation_id="updateCampaign", response_model=ResponseEnvelope[CampaignRead])
def update_campaign(
    campaign_id: str,
    campaign_in: CampaignUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.delete("/campaigns/{campaign_id}", operation_id="deleteCampaign")
def delete_campaign(
    campaign_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.post("/campaigns/{campaign_id}/send", operation_id="createCampaignSend")
def send_campaign(
    campaign_id: str,
    payload: CampaignSendRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)

@router.get("/admin/campaigns", operation_id="listAdminCampaigns", response_model=ResponseEnvelope[List[CampaignRead]])
def admin_get_campaigns(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    status: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
)
```
