# OperationId Evidence — Admin Routers (batch 2)

Source folder: [x-ear/apps/api/routers](x-ear/apps/api/routers)

This file contains exact decorator lines and function signatures extracted from the next set of `admin_*` router modules.

-- `admin_analytics.py` --
```
router = APIRouter(prefix="/admin/analytics", tags=["Admin Analytics"])

@router.get("", operation_id="getAdminAnalytics", response_model=ResponseEnvelope[AdminAnalyticsData])
@router.get("/overview", operation_id="listAdminAnalyticOverview", response_model=ResponseEnvelope[AdminAnalyticsData])
def get_admin_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/revenue", operation_id="listAdminAnalyticRevenue", response_model=ResponseEnvelope[RevenueAnalytics])
def get_revenue_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/users", operation_id="listAdminAnalyticUsers", response_model=ResponseEnvelope[UserAnalytics])
def get_user_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/tenants", operation_id="listAdminAnalyticTenants", response_model=ResponseEnvelope[TenantAnalytics])
def get_tenant_analytics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

-- `admin_settings.py` --
```
router = APIRouter(prefix="/admin/settings", tags=["AdminSettings"])

@router.post("/init-db", operation_id="createAdminSettingInitDb", response_model=ResponseEnvelope)
def init_db(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.get("", operation_id="listAdminSettings", response_model=ResponseEnvelope[List[SystemSettingRead]])
def get_settings(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.post("", operation_id="updateAdminSettings", response_model=ResponseEnvelope)
def update_settings(
    request_data: List[SettingItem],
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.post("/cache/clear", operation_id="createAdminSettingCacheClear", response_model=ResponseEnvelope)
def clear_cache(
    access: UnifiedAccess = Depends(require_access())
):
```

```
@router.post("/backup", operation_id="createAdminSettingBackup", response_model=ResponseEnvelope)
def trigger_backup(
    access: UnifiedAccess = Depends(require_access())
):
```

-- `admin_tenants.py` --
```
router = APIRouter(prefix="/admin/tenants", tags=["Admin Tenants"])

@router.get("", operation_id="listAdminTenants")
def list_tenants(
    page: int = 1,
    limit: int = 20,
    status: str = "",
    search: str = "",
    product_code: Optional[ProductCode] = None,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("", operation_id="createAdminTenant", response_model=ResponseEnvelope[TenantRead])
def create_tenant(
    request_data: TenantCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/{tenant_id}", operation_id="getAdminTenant")
def get_tenant(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.put("/{tenant_id}", operation_id="updateAdminTenant", response_model=ResponseEnvelope[TenantRead])
def update_tenant(
    tenant_id: str,
    request_data: TenantUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.delete("/{tenant_id}", operation_id="deleteAdminTenant")
def delete_tenant(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/{tenant_id}/users", operation_id="listAdminTenantUsers", response_model=ResponseEnvelope[UserListResponse])
def get_tenant_users(
    tenant_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/{tenant_id}/users", operation_id="createAdminTenantUsers", response_model=ResponseEnvelope[UserResponse])
def create_tenant_user(
    tenant_id: str,
    request_data: CreateTenantUserRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.put("/{tenant_id}/users/{user_id}", operation_id="updateAdminTenantUser", response_model=ResponseEnvelope[UserResponse])
def update_tenant_user(
    tenant_id: str,
    user_id: str,
    request_data: UpdateTenantUserRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/{tenant_id}/subscribe", operation_id="createAdminTenantSubscribe")
def subscribe_tenant(
    tenant_id: str,
    request_data: SubscribeTenantRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/{tenant_id}/addons", operation_id="createAdminTenantAddons")
def add_tenant_addon(
    tenant_id: str,
    request_data: AddAddonRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.delete("/{tenant_id}/addons", operation_id="deleteAdminTenantAddons")
def remove_tenant_addon(
    tenant_id: str,
    addon_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.put("/{tenant_id}/status", operation_id="updateAdminTenantStatus")
def update_tenant_status(
    tenant_id: str,
    request_data: UpdateStatusRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

-- `admin_payments.py` --
```
router = APIRouter(prefix="/api/admin/payments", tags=["Admin Payments"])

@router.get("/pos/transactions", operation_id="listAdminPaymentPoTransactions", response_model=ResponseEnvelope[List[PaymentRecordRead]])
async def get_pos_transactions(
    provider: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("payments.read", admin_only=True))
):
```

More admin router batches will follow; this file is batch-2 (analytics, settings, tenants, payments).
