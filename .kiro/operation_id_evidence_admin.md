# OperationId Evidence — Admin Routers (batch)

Source folder: [x-ear/apps/api/routers](x-ear/apps/api/routers)

This file contains exact decorator lines and function signatures extracted from several `admin_*` router modules. These snippets are canonical evidence mapping OpenAPI `operationId`s to backend implementations.

-- `admin_dashboard.py` --
```
router = APIRouter(prefix="/admin/dashboard", tags=["Admin Dashboard"])

@router.get("", operation_id="getAdminDashboard", response_model=ResponseEnvelope[AdminDashboardMetrics])
def get_dashboard_metrics(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/stats", operation_id="listAdminDashboardStats", response_model=ResponseEnvelope[AdminDashboardStats])
def get_dashboard_stats(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

-- `admin_roles.py` --
```
router = APIRouter(prefix="/admin", tags=["AdminRoles"])

@router.get("/roles", response_model=ResponseEnvelope[RoleListResponse], operation_id="listAdminRoles")
def get_admin_roles(
    include_permissions: bool = False,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.get("/roles/{role_id}", response_model=ResponseEnvelope[RoleResponse], operation_id="getAdminRole")
def get_admin_role(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.post("/roles", response_model=ResponseEnvelope[RoleResponse], operation_id="createAdminRoles", status_code=201)
def create_admin_role(
    request_data: RoleCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.put("/roles/{role_id}", response_model=ResponseEnvelope[RoleResponse], operation_id="updateAdminRole")
def update_admin_role(
    role_id: str,
    request_data: RoleUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.delete("/roles/{role_id}", operation_id="deleteAdminRole")
def delete_admin_role(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.get("/roles/{role_id}/permissions", response_model=ResponseEnvelope[RoleResponse], operation_id="listAdminRolePermissions")
def get_admin_role_permissions(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.put("/roles/{role_id}/permissions", response_model=ResponseEnvelope[RoleResponse], operation_id="updateAdminRolePermissions")
def update_admin_role_permissions(
    role_id: str,
    request_data: RolePermissionsUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.get("/permissions", response_model=ResponseEnvelope[PermissionListResponse], operation_id="listAdminPermissions")
def get_admin_permissions(
    category: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.get("/admin-users", operation_id="listAdminAdminUsers")
def get_admin_users_with_roles(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.get("/admin-users/{user_id}", operation_id="getAdminAdminUser")
def get_admin_user_detail(
    user_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.put("/admin-users/{user_id}/roles", operation_id="updateAdminAdminUserRoles")
def update_admin_user_roles(
    user_id: str,
    request_data: UserRolesUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

```
@router.get("/my-permissions", operation_id="listAdminMyPermissions")
def get_my_admin_permissions(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

-- `admin_invoices.py` --
```
router = APIRouter(prefix="/api/admin/invoices", tags=["Admin Invoices"])

@router.get("", operation_id="listAdminInvoices", response_model=InvoiceListResponse)
async def get_admin_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("", operation_id="createAdminInvoice", response_model=InvoiceDetailResponse)
async def create_admin_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/{invoice_id}", operation_id="getAdminInvoice", response_model=InvoiceDetailResponse)
async def get_admin_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/{invoice_id}/payment", operation_id="createAdminInvoicePayment", response_model=InvoiceDetailResponse)
async def record_payment(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/{invoice_id}/pdf", operation_id="listAdminInvoicePdf", response_model=ResponseEnvelope)
async def get_invoice_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

More `admin_*` router snippets can be appended in subsequent batches; this file contains the first set (dashboard, roles, invoices). Each snippet is verbatim from the source files and serves as evidence for the presence of the listed `operationId`s.
