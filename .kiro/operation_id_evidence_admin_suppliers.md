# Operation ID Evidence — Admin Suppliers

Source file: [x-ear/apps/api/routers/admin_suppliers.py](x-ear/apps/api/routers/admin_suppliers.py)

## listAdminSuppliers
Decorator and function signature (exact lines):

```py
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

## createAdminSupplier
Decorator and function signature (exact lines):

```py
@router.post("", operation_id="createAdminSupplier", response_model=SupplierDetailResponse)
async def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.manage", admin_only=True))
):
```

## getAdminSupplier
Decorator and function signature (exact lines):

```py
@router.get("/{supplier_id}", operation_id="getAdminSupplier", response_model=SupplierDetailResponse)
async def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.read", admin_only=True))
):
```

## updateAdminSupplier
Decorator and function signature (exact lines):

```py
@router.put("/{supplier_id}", operation_id="updateAdminSupplier", response_model=SupplierDetailResponse)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.manage", admin_only=True))
):
```

## deleteAdminSupplier
Decorator and function signature (exact lines):

```py
@router.delete("/{supplier_id}", operation_id="deleteAdminSupplier", response_model=ResponseEnvelope)
async def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.manage", admin_only=True))
):
```
