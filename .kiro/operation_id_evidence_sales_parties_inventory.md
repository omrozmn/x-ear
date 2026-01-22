# OperationId Evidence — Sales, Parties, Inventory Routers

Files processed:
- [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
- [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py)
- [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)

Each entry contains the router decorator line and the start of the function signature (copied exactly).

---

## Sales Router (`x-ear/apps/api/routers/sales.py`)

- **listSales**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.get("/sales", operation_id="listSales", response_model=ResponseEnvelope[List[SaleRead]])
    def get_sales(
        page: int = Query(1, ge=1),
    ```

- **getSale**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.get("/sales/{sale_id}", operation_id="getSale", response_model=ResponseEnvelope[SaleRead])
    def get_sale(
        sale_id: str,
    ```

- **listSalePayments**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.get("/sales/{sale_id}/payments", operation_id="listSalePayments", response_model=ResponseEnvelope[Any])
    def get_sale_payments(
        sale_id: str,
    ```

- **createSalePayments**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.post("/sales/{sale_id}/payments", operation_id="createSalePayments")
    def record_sale_payment(
        sale_id: str,
    ```

- **listSalePaymentPlan**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.get("/sales/{sale_id}/payment-plan", operation_id="listSalePaymentPlan")
    def get_sale_payment_plan(
        sale_id: str,
    ```

- **createSalePaymentPlan**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.post("/sales/{sale_id}/payment-plan", operation_id="createSalePaymentPlan")
    def create_sale_payment_plan(
        sale_id: str,
    ```

- **createSaleInstallmentPay**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.post("/sales/{sale_id}/installments/{installment_id}/pay", operation_id="createSaleInstallmentPay")
    def pay_installment(
        sale_id: str,
        installment_id: str,
    ```

- **createSales**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.post("/sales", operation_id="createSales")
    def create_sale(
        sale_in: SaleCreate,
    ```

- **updateSale**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.put("/sales/{sale_id}", operation_id="updateSale", response_model=ResponseEnvelope[SaleRead])
    def update_sale(
        sale_id: str,
    ```

- **createPartyDeviceAssignments**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.post("/parties/{party_id}/device-assignments", operation_id="createPartyDeviceAssignments", response_model=ResponseEnvelope[DeviceAssignmentCreateResponse])
    def create_device_assignments(
        party_id: str,
    ```

- **updateDeviceAssignment**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.patch("/device-assignments/{assignment_id}", operation_id="updateDeviceAssignment", response_model=ResponseEnvelope[DeviceAssignmentRead])
    def update_device_assignment(
        assignment_id: str,
    ```

- **createDeviceAssignmentReturnLoaner**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.post("/device-assignments/{assignment_id}/return-loaner", operation_id="createDeviceAssignmentReturnLoaner", response_model=ResponseEnvelope[DeviceAssignmentRead])
    def return_loaner_to_stock(
        assignment_id: str,
    ```

- **createPricingPreview**
  - Evidence: [x-ear/apps/api/routers/sales.py](x-ear/apps/api/routers/sales.py)
  - Snippet:
    ```py
    @router.post("/pricing-preview", operation_id="createPricingPreview")
    def pricing_preview(
        data: DeviceAssignmentCreate,
    ```

---

## Parties Router (`x-ear/apps/api/routers/parties.py`)

- **listParties**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py)
  - Snippet:
    ```py
    @router.get("/parties", operation_id="listParties", response_model=ResponseEnvelope[List[PartyRead]])
    def list_parties(
        page: int = 1,
    ```

- **createParties**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py)
  - Snippet:
    ```py
    @router.post("/parties", operation_id="createParties", response_model=ResponseEnvelope[PartyRead], status_code=201)
    def create_party(
        patient_in: PartyCreate,
    ```

- **listPartyExport**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py)
  - Snippet:
    ```py
    @router.get("/parties/export", operation_id="listPartyExport")
    def export_parties(
        q: Optional[str] = None,
    ```

- **listPartyCount**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py)
  - Snippet:
    ```py
    @router.get("/parties/count", operation_id="listPartyCount")
    def count_parties(
        access: UnifiedAccess = Depends(require_access("parties.view")),
    ```

- **getParty**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py)
  - Snippet:
    ```py
    @router.get("/parties/{party_id}", operation_id="getParty", response_model=ResponseEnvelope[PartyRead])
    def get_party(
        party_id: str,
    ```

- **updateParty**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py)
  - Snippet:
    ```py
    @router.put("/parties/{party_id}", operation_id="updateParty", response_model=ResponseEnvelope[PartyRead])
    def update_party(
        party_id: str,
    ```

- **deleteParty**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py)
  - Snippet:
    ```py
    @router.delete("/parties/{party_id}", operation_id="deleteParty")
    def delete_party(
        party_id: str,
    ```

