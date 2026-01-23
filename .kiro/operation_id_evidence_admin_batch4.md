# OperationId Evidence — Admin Routers (batch 4)

Source folder: [x-ear/apps/api/routers](x-ear/apps/api/routers)

This file contains exact decorator lines and function signatures extracted from `admin_notifications.py`, `admin_api_keys.py`, and `admin_production.py`.

-- `admin_notifications.py` --
```
router = APIRouter(prefix="/api/admin/notifications", tags=["Admin Notifications"])

@router.post("/init-db", operation_id="createAdminNotificationInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

```
@router.get("", operation_id="listAdminNotifications", response_model=ResponseEnvelope[List[NotificationRead]])
async def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_id: Optional[str] = None,
    type_filter: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.read", admin_only=True))
):
```

```
@router.post("/send", operation_id="createAdminNotificationSend", response_model=ResponseEnvelope)
async def send_notification(
    data: NotificationSend,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

```
@router.get("/templates", operation_id="listAdminNotificationTemplates", response_model=ResponseEnvelope[List[NotificationTemplateRead]])
async def get_templates(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None, description="Filter by template category"),
    channel: Optional[str] = Query(None, description="Filter by channel (push, email)"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.read", admin_only=True))
):
```

```
@router.post("/templates", operation_id="createAdminNotificationTemplates", response_model=ResponseEnvelope[NotificationTemplateRead])
async def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

```
@router.put("/templates/{template_id}", operation_id="updateAdminNotificationTemplate", response_model=ResponseEnvelope[NotificationTemplateRead])
async def update_template(
    template_id: str,
    data: TemplateCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

```
@router.delete("/templates/{template_id}", operation_id="deleteAdminNotificationTemplate", response_model=ResponseEnvelope)
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

-- `admin_api_keys.py` --
```
router = APIRouter(prefix="/api/admin/api-keys", tags=["Admin API Keys"])

@router.post("/init-db", operation_id="createAdminApiKeyInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

```
@router.get("", operation_id="listAdminApiKeys", response_model=ApiKeyListResponse)
async def get_api_keys(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("api_keys.read", admin_only=True))
):
```

```
@router.post("", operation_id="createAdminApiKey", response_model=ApiKeyDetailResponse)
async def create_api_key(
    data: ApiKeyCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("api_keys.manage", admin_only=True))
):
```

```
@router.delete("/{key_id}", operation_id="deleteAdminApiKey", response_model=ResponseEnvelope)
async def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("api_keys.manage", admin_only=True))
):
```

-- `admin_production.py` --
```
router = APIRouter(prefix="/api/admin/production", tags=["Admin Production"])

@router.post("/init-db", operation_id="createAdminProductionInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

```
@router.get("/orders", operation_id="listAdminProductionOrders", response_model=ResponseEnvelope)
async def get_orders(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("production.read", admin_only=True))
):
```

```
@router.put("/orders/{order_id}/status", operation_id="updateAdminProductionOrderStatus", response_model=ResponseEnvelope)
async def update_order_status(
    order_id: str,
    data: OrderStatusUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("production.manage", admin_only=True))
):
```

Batch-4 complete: added `operation_id_evidence_admin_batch4.md` with verbatim decorator+signature snippets.
