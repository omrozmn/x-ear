# Operation ID Evidence — Users, Roles, Devices

Source files:
- x-ear/apps/api/routers/users.py
- x-ear/apps/api/routers/roles.py
- x-ear/apps/api/routers/devices.py

Each entry includes the exact FastAPI route decorator line and a 2–4 line function signature snippet proving the implementation of the OpenAPI `operationId`.

---

- operation_id: `listUsers`

  ```python
  @router.get("/users", operation_id="listUsers", response_model=ResponseEnvelope[List[UserRead]])
  def list_users(
      page: int = Query(1, ge=1),
  ):
  ```

- operation_id: `createUsers`

  ```python
  @router.post("/users", operation_id="createUsers", status_code=201, response_model=ResponseEnvelope[UserRead])
  def create_user(
      user_in: UserCreate,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `listUserMe`

  ```python
  @router.get("/users/me", operation_id="listUserMe", response_model=ResponseEnvelope[UserMeRead])
  def get_me(
      access: UnifiedAccess = Depends(require_access()),
      db_session: Session = Depends(get_db)
  ):
  ```

- operation_id: `updateUserMe`

  ```python
  @router.put("/users/me", operation_id="updateUserMe", response_model=ResponseEnvelope[UserRead])
  def update_me(
      user_in: UserUpdate,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `createUserMePassword`

  ```python
  @router.post("/users/me/password", operation_id="createUserMePassword")
  def change_password(
      password_in: PasswordChange,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `updateUser`

  ```python
  @router.put("/users/{user_id}", operation_id="updateUser", response_model=ResponseEnvelope[UserRead])
  def update_user(
      user_id: str,
      user_in: UserUpdate,
  ):
  ```

- operation_id: `deleteUser`

  ```python
  @router.delete("/users/{user_id}", operation_id="deleteUser")
  def delete_user(
      user_id: str,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

---

- operation_id: `listRoles`

  ```python
  @router.get("/roles", operation_id="listRoles", response_model=ResponseEnvelope[List[RoleRead]])
  def list_roles(
      access: UnifiedAccess = Depends(require_access()),
      db_session: Session = Depends(get_db)
  ):
  ```

- operation_id: `createRoles`

  ```python
  @router.post("/roles", operation_id="createRoles", status_code=201, response_model=ResponseEnvelope[RoleRead])
  def create_role(
      role_in: RoleCreate,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `updateRole`

  ```python
  @router.put("/roles/{role_id}", operation_id="updateRole", response_model=ResponseEnvelope[RoleRead])
  def update_role(
      role_id: str,
      role_in: RoleUpdate,
  ):
  ```

- operation_id: `deleteRole`

  ```python
  @router.delete("/roles/{role_id}", operation_id="deleteRole")
  def delete_role(
      role_id: str,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `createRolePermissions`

  ```python
  @router.post("/roles/{role_id}/permissions", operation_id="createRolePermissions", response_model=ResponseEnvelope[RoleRead])
  def add_permission_to_role(
      role_id: str,
      perm_in: PermissionAssign,
  ):
  ```

- operation_id: `deleteRolePermission`

  ```python
  @router.delete("/roles/{role_id}/permissions/{permission_name}", operation_id="deleteRolePermission")
  def remove_permission_from_role(
      role_id: str,
      permission_name: str,
  ):
  ```

- operation_id: `updateRolePermissions`

  ```python
  @router.put("/roles/{role_id}/permissions", operation_id="updateRolePermissions", response_model=ResponseEnvelope[RoleRead])
  def set_role_permissions(
      role_id: str,
      permissions: List[str],
  ):
  ```

---

- operation_id: `listDevices`

  ```python
  @router.get("/devices", operation_id="listDevices", response_model=ResponseEnvelope[List[DeviceRead]])
  def get_devices(
      category: Optional[str] = None,
      status: Optional[str] = None,
  ):
  ```

- operation_id: `createDevices`

  ```python
  @router.post("/devices", operation_id="createDevices", response_model=ResponseEnvelope[DeviceRead], status_code=201)
  def create_device(
      device_in: DeviceCreate,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `listDeviceCategories`

  ```python
  @router.get("/devices/categories", operation_id="listDeviceCategories")
  def get_device_categories(
      access: UnifiedAccess = Depends(require_access()),
      db_session: Session = Depends(get_db)
  ):
  ```

- operation_id: `listDeviceBrands`

  ```python
  @router.get("/devices/brands", operation_id="listDeviceBrands")
  def get_device_brands(
      access: UnifiedAccess = Depends(require_access()),
      db_session: Session = Depends(get_db)
  ):
  ```

- operation_id: `createDeviceBrands`

  ```python
  @router.post("/devices/brands", operation_id="createDeviceBrands", status_code=201)
  def create_device_brand(
      brand_in: BrandCreate,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `listDeviceLowStock`

  ```python
  @router.get("/devices/low-stock", operation_id="listDeviceLowStock", response_model=ResponseEnvelope[DeviceLowStockResponse])
  def get_low_stock_devices(
      access: UnifiedAccess = Depends(require_access()),
      db_session: Session = Depends(get_db)
  ):
  ```

- operation_id: `getDevice`

  ```python
  @router.get("/devices/{device_id}", operation_id="getDevice")
  def get_device(
      device_id: str,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `updateDevice`

  ```python
  @router.put("/devices/{device_id}", operation_id="updateDevice")
  def update_device(
      device_id: str,
      device_in: DeviceUpdate,
  ):
  ```

- operation_id: `deleteDevice`

  ```python
  @router.delete("/devices/{device_id}", operation_id="deleteDevice")
  def delete_device(
      device_id: str,
      access: UnifiedAccess = Depends(require_access()),
  ):
  ```

- operation_id: `createDeviceStockUpdate`

  ```python
  @router.post("/devices/{device_id}/stock-update", operation_id="createDeviceStockUpdate")
  def update_device_stock(
      device_id: str,
      stock_update: StockUpdateRequest,
  ):
  ```

---

File references:

- [x-ear/apps/api/routers/users.py](x-ear/apps/api/routers/users.py)
- [x-ear/apps/api/routers/roles.py](x-ear/apps/api/routers/roles.py)
- [x-ear/apps/api/routers/devices.py](x-ear/apps/api/routers/devices.py)
