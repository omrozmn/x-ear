# OperationId Evidence (partial — batch 1)

This file lists router `operation_id` decorations mapped to their implementing router files. Each entry shows a file link (with line range from the grep search) and a 2–3 line snippet copied from the router implementation.

---

## Parties (`apps/api/routers/parties.py`)

- **listParties**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L43-L45)
  - Snippet:
    ```py
    @router.get("/parties", operation_id="listParties", response_model=ResponseEnvelope[List[PartyRead]])
    def list_parties(
        page: int = 1,
    ```

- **createParties**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L102-L104)
  - Snippet:
    ```py
    @router.post("/parties", operation_id="createParties", response_model=ResponseEnvelope[PartyRead], status_code=201)
    def create_party(
        patient_in: PartyCreate,
    ```

- **listPartyExport**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L130-L132)
  - Snippet:
    ```py
    @router.get("/parties/export", operation_id="listPartyExport")
    def export_parties(
        q: Optional[str] = None,
    ```

- **listPartyCount**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L208-L210)
  - Snippet:
    ```py
    @router.get("/parties/count", operation_id="listPartyCount")
    def count_parties(
        access: UnifiedAccess = Depends(require_access("parties.view")),
    ```

- **getParty**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L224-L226)
  - Snippet:
    ```py
    @router.get("/parties/{party_id}", operation_id="getParty", response_model=ResponseEnvelope[PartyRead])
    def get_party(
        party_id: str,
    ```

- **updateParty**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L236-L238)
  - Snippet:
    ```py
    @router.put("/parties/{party_id}", operation_id="updateParty", response_model=ResponseEnvelope[PartyRead])
    def update_party(
        party_id: str,
    ```

- **deleteParty**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L256-L258)
  - Snippet:
    ```py
    @router.delete("/parties/{party_id}", operation_id="deleteParty")
    def delete_party(
        party_id: str,
    ```

- **createPartyBulkUpload**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py#L274-L276)
  - Snippet:
    ```py
    @router.post("/parties/bulk-upload", operation_id="createPartyBulkUpload", response_model=ResponseEnvelope[BulkUploadResponse])
    async def bulk_upload_parties(
        file: UploadFile = File(...),
    ```

---

## Admin BirFatura (`apps/api/routers/admin_birfatura.py`)

- **listAdminBirfaturaStats**
  - Evidence: [x-ear/apps/api/routers/admin_birfatura.py](x-ear/apps/api/routers/admin_birfatura.py#L23-L25)
  - Snippet:
    ```py
    @router.get("/stats", operation_id="listAdminBirfaturaStats", response_model=ResponseEnvelope[BirFaturaStats])
    async def get_stats(
        db: Session = Depends(get_db),
    ```

- **listAdminBirfaturaInvoices**
  - Evidence: [x-ear/apps/api/routers/admin_birfatura.py](x-ear/apps/api/routers/admin_birfatura.py#L56-L58)
  - Snippet:
    ```py
    @router.get("/invoices", operation_id="listAdminBirfaturaInvoices", response_model=ResponseEnvelope[BirFaturaInvoicesResponse])
    async def get_invoices(
        page: int = Query(1, ge=1),
    ```

- **listAdminBirfaturaLogs**
  - Evidence: [x-ear/apps/api/routers/admin_birfatura.py](x-ear/apps/api/routers/admin_birfatura.py#L97-L99)
  - Snippet:
    ```py
    @router.get("/logs", operation_id="listAdminBirfaturaLogs", response_model=ResponseEnvelope[BirFaturaLogsResponse])
    async def get_logs(
        page: int = Query(1, ge=1),
    ```

---

## Inventory (`apps/api/routers/inventory.py`)

- **listInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L39-L41)
  - Snippet:
    ```py
    @router.get("/inventory", operation_id="listInventory", response_model=ResponseEnvelope[List[InventoryItemRead]])
    def get_all_inventory(
        page: int = 1,
    ```

- **listInventorySearch**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L97-L99)
  - Snippet:
    ```py
    @router.get("/inventory/search", operation_id="listInventorySearch", response_model=ResponseEnvelope[InventorySearchResponse])
    def advanced_search(
        q: Optional[str] = None,
    ```

- **listInventoryStats**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L212-L214)
  - Snippet:
    ```py
    @router.get("/inventory/stats", operation_id="listInventoryStats", response_model=ResponseEnvelope[InventoryStats])
    def get_inventory_stats(
        access: UnifiedAccess = Depends(require_access()),
    ```

