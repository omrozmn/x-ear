# Operation ID Evidence — Admin API Keys

Source file: [x-ear/apps/api/routers/admin_api_keys.py](x-ear/apps/api/routers/admin_api_keys.py)

## createAdminApiKeyInitDb
Decorator and function signature (exact lines):

```py
@router.post("/init-db", operation_id="createAdminApiKeyInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

## listAdminApiKeys
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="listAdminApiKeys", response_model=ApiKeyListResponse)
async def get_api_keys(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    tenant_id: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("api_keys.read", admin_only=True))
):
```

## createAdminApiKey
Decorator and function signature (exact lines):

```py
@router.post("", operation_id="createAdminApiKey", response_model=ApiKeyDetailResponse)
async def create_api_key(
    data: ApiKeyCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("api_keys.manage", admin_only=True))
):
```

## deleteAdminApiKey
Decorator and function signature (exact lines):

```py
@router.delete("/{key_id}", operation_id="deleteAdminApiKey", response_model=ResponseEnvelope)
async def revoke_api_key(
    key_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("api_keys.manage", admin_only=True))
):
```
