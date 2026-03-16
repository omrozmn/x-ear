from fastapi import APIRouter, Depends, HTTPException, File, UploadFile
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from sqlalchemy import or_, func, desc, asc
from sqlalchemy.orm import Session

from schemas.inventory import (
    InventoryItemRead, InventoryItemCreate, InventoryItemUpdate,
    InventoryStats, StockMovementRead, InventorySearchResponse
)
from schemas.base import ResponseEnvelope, ApiError
from models.inventory import InventoryItem
from models.stock_movement import StockMovement


import logging
from middleware.unified_access import UnifiedAccess, require_access
from database import get_db
logger = logging.getLogger(__name__)

router = APIRouter(tags=["Inventory"])

INVENTORY_COST_PERMISSION = "sensitive.inventory.overview.cost.view"

def get_inventory_or_404(db_session: Session, item_id: str, access: UnifiedAccess) -> InventoryItem:
    item = db_session.get(InventoryItem, item_id)
    if not item:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Item not found", code="INVENTORY_ITEM_NOT_FOUND").model_dump(mode="json"),
        )
    if access.tenant_id and item.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Item not found", code="INVENTORY_ITEM_NOT_FOUND").model_dump(mode="json"),
        )
    return item


def mask_inventory_item(item: InventoryItem, access: UnifiedAccess) -> InventoryItemRead:
    payload = InventoryItemRead.model_validate(item).model_dump(by_alias=False)
    if not access.has_permission(INVENTORY_COST_PERMISSION):
        payload["cost"] = 0.0
    return InventoryItemRead.model_validate(payload)