- **listInventoryLowStock**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L239-L241)
  - Snippet:
    ```py
    @router.get("/inventory/low-stock", operation_id="listInventoryLowStock", response_model=ResponseEnvelope[List[InventoryItemRead]])
    def get_low_stock(
        access: UnifiedAccess = Depends(require_access()),
    ```

- **listInventoryUnits**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L250-L252)
  - Snippet:
    ```py
    @router.get("/inventory/units", operation_id="listInventoryUnits", response_model=ResponseEnvelope[Dict[str, List[str]]])
    def get_units(
        access: UnifiedAccess = Depends(require_access()),
    ```

- **listInventoryActivity**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L259-L261)
  - Snippet:
    ```py
    @router.get("/inventory/{item_id}/activity", operation_id="listInventoryActivity", response_model=ResponseEnvelope[List[Dict[str, Any]]])
    def get_inventory_activities(
        item_id: str,
    ```

- **createInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L271-L273)
  - Snippet:
    ```py
    @router.post("/inventory", operation_id="createInventory", response_model=ResponseEnvelope[InventoryItemRead], status_code=201)
    def create_inventory(
        item_in: InventoryItemCreate,
    ```

- **getInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L323-L325)
  - Snippet:
    ```py
    @router.get("/inventory/{item_id}", operation_id="getInventory", response_model=ResponseEnvelope[InventoryItemRead])
    def get_inventory_item(
        item_id: str,
    ```

- **updateInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L333-L335)
  - Snippet:
    ```py
    @router.put("/inventory/{item_id}", operation_id="updateInventory", response_model=ResponseEnvelope[InventoryItemRead])
    def update_inventory(
        item_id: str,
    ```

- **deleteInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L351-L353)
  - Snippet:
    ```py
    @router.delete("/inventory/{item_id}", operation_id="deleteInventory")
    def delete_inventory(
        item_id: str,
    ```

- **createInventorySerials**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L363-L365)
  - Snippet:
    ```py
    @router.post("/inventory/{item_id}/serials", operation_id="createInventorySerials")
    def add_serials(
        item_id: str,
    ```

- **listInventoryMovements**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py#L380-L382)
  - Snippet:
    ```py
    @router.get("/inventory/{item_id}/movements", operation_id="listInventoryMovements", response_model=ResponseEnvelope[List[StockMovementRead]])
    def get_movements(
        item_id: str,
    ```

---

## Suppliers (`apps/api/routers/suppliers.py`)

