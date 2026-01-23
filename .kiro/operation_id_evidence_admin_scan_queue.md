# Operation ID Evidence — Admin Scan Queue

Source file: [x-ear/apps/api/routers/admin_scan_queue.py](x-ear/apps/api/routers/admin_scan_queue.py)

## createAdminScanQueueInitDb
Decorator and function signature (exact lines):

```py
@router.post("/init-db", operation_id="createAdminScanQueueInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

## listAdminScanQueue
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="listAdminScanQueue", response_model=ResponseEnvelope[List[ScanQueueRead]])
async def get_scan_queue(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("scan_queue.read", admin_only=True))
):
```

## createAdminScanQueueRetry
Decorator and function signature (exact lines):

```py
@router.post("/{scan_id}/retry", operation_id="createAdminScanQueueRetry", response_model=ResponseEnvelope[ScanQueueRead])
async def retry_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("scan_queue.manage", admin_only=True))
):
```
