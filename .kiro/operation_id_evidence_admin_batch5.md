# OperationId Evidence — Admin Routers (batch 5)

Source folder: [x-ear/apps/api/routers](x-ear/apps/api/routers)

This file contains exact decorator lines and function signatures extracted from `admin_scan_queue.py` and `admin_suppliers.py`.

-- `admin_scan_queue.py` --
```
router = APIRouter(prefix="/api/admin/scan-queue", tags=["Admin Scan Queue"])

@router.post("/init-db", operation_id="createAdminScanQueueInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
```

```
@router.get("", operation_id="listAdminScanQueue", response_model=ResponseEnvelope[List[ScanQueueRead]])
async def get_scan_queue(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("scan_queue.read", admin_only=True))
):
```

```
@router.post("/{scan_id}/retry", operation_id="createAdminScanQueueRetry", response_model=ResponseEnvelope[ScanQueueRead])
async def retry_scan(
    scan_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("scan_queue.manage", admin_only=True))
):
```

-- `admin_suppliers.py` --
```
router = APIRouter(prefix="/api/admin/suppliers", tags=["Admin Suppliers"])

@router.get("", operation_id="listAdminSuppliers", response_model=SupplierListResponse)
async def get_suppliers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.read", admin_only=True))
):
```

```
@router.post("", operation_id="createAdminSupplier", response_model=SupplierDetailResponse)
async def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.manage", admin_only=True))
):
```

```
@router.get("/{supplier_id}", operation_id="getAdminSupplier", response_model=SupplierDetailResponse)
async def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.read", admin_only=True))
):
```

```
@router.put("/{supplier_id}", operation_id="updateAdminSupplier", response_model=SupplierDetailResponse)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.manage", admin_only=True))
):
```

```
@router.delete("/{supplier_id}", operation_id="deleteAdminSupplier", response_model=ResponseEnvelope)
async def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.manage", admin_only=True))
):
```

Batch-5 complete: added `operation_id_evidence_admin_batch5.md` with verbatim decorator+signature snippets.
