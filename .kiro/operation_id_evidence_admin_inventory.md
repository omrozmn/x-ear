# Operation ID Evidence — Admin Inventory

Source file: [x-ear/apps/api/routers/admin_inventory.py](x-ear/apps/api/routers/admin_inventory.py)

## listAdminInventory
Decorator and function signature (exact lines):

```py
@router.get("", operation_id="listAdminInventory", response_model=ResponseEnvelope[List[DeviceRead]])
async def get_all_inventory(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("inventory.read", admin_only=True))
):
```
