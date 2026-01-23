# Operation ID Evidence — Notifications

Source file: [x-ear/apps/api/routers/notifications.py](x-ear/apps/api/routers/notifications.py)

## createNotifications
Decorator and function signature (exact lines):

```py
@router.post("/notifications", operation_id="createNotifications", status_code=201, response_model=ResponseEnvelope[NotificationRead])
def create_notification(
    notif_in: NotificationCreateSchema,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## listNotifications
Decorator and function signature (exact lines):

```py
@router.get("/notifications", operation_id="listNotifications", response_model=ResponseEnvelope[List[NotificationRead]])
def list_notifications(
    user_id: Optional[str] = Query(None, alias="user_id"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## updateNotificationRead
Decorator and function signature (exact lines):

```py
@router.put("/notifications/{notification_id}/read", operation_id="updateNotificationRead", response_model=ResponseEnvelope[NotificationRead])
def mark_notification_read(
    notification_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## updateNotification
Decorator and function signature (exact lines):

```py
@router.put("/notifications/{notification_id}", operation_id="updateNotification", response_model=ResponseEnvelope[NotificationRead])
def update_notification(
    notification_id: str,
    notif_in: NotificationUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## listNotificationStats
Decorator and function signature (exact lines):

```py
@router.get("/notifications/stats", operation_id="listNotificationStats", response_model=ResponseEnvelope[NotificationStats])
def notification_stats(
    user_id: Optional[str] = Query(None, alias="user_id"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## deleteNotification
Decorator and function signature (exact lines):

```py
@router.delete("/notifications/{notification_id}", operation_id="deleteNotification", response_model=ResponseEnvelope[None])
def delete_notification(
    notification_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## listNotificationSettings
Decorator and function signature (exact lines):

```py
@router.get("/notifications/settings", operation_id="listNotificationSettings", response_model=ResponseEnvelope[NotificationSettings])
def get_user_notification_settings(
    user_id: Optional[str] = Query(None, alias="user_id"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## updateNotificationSettings
Decorator and function signature (exact lines):

```py
@router.put("/notifications/settings", operation_id="updateNotificationSettings", response_model=ResponseEnvelope[NotificationSettings])
def set_user_notification_settings(
    settings_in: NotificationSettingsUpdate,
    db_session: Session = Depends(get_db)
):
```