@router.get("/inventory", operation_id="listInventory", response_model=ResponseEnvelope[List[InventoryItemRead]])
def get_all_inventory(
    page: int = 1,
    per_page: int = 20,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    supplier: Optional[str] = None,
    low_stock: bool = False,
    out_of_stock: bool = False,
    search: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Get all inventory items"""
    query = db.query(InventoryItem)
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
        
    # Branch filtering for Tenant Admin (Legacy)
    if access.is_tenant_admin and access.user.role == 'admin':
        user_branch_ids = [b.id for b in getattr(access.user, 'branches', [])]
        if user_branch_ids:
            query = query.filter(InventoryItem.branch_id.in_(user_branch_ids))
        elif getattr(access.user, 'branches', []): # If list exists but empty
             return ResponseEnvelope(data=[], meta={"total": 0, "page": page, "perPage": per_page, "totalPages": 0})

    if category: query = query.filter_by(category=category)
    if brand: query = query.filter(InventoryItem.brand.ilike(f'%{brand}%'))
    if supplier: query = query.filter(InventoryItem.supplier.ilike(f'%{supplier}%'))
    
    if low_stock:
        query = query.filter(InventoryItem.available_inventory > 0, InventoryItem.available_inventory <= InventoryItem.reorder_level)
    if out_of_stock:
        query = query.filter(InventoryItem.available_inventory == 0)
        
    if search:
        s = f"%{search}%"
        query = query.filter(or_(
            InventoryItem.name.ilike(s),
            InventoryItem.brand.ilike(s),
            InventoryItem.model.ilike(s)
        ))
        
    total = query.count()
    items = query.order_by(InventoryItem.name).offset((page - 1) * per_page).limit(per_page).all()
    
    total_pages = (total + per_page - 1) // per_page
    
    return ResponseEnvelope(
        data=[mask_inventory_item(item, access) for item in items],
        meta={
            "total": total,
            "page": page,
            "perPage": per_page,
            "totalPages": total_pages
        }
    )

@router.get("/inventory/stats", operation_id="listInventoryStats", response_model=ResponseEnvelope[InventoryStats])
def get_inventory_stats(
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Get inventory stats"""
    query = db.query(InventoryItem)
    if access.tenant_id: query = query.filter_by(tenant_id=access.tenant_id)
    
    total = query.count()
    low = query.filter(InventoryItem.available_inventory <= InventoryItem.reorder_level).count()
    out = query.filter(InventoryItem.available_inventory == 0).count()
    
    # Value
    # Note: query already filtered by tenant
    val_query = db.query(func.sum(InventoryItem.price * InventoryItem.available_inventory))
    if access.tenant_id: val_query = val_query.filter(InventoryItem.tenant_id == access.tenant_id)
    
    total_value = val_query.scalar() or 0
    
    return ResponseEnvelope(data={
        "total_items": total, 
        "low_stock": low, 
        "out_of_stock": out, 
        "total_value": float(total_value)
    })

@router.get("/inventory/search", operation_id="listInventorySearch", response_model=ResponseEnvelope[InventorySearchResponse])
def advanced_search(
    q: Optional[str] = None,
    category: Optional[str] = None,
    brand: Optional[str] = None,
    minPrice: Optional[float] = None,
    maxPrice: Optional[float] = None,
    inStock: Optional[bool] = None,
    lowStock: bool = False,
    features: Optional[str] = None,
    supplier: Optional[str] = None,
    warrantyPeriod: Optional[int] = None,
    sortBy: str = 'name',
    sortOrder: str = 'asc',
    page: int = 1,
    limit: int = 20,
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Advanced product search"""
    # ... logic port ...
    query = db.query(InventoryItem)
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
        
    # Branch filtering
    if access.is_tenant_admin and access.user.role == 'admin':
        user_branch_ids = [b.id for b in getattr(access.user, 'branches', [])]
        if user_branch_ids:
            query = query.filter(InventoryItem.branch_id.in_(user_branch_ids))
        elif getattr(access.user, 'branches', []):
             return ResponseEnvelope(
                 data={"items": [], "pagination": {"total": 0}, "filters": {}},
                 meta={"total": 0, "page": page, "per_page": limit, "total_pages": 0},
             )
             
    if q:
        s = f"%{q}%"
        query = query.filter(or_(
            InventoryItem.name.ilike(s), InventoryItem.brand.ilike(s),
            InventoryItem.model.ilike(s), InventoryItem.barcode.ilike(s),
            InventoryItem.description.ilike(s)
        ))
    
    if category: query = query.filter(InventoryItem.category == category)
    if brand: query = query.filter(InventoryItem.brand == brand)
    if minPrice is not None: query = query.filter(InventoryItem.price >= minPrice)
    if maxPrice is not None: query = query.filter(InventoryItem.price <= maxPrice)
    if inStock is not None:
         query = query.filter(InventoryItem.available_inventory > 0) if inStock else query.filter(InventoryItem.available_inventory <= 0)
    if lowStock: query = query.filter(InventoryItem.available_inventory <= InventoryItem.reorder_level)
    if features:
         for f in features.split(','):
             if f.strip(): query = query.filter(InventoryItem.features.ilike(f'%{f.strip()}%'))
    if supplier: query = query.filter(InventoryItem.supplier == supplier)
    
    # Sort
    valid_sorts = ['name', 'price', 'stock', 'brand', 'category', 'createdAt']
    # Map 'stock' to available_inventory, 'createdAt' to created_at
    if sortBy == 'stock': sort_col = InventoryItem.available_inventory
    elif sortBy == 'createdAt': sort_col = InventoryItem.created_at
    else: sort_col = getattr(InventoryItem, sortBy, InventoryItem.name)
    
    query = query.order_by(desc(sort_col) if sortOrder == 'desc' else asc(sort_col))
    
    total = query.count()
    items = query.offset((page - 1) * limit).limit(limit).all()
    
    # Filter metadata
    # ... logic from read.py ...
    cat_q = db.query(InventoryItem.category).filter(InventoryItem.category.isnot(None))
    brand_q = db.query(InventoryItem.brand).filter(InventoryItem.brand.isnot(None))
    supp_q = db.query(InventoryItem.supplier).filter(InventoryItem.supplier.isnot(None))
    
    if access.tenant_id:
        cat_q = cat_q.filter_by(tenant_id=access.tenant_id)
        brand_q = brand_q.filter_by(tenant_id=access.tenant_id)
        supp_q = supp_q.filter_by(tenant_id=access.tenant_id)
        
    categories = [c[0] for c in cat_q.distinct().all() if c[0]]
    brands_list = [b[0] for b in brand_q.distinct().all() if b[0]]
    suppliers = [s[0] for s in supp_q.distinct().all() if s[0]]
    
    # Price stats
    price_q = db.query(func.min(InventoryItem.price), func.max(InventoryItem.price))
    if access.tenant_id: price_q = price_q.filter_by(tenant_id=access.tenant_id)
    price_stats = price_q.first()
    
    return ResponseEnvelope(
        data={
            "items": [mask_inventory_item(item, access) for item in items],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit,
            },
            "filters": {
                "categories": categories,
                "brands": brands_list,
                "suppliers": suppliers,
                "priceRange": {
                    "min": float(price_stats[0]) if price_stats[0] else 0,
                    "max": float(price_stats[1]) if price_stats[1] else 0,
                },
            },
        },
        meta={
            "total": total,
            "page": page,
            "per_page": limit,
            "total_pages": (total + limit - 1) // limit,
        },
    )

@router.get("/inventory/low-stock", operation_id="listInventoryLowStock", response_model=ResponseEnvelope[List[InventoryItemRead]])
def get_low_stock(
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Get low stock items"""
    query = db.query(InventoryItem)
    if access.tenant_id: query = query.filter_by(tenant_id=access.tenant_id)
    items = query.filter(InventoryItem.available_inventory <= InventoryItem.reorder_level).all()
    return ResponseEnvelope(data=[mask_inventory_item(item, access) for item in items])

@router.get("/inventory/units", operation_id="listInventoryUnits", response_model=ResponseEnvelope[Dict[str, List[str]]])
def get_units(
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Get available units"""
    from models.inventory import UNIT_TYPES
    return ResponseEnvelope(data={"units": UNIT_TYPES})

@router.get("/inventory/{item_id}/activity", operation_id="listInventoryActivity", response_model=ResponseEnvelope[List[Dict[str, Any]]])
def get_inventory_activities(
    item_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Get inventory item activity log"""
    item = get_inventory_or_404(db, item_id, access)
    # Placeholder for activity log implementation
    # Future: fetch from ActivityLog where entity_id=item_id
    return ResponseEnvelope(data=[])

@router.post("/inventory", operation_id="createInventory", response_model=ResponseEnvelope[InventoryItemRead], status_code=201)
def create_inventory(
    item_in: InventoryItemCreate,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    """Create inventory item"""
    from uuid import uuid4
    from datetime import datetime
    from core.tenant_utils import get_effective_tenant_id
    
    # DEBUG: Log incoming data with detailed field inspection
    logger.info("[CREATE_INVENTORY] ===== START =====")
    logger.info(f"[CREATE_INVENTORY] Raw Pydantic object: {item_in}")
    logger.info(f"[CREATE_INVENTORY] Category field: {item_in.category}")
    logger.info(f"[CREATE_INVENTORY] Brand field: {item_in.brand}")
    logger.info(f"[CREATE_INVENTORY] Supplier field: {item_in.supplier}")
    logger.info(f"[CREATE_INVENTORY] Model dump (by_alias=False): {item_in.model_dump(by_alias=False)}")
    logger.info(f"[CREATE_INVENTORY] Model dump (by_alias=True): {item_in.model_dump(by_alias=True)}")
    
    data = item_in.model_dump(exclude_unset=True, by_alias=False)
    logger.info(f"[CREATE_INVENTORY] Data after model_dump: {data}")
    logger.info(f"[CREATE_INVENTORY] Category in data: {data.get('category')}")
    
    # Get effective tenant ID (supports impersonation)
    tenant_id = get_effective_tenant_id(access)
    
    # Convert Schema to Model
    # Since existing model uses from_dict or explicit init.
    # We strip unexpected fields or trust Pydantic's cleanup.
    # Note: 'serials' might be in data? InventoryItemCreate likely has it.
    serials = data.pop('available_serials', [])
    
    # Remove tenant_id from data to avoid duplicate
    data.pop('tenant_id', None)
    
    # Convert list fields to JSON strings (SQLite doesn't support list type)
    import json
    if 'features' in data and isinstance(data['features'], list):
        data['features'] = json.dumps(data['features']) if data['features'] else None
        logger.info(f"[CREATE_INVENTORY] Converted features list to JSON: {data['features']}")
    
    # Generate ID if not provided
    if 'id' not in data or not data['id']:
        data['id'] = f"item_{datetime.now(timezone.utc).strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
    
    try:
        logger.info(f"[CREATE_INVENTORY] Creating InventoryItem with tenant_id={tenant_id}")
        logger.info(f"[CREATE_INVENTORY] Data keys before model creation: {list(data.keys())}")
        
        item = InventoryItem(tenant_id=tenant_id, **data)
        
        logger.info("[CREATE_INVENTORY] Model created successfully")
        logger.info(f"[CREATE_INVENTORY] item.category = {item.category}")
        logger.info(f"[CREATE_INVENTORY] item.brand = {item.brand}")
        logger.info(f"[CREATE_INVENTORY] item.supplier = {item.supplier}")
        
        db.add(item)
        db.commit() # Commit to get ID
        
        logger.info("[CREATE_INVENTORY] Database commit successful")
        logger.info(f"[CREATE_INVENTORY] Saved item.category = {item.category}")
        
        # Add serials if any
        if serials:
            logger.info(f"[CREATE_INVENTORY] Adding {len(serials)} serial numbers")
            for s in serials:
                item.add_serial_number(s)
            db.commit()
            logger.info("[CREATE_INVENTORY] Serials added successfully")
            
        logger.info("[CREATE_INVENTORY] ===== SUCCESS =====")
        return ResponseEnvelope(data=mask_inventory_item(item, access))
    except Exception as e:
        db.rollback()
        logger.error("[CREATE_INVENTORY] ===== ERROR =====")
        logger.error(f"[CREATE_INVENTORY] Error type: {type(e).__name__}")
        logger.error(f"[CREATE_INVENTORY] Error message: {str(e)}")
        import traceback
        logger.error(f"[CREATE_INVENTORY] Traceback:\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inventory/categories", operation_id="listInventoryCategories", response_model=ResponseEnvelope[List[str]])
def get_inventory_categories(
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Get unique inventory categories"""
    query = db.query(InventoryItem.category).filter(InventoryItem.category.isnot(None))
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    categories = [c[0] for c in query.distinct().all() if c[0]]
    return ResponseEnvelope(data=categories)

@router.get("/inventory/brands", operation_id="listInventoryBrands", response_model=ResponseEnvelope[List[str]])
def get_inventory_brands(
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Get unique inventory brands"""
    query = db.query(InventoryItem.brand).filter(InventoryItem.brand.isnot(None))
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    brands = [b[0] for b in query.distinct().all() if b[0]]
    return ResponseEnvelope(data=brands)

@router.get("/inventory/{item_id}", operation_id="getInventory", response_model=ResponseEnvelope[InventoryItemRead])
def get_inventory_item(
    item_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Get item"""
    item = get_inventory_or_404(db, item_id, access)
    return ResponseEnvelope(data=mask_inventory_item(item, access))

@router.put("/inventory/{item_id}", operation_id="updateInventory", response_model=ResponseEnvelope[InventoryItemRead])
def update_inventory(
    item_id: str,
    item_in: InventoryItemUpdate,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    """Update item"""
    item = get_inventory_or_404(db, item_id, access)
    data = item_in.model_dump(exclude_unset=True)
    
    for k, v in data.items():
        if hasattr(item, k):
            setattr(item, k, v)
            
    db.commit()
    return ResponseEnvelope(data=mask_inventory_item(item, access))

@router.delete("/inventory/{item_id}", operation_id="deleteInventory")
def delete_inventory(
    item_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    """Delete item"""
    item = get_inventory_or_404(db, item_id, access)
    db.delete(item)
    db.commit()
    return ResponseEnvelope(message="Item deleted")

@router.post("/inventory/bulk-upload", operation_id="createInventoryBulkUpload", response_model=ResponseEnvelope[Dict[str, Any]])
async def bulk_upload_inventory(
    file: UploadFile = File(...),
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    """Bulk upload inventory items from CSV/XLSX"""
    try:
        import csv
        import io
        
        # Use effective_tenant_id if impersonating, otherwise use tenant_id
        effective_tenant = access.effective_tenant_id or access.tenant_id
        
        if not effective_tenant or effective_tenant == 'system':
            raise HTTPException(status_code=400, detail="Tenant context required")

        filename = (file.filename or '').lower()
        content = await file.read()
        
        rows = []

        def _sanitize_cell(v):
            if v is None: return None
            if not isinstance(v, str): return v
            v = v.strip()
            if v.startswith(('=', '+', '-', '@')): return "'" + v
            return v

        # Parse File
        if filename.endswith('.xlsx') or filename.endswith('.xls'):
            if load_workbook is None:
                raise HTTPException(status_code=500, detail="Server missing openpyxl dependency")
            try:
                wb = load_workbook(filename=io.BytesIO(content), read_only=True, data_only=True)
                sheet = wb[wb.sheetnames[0]] if wb.sheetnames else None
                if sheet is None: raise HTTPException(status_code=400, detail="XLSX contains no sheets")
                it = sheet.iter_rows(values_only=True)
                headers_row = next(it, None)
                if not headers_row: raise HTTPException(status_code=400, detail="Empty sheet")
                headers = [str(h).strip() if h is not None else '' for h in headers_row]
                for r in it:
                    obj = {}
                    for idx, h in enumerate(headers):
                        val = r[idx] if idx < len(r) else None
                        obj[h] = _sanitize_cell(val)
                    if any(v not in (None, '') for v in obj.values()):
                        rows.append(obj)
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"XLSX parse error: {e}")
        else:
            try:
                try: text = content.decode('utf-8-sig')
                except: text = content.decode('utf-8', errors='replace')
                try: dialect = csv.Sniffer().sniff(text[:4096]); delimiter = dialect.delimiter
                except: delimiter = ','
                rows = [r for r in csv.DictReader(io.StringIO(text), delimiter=delimiter)]
                rows = [{k: _sanitize_cell(v) for k, v in r.items()} for r in rows]
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")

        created = 0
        updated = 0
        errors = []
        row_num = 0
        
        for row in rows:
            row_num += 1
            try:
                def get_val(keys):
                    for k in keys:
                        if k in row and row[k]: return row[k]
                    return None
                
                name = get_val(['name', 'itemName', 'product_name'])
                barcode = get_val(['barcode', 'sku'])
                
                if not name:
                    errors.append({'row': row_num, 'error': 'Missing name'})
                    continue
                
                # Check existing
                existing = None
                if barcode:
                    existing = db.query(InventoryItem).filter(
                        InventoryItem.barcode == barcode,
                        InventoryItem.tenant_id == effective_tenant
                    ).first()
                
                payload = {
                    'name': name,
                    'barcode': barcode,
                    'category': get_val(['category', 'type']),
                    'brand': get_val(['brand', 'manufacturer']),
                    'model': get_val(['model']),
                    'price': get_val(['price', 'unitPrice']),
                    'available_inventory': get_val(['stock', 'quantity', 'available_inventory']),
                    'reorder_level': get_val(['reorderLevel', 'reorder_level', 'minStock']),
                }
                
                # Clean None values
                payload = {k: v for k, v in payload.items() if v is not None}
                
                # Convert numeric fields
                for field in ['price', 'available_inventory', 'reorder_level']:
                    if field in payload and payload[field]:
                        try: payload[field] = float(payload[field])
                        except: pass
                
                if existing:
                    for k, v in payload.items():
                        if hasattr(existing, k) and v is not None:
                            setattr(existing, k, v)
                    updated += 1
                else:
                    from uuid import uuid4
                    from datetime import datetime, timezone
                    payload['id'] = f"item_{datetime.now(timezone.utc).strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
                    payload['tenant_id'] = effective_tenant
                    item = InventoryItem(**payload)
                    db.add(item)
                    created += 1
                
                db.begin_nested()
                try:
                    db.flush()
                    db.commit()
                except:
                    db.rollback()
                    raise
                    
            except Exception as e:
                errors.append({'row': row_num, 'error': str(e)})
        
        db.commit()
        return ResponseEnvelope(data={
            'success': True,
            'created': created,
            'updated': updated,
            'errors': errors
        })
        
    except HTTPException: raise
    except Exception as e:
        db.rollback()
        logger.error(f"Bulk inventory upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/inventory/{item_id}/serials", operation_id="createInventorySerials")
def add_serials(
    item_id: str,
    payload: Dict[str, List[str]], # manual schema
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    """Add serial numbers"""
    item = get_inventory_or_404(db, item_id, access)
    serials = payload.get('serials', [])
    count = 0
    for s in serials:
        if item.add_serial_number(s):
            count += 1
    db.commit()
    db.refresh(item)
    return ResponseEnvelope(
        message=f"{count} serial numbers added",
        data={"count": count, "availableSerials": item.available_serials or []}
    )

@router.get("/inventory/{item_id}/movements", operation_id="listInventoryMovements", response_model=ResponseEnvelope[List[StockMovementRead]])
def get_movements(
    item_id: str,
    startTime: Optional[str] = None,
    endTime: Optional[str] = None,
    type: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    """Get movements with patient enrichment (Flask parity)"""
    from models.sales import DeviceAssignment, Sale
    from core.models.party import Party
    
    item = get_inventory_or_404(db, item_id, access)
    query = item.movements
    
    if startTime:
         try: query = query.filter(StockMovement.created_at >= datetime.fromisoformat(startTime.replace('Z', '+00:00')))
         except (ValueError, TypeError): pass
    if endTime:
         try: query = query.filter(StockMovement.created_at <= datetime.fromisoformat(endTime.replace('Z', '+00:00')))
         except (ValueError, TypeError): pass
    if type: query = query.filter(StockMovement.movement_type == type)
    
    
    total = query.count()
    movements = query.order_by(StockMovement.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
    
    # Enrich with patient info (Flask parity)
    results = []
    for m in movements:
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        m_dict = StockMovementRead.model_validate(m).model_dump(by_alias=True)
        
        # Enrich with patient info from transaction
        if m.transaction_id:
            try:
                # If transaction is a device assignment, get party info
                if m.transaction_id.startswith('assign_'):
                    assignment = db.get(DeviceAssignment, m.transaction_id)
                    if assignment and assignment.party_id:
                        party = db.get(Party, assignment.party_id)
                        if party:
                            m_dict['partyId'] = party.id
                            m_dict['partyName'] = f"{party.first_name} {party.last_name}".strip()
                        if assignment.sgk_scheme:
                            m_dict['prescriptionStatus'] = assignment.report_status or 'raporlu'
                # If transaction is a sale
                elif m.transaction_id.startswith('sale_'):
                    sale = db.get(Sale, m.transaction_id)
                    if sale and sale.party_id:
                        party = db.get(Party, sale.party_id)
                        if party:
                            m_dict['partyId'] = party.id
                            m_dict['partyName'] = f"{party.first_name} {party.last_name}".strip()
                        # Check assignments under this sale for prescription info
                        for da in db.query(DeviceAssignment).filter(
                            DeviceAssignment.sale_id == sale.id,
                            DeviceAssignment.inventory_id == item_id,
                        ).all():
                            if da.sgk_scheme:
                                m_dict['prescriptionStatus'] = da.report_status or 'raporlu'
                                break
            except Exception as enrich_err:
                logger.warning(f"Failed to enrich movement {m.id}: {enrich_err}")

        # For serial-based movements, also check if serial was used in any prescription
        if not m_dict.get('prescriptionStatus') and m.serial_number:
            try:
                da = db.query(DeviceAssignment).filter(
                    DeviceAssignment.tenant_id == access.tenant_id,
                    DeviceAssignment.sgk_scheme.isnot(None),
                    (DeviceAssignment.serial_number == m.serial_number) |
                    (DeviceAssignment.serial_number_left == m.serial_number) |
                    (DeviceAssignment.serial_number_right == m.serial_number),
                ).first()
                if da:
                    m_dict['prescriptionStatus'] = da.report_status or 'raporlu'
            except Exception:
                pass

        results.append(m_dict)
    
    return ResponseEnvelope(
        data=results,
        meta={
            "page": page,
            "per_page": limit,
            "total": total
        }
    )
