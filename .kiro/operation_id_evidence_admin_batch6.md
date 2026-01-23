# OperationId Evidence — Admin Routers (batch 6)

Source folder: [x-ear/apps/api/routers](x-ear/apps/api/routers)

This file contains exact decorator lines and function signatures extracted from `admin_birfatura.py` and `admin.py`.

-- `admin_birfatura.py` --
```
router = APIRouter(prefix="/api/admin/birfatura", tags=["Admin BirFatura"])

@router.get("/stats", operation_id="listAdminBirfaturaStats", response_model=ResponseEnvelope[BirFaturaStats])
async def get_stats(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
```

```
@router.get("/invoices", operation_id="listAdminBirfaturaInvoices", response_model=ResponseEnvelope[BirFaturaInvoicesResponse])
async def get_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    direction: str = Query("outgoing", pattern="^(outgoing|incoming)$"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
```

```
@router.get("/logs", operation_id="listAdminBirfaturaLogs", response_model=ResponseEnvelope[BirFaturaLogsResponse])
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
```

-- `admin.py` --
```
router = APIRouter(prefix="/admin", tags=["Admin"])

@router.post("/auth/login", operation_id="createAdminAuthLogin", response_model=ResponseEnvelope[AdminLoginResponse])
def admin_login(request_data: AdminLoginRequest, db: Session = Depends(get_db)):
```

```
@router.post("/users", operation_id="createAdminUsers", response_model=ResponseEnvelope)
def create_admin_user(
    request_data: CreateAdminUserRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/users", operation_id="listAdminUsers", response_model=ResponseEnvelope[List[AdminUserRead]])
def get_admin_users(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    role: str = "",
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/users/all", operation_id="listAdminUserAll", response_model=ResponseEnvelope)
def get_all_tenant_users(
    page: int = 1,
    limit: int = 10,
    search: str = "",
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.put("/users/all/{user_id}", operation_id="updateAdminUserAll", response_model=ResponseEnvelope[UserRead])
def update_any_tenant_user(
    user_id: str,
    request_data: UpdateTenantUserRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/tickets", operation_id="listAdminTickets", response_model=ResponseEnvelope[List[TicketRead]])
def get_admin_tickets(
    page: int = 1,
    limit: int = 10,
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/tickets", operation_id="createAdminTickets")
def create_admin_ticket(
    request_data: CreateTicketRequest,
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.put("/tickets/{ticket_id}", operation_id="updateAdminTicket")
def update_admin_ticket(
    ticket_id: str,
    request_data: UpdateTicketRequest,
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/tickets/{ticket_id}/responses", operation_id="createAdminTicketResponses")
def create_ticket_response(
    ticket_id: str,
    request_data: TicketResponseRequest,
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/debug/switch-role", operation_id="createAdminDebugSwitchRole")
def debug_switch_role(
    request_data: SwitchRoleRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/debug/available-roles", operation_id="listAdminDebugAvailableRoles", response_model=ResponseEnvelope[AvailableRolesResponse])
def debug_available_roles(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/debug/switch-tenant", operation_id="createAdminDebugSwitchTenant")
def debug_switch_tenant(
    request_data: SwitchTenantRequest,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.post("/debug/exit-impersonation", operation_id="createAdminDebugExitImpersonation")
def debug_exit_impersonation(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

```
@router.get("/debug/page-permissions/{page_key}", operation_id="getAdminDebugPagePermission", response_model=ResponseEnvelope[DebugPagePermissionResponse])
def debug_page_permissions(
    page_key: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
```

Batch-6 complete: added `operation_id_evidence_admin_batch6.md` with verbatim decorator+signature snippets from `admin_birfatura.py` and `admin.py`.
