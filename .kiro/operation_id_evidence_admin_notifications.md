# Operation ID Evidence — Admin Notifications

Source file: [x-ear/apps/api/routers/admin_notifications.py](x-ear/apps/api/routers/admin_notifications.py)

## createAdminNotificationInitDb
Decorator and function signature (exact lines):

```py
@router.post("/init-db", operation_id="createAdminNotificationInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

## listAdminNotifications
Decorator and function signature (exact lines):

```py
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

## createAdminNotificationSend
Decorator and function signature (exact lines):

```py
@router.post("/send", operation_id="createAdminNotificationSend", response_model=ResponseEnvelope)
async def send_notification(
    data: NotificationSend,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

## listAdminNotificationTemplates
Decorator and function signature (exact lines):

```py
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

## createAdminNotificationTemplates
Decorator and function signature (exact lines):

```py
@router.post("/templates", operation_id="createAdminNotificationTemplates", response_model=ResponseEnvelope[NotificationTemplateRead])
async def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

## updateAdminNotificationTemplate
Decorator and function signature (exact lines):

```py
@router.put("/templates/{template_id}", operation_id="updateAdminNotificationTemplate", response_model=ResponseEnvelope[NotificationTemplateRead])
async def update_template(
    template_id: str,
    data: TemplateCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

## deleteAdminNotificationTemplate
Decorator and function signature (exact lines):

```py
@router.delete("/templates/{template_id}", operation_id="deleteAdminNotificationTemplate", response_model=ResponseEnvelope)
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```
