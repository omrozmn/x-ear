# Operation ID Evidence — Admin Addons

Source file: [x-ear/apps/api/routers/admin_addons.py](x-ear/apps/api/routers/admin_addons.py)

## listAdminAddons
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="listAdminAddons", response_model=AddonListResponse)
def list_addons(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    type: Optional[str] = Query(None),
    is_active: Optional[str] = Query(None),
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## createAdminAddon
Decorator and function signature (exact lines):

```py
@router.post("", operation_id="createAdminAddon", response_model=AddonDetailResponse)
def create_addon(
    request_data: AddonCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## getAdminAddon
Decorator and function signature (exact lines):

```py
@router.get("/{addon_id}", operation_id="getAdminAddon", response_model=AddonDetailResponse)
def get_addon(
    addon_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## updateAdminAddon
Decorator and function signature (exact lines):

```py
@router.put("/{addon_id}", operation_id="updateAdminAddon", response_model=AddonDetailResponse)
def update_addon(
    addon_id: str,
    request_data: AddonUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

## deleteAdminAddon
Decorator and function signature (exact lines):

```py
@router.delete("/{addon_id}", operation_id="deleteAdminAddon", response_model=ResponseEnvelope)
def delete_addon(
    addon_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```