- **createPartyBulkUpload**
  - Evidence: [x-ear/apps/api/routers/parties.py](x-ear/apps/api/routers/parties.py)
  - Snippet:
    ```py
    @router.post("/parties/bulk-upload", operation_id="createPartyBulkUpload", response_model=ResponseEnvelope[BulkUploadResponse])
    async def bulk_upload_parties(
        file: UploadFile = File(...),
    ```

---

## Inventory Router (`x-ear/apps/api/routers/inventory.py`)

- **listInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.get("/inventory", operation_id="listInventory", response_model=ResponseEnvelope[List[InventoryItemRead]])
    def get_all_inventory(
        page: int = 1,
    ```

- **listInventorySearch**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.get("/inventory/search", operation_id="listInventorySearch", response_model=ResponseEnvelope[InventorySearchResponse])
    def advanced_search(
        q: Optional[str] = None,
    ```

- **listInventoryStats**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.get("/inventory/stats", operation_id="listInventoryStats", response_model=ResponseEnvelope[InventoryStats])
    def get_inventory_stats(
        access: UnifiedAccess = Depends(require_access()),
    ```

- **listInventoryLowStock**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.get("/inventory/low-stock", operation_id="listInventoryLowStock", response_model=ResponseEnvelope[List[InventoryItemRead]])
    def get_low_stock(
        access: UnifiedAccess = Depends(require_access()),
    ```

- **listInventoryUnits**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.get("/inventory/units", operation_id="listInventoryUnits", response_model=ResponseEnvelope[Dict[str, List[str]]])
    def get_units(
        access: UnifiedAccess = Depends(require_access()),
    ```

- **listInventoryActivity**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.get("/inventory/{item_id}/activity", operation_id="listInventoryActivity", response_model=ResponseEnvelope[List[Dict[str, Any]]])
    def get_inventory_activities(
        item_id: str,
    ```

- **createInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.post("/inventory", operation_id="createInventory", response_model=ResponseEnvelope[InventoryItemRead], status_code=201)
    def create_inventory(
        item_in: InventoryItemCreate,
    ```

- **getInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.get("/inventory/{item_id}", operation_id="getInventory", response_model=ResponseEnvelope[InventoryItemRead])
    def get_inventory_item(
        item_id: str,
    ```

- **updateInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.put("/inventory/{item_id}", operation_id="updateInventory", response_model=ResponseEnvelope[InventoryItemRead])
    def update_inventory(
        item_id: str,
    ```

- **deleteInventory**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.delete("/inventory/{item_id}", operation_id="deleteInventory")
    def delete_inventory(
        item_id: str,
    ```

- **createInventorySerials**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.post("/inventory/{item_id}/serials", operation_id="createInventorySerials")
    def add_serials(
        item_id: str,
    ```

- **listInventoryMovements**
  - Evidence: [x-ear/apps/api/routers/inventory.py](x-ear/apps/api/routers/inventory.py)
  - Snippet:
    ```py
    @router.get("/inventory/{item_id}/movements", operation_id="listInventoryMovements", response_model=ResponseEnvelope[List[StockMovementRead]])
    def get_movements(
        item_id: str,
    ```

---

Next: I'll continue extracting the remaining routers (suppliers, auth, admin_*) and merge all evidence files into a single consolidated `x-ear/.kiro/operation_id_evidence.md` if you want. Let me know if merge preferred or keep per-batch files.
