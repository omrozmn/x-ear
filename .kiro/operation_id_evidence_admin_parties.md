# Operation ID Evidence — Admin Parties

Source file: [x-ear/apps/api/routers/admin_parties.py](x-ear/apps/api/routers/admin_parties.py)

## listAdminParties
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="listAdminParties", response_model=PartyListResponse)
async def get_all_parties(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
```

## getAdminParty
Decorator and function signature (exact lines):

```py
@router.get("/{party_id}", operation_id="getAdminParty", response_model=PartyDetailResponse)
async def get_party_detail(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
```

## listAdminPartyDevices
Decorator and function signature (exact lines):

```py
@router.get("/{party_id}/devices", operation_id="listAdminPartyDevices", response_model=ResponseEnvelope)
async def get_party_devices(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
```

## listAdminPartySales
Decorator and function signature (exact lines):

```py
@router.get("/{party_id}/sales", operation_id="listAdminPartySales", response_model=ResponseEnvelope)
async def get_party_sales(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
```

## listAdminPartyTimeline
Decorator and function signature (exact lines):

```py
@router.get("/{party_id}/timeline", operation_id="listAdminPartyTimeline", response_model=ResponseEnvelope)
async def get_party_timeline(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
```

## listAdminPartyDocuments
Decorator and function signature (exact lines):

```py
@router.get("/{party_id}/documents", operation_id="listAdminPartyDocuments", response_model=ResponseEnvelope)
async def get_party_documents(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
```