- **listSuppliers**
  - Evidence: [x-ear/apps/api/routers/suppliers.py](x-ear/apps/api/routers/suppliers.py#L92-L94)
  - Snippet:
    ```py
    @router.get("/suppliers", operation_id="listSuppliers", response_model=ResponseEnvelope[List[SupplierRead]])
    def get_suppliers(
        page: int = Query(1, ge=1),
    ```

- **listSupplierSearch**
  - Evidence: [x-ear/apps/api/routers/suppliers.py](x-ear/apps/api/routers/suppliers.py#L151-L153)
  - Snippet:
    ```py
    @router.get("/suppliers/search", operation_id="listSupplierSearch", response_model=ResponseEnvelope[SupplierSearchResponse])
    def search_suppliers(
        q: str = Query("", min_length=0),
    ```

- **listSupplierStats**
  - Evidence: [x-ear/apps/api/routers/suppliers.py](x-ear/apps/api/routers/suppliers.py#L183-L185)
  - Snippet:
    ```py
    @router.get("/suppliers/stats", operation_id="listSupplierStats", response_model=ResponseEnvelope[SupplierStats])
    def get_supplier_stats(
        access: UnifiedAccess = Depends(require_access()),
    ```

- **getSupplier**
  - Evidence: [x-ear/apps/api/routers/suppliers.py](x-ear/apps/api/routers/suppliers.py#L227-L229)
  - Snippet:
    ```py
    @router.get("/suppliers/{supplier_id}", operation_id="getSupplier", response_model=ResponseEnvelope[SupplierRead])
    def get_supplier(
        supplier_id: int,
    ```

- **createSuppliers**
  - Evidence: [x-ear/apps/api/routers/suppliers.py](x-ear/apps/api/routers/suppliers.py#L268-L270)
  - Snippet:
    ```py
    @router.post("/suppliers", operation_id="createSuppliers", status_code=201, response_model=ResponseEnvelope[SupplierRead])
    def create_supplier(
        supplier_in: SupplierCreateSchema,
    ```

- **updateSupplier**
  - Evidence: [x-ear/apps/api/routers/suppliers.py](x-ear/apps/api/routers/suppliers.py#L315-L317)
  - Snippet:
    ```py
    @router.put("/suppliers/{supplier_id}", operation_id="updateSupplier", response_model=ResponseEnvelope[SupplierRead])
    def update_supplier(
        supplier_id: int,
    ```

- **deleteSupplier**
  - Evidence: [x-ear/apps/api/routers/suppliers.py](x-ear/apps/api/routers/suppliers.py#L360-L362)
  - Snippet:
    ```py
    @router.delete("/suppliers/{supplier_id}", operation_id="deleteSupplier", response_model=ResponseEnvelope[None])
    def delete_supplier(
        supplier_id: int,
    ```

---

## Auth (`apps/api/routers/auth.py`)

- **createAuthLookupPhone**
  - Evidence: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py#L108-L110)
  - Snippet:
    ```py
    @router.post("/auth/lookup-phone", operation_id="createAuthLookupPhone", response_model=ResponseEnvelope[LookupPhoneResponse])
    def lookup_phone(
        request_data: LookupPhoneRequest,
    ```

- **createAuthForgotPassword**
  - Evidence: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py#L151-L153)
  - Snippet:
    ```py
    @router.post("/auth/forgot-password", operation_id="createAuthForgotPassword", response_model=ResponseEnvelope[MessageResponse])
    def forgot_password(
        request_data: ForgotPasswordRequest,
    ```

- **createAuthVerifyOtp**
  - Evidence: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py#L199-L201)
  - Snippet:
    ```py
    @router.post("/auth/verify-otp", operation_id="createAuthVerifyOtp", response_model=ResponseEnvelope[VerifyOtpResponse])
    def verify_otp(
        request_data: VerifyOtpRequest,
    ```

- **createAuthResetPassword**
  - Evidence: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py#L298-L300)
  - Snippet:
    ```py
    @router.post("/auth/reset-password", operation_id="createAuthResetPassword", response_model=ResponseEnvelope[ResetPasswordResponse])
    def reset_password(
        request_data: ResetPasswordRequest,
    ```

- **createAuthLogin**
  - Evidence: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py#L362-L364)
  - Snippet:
    ```py
    @router.post("/auth/login", operation_id="createAuthLogin", response_model=ResponseEnvelope[LoginResponse])
    def login(
        request_data: LoginRequest,
    ```

- **createAuthRefresh**
  - Evidence: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py#L528-L530)
  - Snippet:
    ```py
    @router.post("/auth/refresh", operation_id="createAuthRefresh", response_model=ResponseEnvelope[RefreshTokenResponse])
    def refresh_token(
        authorization: str = Depends(oauth2_scheme),
    ```

- **getAuthMe**
  - Evidence: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py#L636-L638)
  - Snippet:
    ```py
    @router.get("/auth/me", operation_id="getAuthMe", response_model=ResponseEnvelope[Union[AuthUserRead, AdminUserRead]])
    def get_current_user(
        authorization: str = Depends(oauth2_scheme),
    ```

- **createAuthSendVerificationOtp**
  - Evidence: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py#L668-L670)
  - Snippet:
    ```py
    @router.post("/auth/send-verification-otp", operation_id="createAuthSendVerificationOtp", response_model=ResponseEnvelope[MessageResponse])
    def send_verification_otp(
        request_data: SendVerificationOtpRequest,
    ```

- **createAuthSetPassword**
  - Evidence: [x-ear/apps/api/routers/auth.py](x-ear/apps/api/routers/auth.py#L734-L736)
  - Snippet:
    ```py
    @router.post("/auth/set-password", operation_id="createAuthSetPassword", response_model=ResponseEnvelope[MessageResponse])
    def set_password(
        request_data: SetPasswordRequest,
    ```

---

(End of batch 1 — more files will be processed in subsequent batches and appended here.)
