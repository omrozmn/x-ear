# Operation ID Evidence — Admin Roles

Source file: [x-ear/apps/api/routers/admin_roles.py](x-ear/apps/api/routers/admin_roles.py)

## listAdminRoles
Decorator and function signature (exact lines):

```py
@router.get("/roles", response_model=ResponseEnvelope[RoleListResponse], operation_id="listAdminRoles")
def get_admin_roles(
    include_permissions: bool = False,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## getAdminRole
Decorator and function signature (exact lines):

```py
@router.get("/roles/{role_id}", response_model=ResponseEnvelope[RoleResponse], operation_id="getAdminRole")
def get_admin_role(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## createAdminRoles
Decorator and function signature (exact lines):

```py
@router.post("/roles", response_model=ResponseEnvelope[RoleResponse], operation_id="createAdminRoles", status_code=201)
def create_admin_role(
    request_data: RoleCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## updateAdminRole
Decorator and function signature (exact lines):

```py
@router.put("/roles/{role_id}", response_model=ResponseEnvelope[RoleResponse], operation_id="updateAdminRole")
def update_admin_role(
    role_id: str,
    request_data: RoleUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## deleteAdminRole
Decorator and function signature (exact lines):

```py
@router.delete("/roles/{role_id}", operation_id="deleteAdminRole")
def delete_admin_role(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## listAdminRolePermissions
Decorator and function signature (exact lines):

```py
@router.get("/roles/{role_id}/permissions", response_model=ResponseEnvelope[RoleResponse], operation_id="listAdminRolePermissions")
def get_admin_role_permissions(
    role_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## updateAdminRolePermissions
Decorator and function signature (exact lines):

```py
@router.put("/roles/{role_id}/permissions", response_model=ResponseEnvelope[RoleResponse], operation_id="updateAdminRolePermissions")
def update_admin_role_permissions(
    role_id: str,
    request_data: RolePermissionsUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## listAdminPermissions
Decorator and function signature (exact lines):

```py
@router.get("/permissions", response_model=ResponseEnvelope[PermissionListResponse], operation_id="listAdminPermissions")
def get_admin_permissions(
    category: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## listAdminAdminUsers
Decorator and function signature (exact lines):

```py
@router.get("/admin-users", operation_id="listAdminAdminUsers")
def get_admin_users_with_roles(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## getAdminAdminUser
Decorator and function signature (exact lines):

```py
@router.get("/admin-users/{user_id}", operation_id="getAdminAdminUser")
def get_admin_user_detail(
    user_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## updateAdminAdminUserRoles
Decorator and function signature (exact lines):

```py
@router.put("/admin-users/{user_id}/roles", operation_id="updateAdminAdminUserRoles")
def update_admin_user_roles(
    user_id: str,
    request_data: UserRolesUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```

## listAdminMyPermissions
Decorator and function signature (exact lines):

```py
@router.get("/my-permissions", operation_id="listAdminMyPermissions")
def get_my_admin_permissions(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
```
