# Operation ID Evidence — Suppliers

Source file: [x-ear/apps/api/routers/suppliers.py](x-ear/apps/api/routers/suppliers.py)

## listSuppliers
Decorator and function signature (exact lines):

```py
@router.get("/suppliers", operation_id="listSuppliers", response_model=ResponseEnvelope[List[SupplierRead]])
def get_suppliers(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    city: Optional[str] = None,
    sort_by: str = "company_name",
    sort_order: str = "asc",
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## listSupplierSearch
Decorator and function signature (exact lines):

```py
@router.get("/suppliers/search", operation_id="listSupplierSearch", response_model=ResponseEnvelope[SupplierSearchResponse])
def search_suppliers(
    q: str = Query("", min_length=0),
    limit: int = Query(10, ge=1, le=50),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## listSupplierStats
Decorator and function signature (exact lines):

```py
@router.get("/suppliers/stats", operation_id="listSupplierStats", response_model=ResponseEnvelope[SupplierStats])
def get_supplier_stats(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## getSupplier
Decorator and function signature (exact lines):

```py
@router.get("/suppliers/{supplier_id}", operation_id="getSupplier", response_model=ResponseEnvelope[SupplierRead])
def get_supplier(
    supplier_id: int,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## createSuppliers
Decorator and function signature (exact lines):

```py
@router.post("/suppliers", operation_id="createSuppliers", status_code=201, response_model=ResponseEnvelope[SupplierRead])
def create_supplier(
    supplier_in: SupplierCreateSchema,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## updateSupplier
Decorator and function signature (exact lines):

```py
@router.put("/suppliers/{supplier_id}", operation_id="updateSupplier", response_model=ResponseEnvelope[SupplierRead])
def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdateSchema,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```

## deleteSupplier
Decorator and function signature (exact lines):

```py
@router.delete("/suppliers/{supplier_id}", operation_id="deleteSupplier", response_model=ResponseEnvelope[None])
def delete_supplier(
    supplier_id: int,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
```
