# Operation ID Evidence — Admin Settings

Source file: [x-ear/apps/api/routers/admin_settings.py](x-ear/apps/api/routers/admin_settings.py)

## createAdminSettingInitDb
Decorator and function signature (exact lines):

```py
@router.post("/init-db", operation_id="createAdminSettingInitDb", response_model=ResponseEnvelope)
def init_db(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## listAdminSettings
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="listAdminSettings", response_model=ResponseEnvelope[List[SystemSettingRead]])
def get_settings(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## updateAdminSettings
Decorator and function signature (exact lines):

```py
@router.post("", operation_id="updateAdminSettings", response_model=ResponseEnvelope)
def update_settings(
    request_data: List[SettingItem],
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## createAdminSettingCacheClear
Decorator and function signature (exact lines):

```py
@router.post("/cache/clear", operation_id="createAdminSettingCacheClear", response_model=ResponseEnvelope)
def clear_cache(
    access: UnifiedAccess = Depends(require_access())
):
```

## createAdminSettingBackup
Decorator and function signature (exact lines):

```py
@router.post("/backup", operation_id="createAdminSettingBackup", response_model=ResponseEnvelope)
def trigger_backup(
    access: UnifiedAccess = Depends(require_access())
):
```
