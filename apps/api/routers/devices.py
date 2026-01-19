"""
FastAPI Devices Router - Migrated from Flask routes/devices.py
Device CRUD, categories, brands, stock management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List, Union
from datetime import datetime
from pydantic import BaseModel, Field
import logging
import random

from sqlalchemy.orm import Session, load_only
from sqlalchemy import or_

from schemas.base import ResponseEnvelope, ResponseMeta, ApiError
from schemas.devices import (
    DeviceRead, DeviceCreate, DeviceUpdate, 
    StockUpdateRequest, BrandCreate, TrialPeriod, Warranty,
    DeviceLowStockResponse
)
from schemas.auth import PasswordChangeRequest
from schemas.notifications import NotificationUpdate
from schemas.campaigns import CampaignUpdate, SMSLogRead
from schemas.sales import DeviceAssignmentUpdate, InstallmentPayment, PaymentPlanCreate
from schemas.inventory import StockMovementRead
from schemas.sms import SmsHeaderRequestUpdate, SmsProviderConfigCreate
from schemas.tenants import TenantCreate, TenantRead, TenantStats, TenantUpdate
from schemas.users import PermissionRead, RoleRead, UserProfile
from schemas.parties import PartySearchFilters

from models.inventory import InventoryItem
from models.enums import DeviceSide, DeviceStatus, DeviceCategory
from core.models.device import Device
from core.models.enums import ProductCode, AppErrorCode
from models.tenant import Tenant
from constants import CANONICAL_CATEGORY_HEARING_AID
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Devices"])

def ensure_hearing_product(db_session: Session, tenant_id: str):
    """Ensure tenant is using a hearing product"""
    if not tenant_id:
        return # Admin or system context
        
    tenant = db_session.get(Tenant, tenant_id)
    if not tenant:
        return # Should be handled by other logic if tenant missing
        
    if not ProductCode.is_xear(tenant.product_code or ProductCode.XEAR_HEARING):
         # Allow all XEar for now? Or strictly Hearing?
         # User requirement: != XEAR_HEARING -> 403
         pass

    if tenant.product_code and tenant.product_code != ProductCode.XEAR_HEARING.value:
         raise HTTPException(
            status_code=403,
            detail={
                "error_code": AppErrorCode.PRODUCT_NOT_ALLOWED,
                "message": "Feature not available for this product",
                "product_code": tenant.product_code,
                "required_product": ProductCode.XEAR_HEARING,
            }
        )


@router.get(
    "/__internal/openapi-schema-registry",
    include_in_schema=False,
    response_model=ResponseEnvelope[
        List[
            Union[
                CampaignUpdate,
                DeviceAssignmentUpdate,
                InstallmentPayment,
                NotificationUpdate,
                PasswordChangeRequest,
                PartySearchFilters,
                PaymentPlanCreate,
                PermissionRead,
                RoleRead,
                SmsHeaderRequestUpdate,
                SMSLogRead,
                SmsProviderConfigCreate,
                StockMovementRead,
                TenantCreate,
                TenantRead,
                TenantStats,
                TenantUpdate,
                UserProfile,
            ]
        ]
    ],
)
def _openapi_schema_registry():
    return ResponseEnvelope(data=[])


# --- Helper Functions ---

def get_device_or_404(db_session: Session, device_id: str, access: UnifiedAccess) -> Device:
    """Get device or raise 404"""
    device = db_session.get(Device, device_id)
    if not device:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Device not found", code="DEVICE_NOT_FOUND").model_dump(mode="json")
        )
    if access.tenant_id and device.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Device not found", code="DEVICE_NOT_FOUND").model_dump(mode="json")
        )
    return device

# --- Routes ---

@router.get("/devices", operation_id="listDevices", response_model=ResponseEnvelope[List[DeviceRead]])
def get_devices(
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    brand: Optional[str] = None,
    inventory_only: bool = Query(False, alias="inventory_only"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get devices with filtering"""
    try:
        if access.tenant_id:
            ensure_hearing_product(db_session, access.tenant_id)
            
        query = db_session.query(Device)
        
        # Tenant scope
        if access.tenant_id:
            query = query.filter_by(tenant_id=access.tenant_id)
        
        # Inventory only filter
        if inventory_only:
            query = query.filter(or_(Device.party_id.is_(None), Device.party_id == 'inventory'))
        
        # Category filter
        if category:
            if category == CANONICAL_CATEGORY_HEARING_AID:
                hearing_device_types = ['BTE', 'ITE', 'RIC', 'CIC', 'RIC-BTE', 'HEARING_AID', 'hearing_aid']
                query = query.filter(or_(
                    Device.category == CANONICAL_CATEGORY_HEARING_AID,
                    Device.device_type.in_(hearing_device_types)
                ))
            else:
                query = query.filter(Device.category == category)
        
        if status:
            query = query.filter_by(status=status)
        if brand:
            query = query.filter_by(brand=brand)
        
        if search:
            search_filter = f"%{search}%"
            query = query.filter(or_(
                Device.brand.ilike(search_filter),
                Device.model.ilike(search_filter),
                Device.serial_number.ilike(search_filter)
            ))
        
        query = query.order_by(Device.created_at.desc())
        
        # Pagination
        total = query.count()
        devices = query.offset((page - 1) * per_page).limit(per_page).all()
        
        # Explicitly convert to DeviceRead Pydantic models
        device_reads = [DeviceRead.model_validate(d) for d in devices]
        
        return ResponseEnvelope(
            data=device_reads,
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page,
                "tenantScope": access.tenant_id
            }
        )
    except Exception as e:
        logger.error(f"Get devices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/devices", operation_id="createDevices", response_model=ResponseEnvelope[DeviceRead], status_code=201)
def create_device(
    device_in: DeviceCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Create a new device"""
    try:
        if access.tenant_id:
            ensure_hearing_product(db_session, access.tenant_id)

        data = device_in.model_dump(by_alias=False)
        logger.info(f"CREATE_DEVICE REQUEST: {data}")
        
        # If inventory_id is provided but brand/model/type are missing, fetch from inventory
        inventory_id = data.get('inventory_id')
        if inventory_id:
            logger.info(f"Looking up inventory: {inventory_id}")
            from models.inventory import InventoryItem
            inv_item = db_session.query(InventoryItem).filter_by(id=inventory_id).first()
            if inv_item:
                if not data.get('brand'):
                    data['brand'] = inv_item.brand or 'Unknown'
                if not data.get('model'):
                    data['model'] = inv_item.model or 'Unknown'
                if not data.get('type'):
                    data['type'] = inv_item.category or 'hearing_aid'
                if not data.get('price') and inv_item.price:
                    data['price'] = float(inv_item.price)
            else:
                logger.warning(f"Inventory item not found: {inventory_id}")
                # Inventory not found - require explicit brand/model/type
                if not data.get('brand') or not data.get('model') or not data.get('type'):
                    raise HTTPException(
                        status_code=422,
                        detail=f"Inventory item '{inventory_id}' not found. Please provide brand, model, and type explicitly."
                    )
        
        # Validate required fields
        brand = data.get('brand')
        model = data.get('model')
        device_type = data.get('type')
        
        if not brand or not model or not device_type:
            raise HTTPException(
                status_code=422, 
                detail="brand, model, and type are required (or provide a valid inventoryId)"
            )
        
        # Generate ID
        device_id = f"dev_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}_{random.randint(100000, 999999)}"
        
        device = Device()
        device.id = device_id
        device.tenant_id = access.tenant_id
        device.party_id = data['party_id']
        device.inventory_id = inventory_id
        
        serial_num = data.get('serial_number')
        device.serial_number = serial_num if serial_num and serial_num.strip() else None
        
        device.brand = brand
        device.model = model
        device.device_type = device_type
        
        if data.get('category'):
            device.category = DeviceCategory.from_legacy(data['category']).value
        elif data['type'] in ['hearing_aid']:
            device.category = DeviceCategory.HEARING_AID.value
        
        if data.get('ear'):
            device.ear = DeviceSide.from_legacy(data['ear']).value
        
        device.status = DeviceStatus.from_legacy(data.get('status', 'in_stock')).value
        device.price = data.get('price')
        
        if data.get('serial_number_left'):
            serial_left = data['serial_number_left']
            device.serial_number_left = serial_left if serial_left and serial_left.strip() else None
        if data.get('serial_number_right'):
            serial_right = data['serial_number_right']
            device.serial_number_right = serial_right if serial_right and serial_right.strip() else None
        
        notes_val = data.get('notes')
        device.notes = notes_val if notes_val and notes_val.strip() else None
        
        # Trial period
        if data.get('trial_period'):
            trial = data['trial_period']
            if trial.get('start_date'):
                device.trial_start_date = datetime.fromisoformat(trial['start_date'])
            if trial.get('end_date'):
                device.trial_end_date = datetime.fromisoformat(trial['end_date'])
            if trial.get('extended_until'):
                device.trial_extended_until = datetime.fromisoformat(trial['extended_until'])
        
        # Warranty
        if data.get('warranty'):
            warranty = data['warranty']
            if warranty.get('start_date'):
                device.warranty_start_date = datetime.fromisoformat(warranty['start_date'])
            if warranty.get('end_date'):
                device.warranty_end_date = datetime.fromisoformat(warranty['end_date'])
            device.warranty_terms = warranty.get('terms')
        
        db_session.add(device)
        db_session.commit()
        
        logger.info(f"Device created: {device.id}")
        
        # Create DeviceAssignment if assigned to a patient
        if device.party_id and device.party_id != 'inventory':
            try:
                from services.device_assignment_service import DeviceAssignmentService
                
                # Fetch patient to ensure we have the correct tenant_id for the assignment
                assignment_tenant_id = device.tenant_id
                
                # Use the service to handle full assignment logic (stock, bilateral, etc.)
                # Now passing the FULL device object to avoid duplication
                assignment, error = DeviceAssignmentService.assign_device(
                    session=db_session,
                    tenant_id=assignment_tenant_id,
                    party_id=device.party_id,
                    device=device,
                    assigned_by_user_id=access.principal_id
                )
                
                if error:
                    logger.error(f"Service assignment failed: {error}")
                    # Decide if we raise or continue. Fail safe?
                    # raise HTTPException(status_code=400, detail=error)
                elif assignment:
                     logger.info(f"DeviceAssignment created via service: {assignment.id}")

            except Exception as e:
                logger.error(f"Failed to auto-create assignment: {e}")
                # Don't fail the request, just log it.
        
        return ResponseEnvelope(data=DeviceRead.model_validate(device))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create device error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/categories", operation_id="listDeviceCategories")
def get_device_categories(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get available device categories"""
    try:
        query = db_session.query(Device.category).distinct().filter(
            Device.category.isnot(None),
            Device.category != ''
        )
        if access.tenant_id:
            query = query.filter(Device.tenant_id == access.tenant_id)
        
        categories = query.all()
        category_list = [cat[0].value if hasattr(cat[0], 'value') else str(cat[0]) for cat in categories if cat[0]]
        
        if not category_list:
            type_query = db_session.query(Device.device_type).distinct().filter(Device.device_type.isnot(None))
            if access.tenant_id:
                type_query = type_query.filter(Device.tenant_id == access.tenant_id)
            types = type_query.all()
            type_list = [t[0] for t in types if t[0]]
            
            hearing_types = ['BTE', 'ITE', 'RIC', 'CIC', 'RIC-BTE', 'HEARING_AID', 'hearing_aid']
            if any(t in hearing_types for t in type_list):
                if 'hearing_aid' not in category_list:
                    category_list.append('hearing_aid')
            
            for t in type_list:
                if t not in category_list:
                    category_list.append(t)
        
        return ResponseEnvelope(data={'categories': category_list})
    except Exception as e:
        logger.error(f"Get device categories error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/brands", operation_id="listDeviceBrands")
def get_device_brands(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get available device brands"""
    try:
        brands_set = set()
        
        # From Brand table
        try:
            from models.brand import Brand
            brand_models = db_session.query(Brand).all()
            for brand in brand_models:
                if brand.name:
                    brands_set.add(brand.name)
        except Exception:
            pass
        
        # From Device table
        device_query = db_session.query(Device.brand).distinct().filter(
            Device.brand.isnot(None),
            Device.brand != ''
        )
        if access.tenant_id:
            device_query = device_query.filter(Device.tenant_id == access.tenant_id)
        
        for brand in device_query.all():
            if brand[0]:
                brands_set.add(brand[0])
        
        # From Inventory table
        inv_query = db_session.query(InventoryItem.brand).distinct().filter(
            InventoryItem.brand.isnot(None),
            InventoryItem.brand != ''
        )
        if access.tenant_id:
            inv_query = inv_query.filter(InventoryItem.tenant_id == access.tenant_id)
        
        for brand in inv_query.all():
            if brand[0]:
                brands_set.add(brand[0])
        
        brand_list = sorted(list(brands_set))
        return ResponseEnvelope(data={'brands': brand_list})
    except Exception as e:
        logger.error(f"Get device brands error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/devices/brands", operation_id="createDeviceBrands", status_code=201)
def create_device_brand(
    brand_in: BrandCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Create a new device brand"""
    try:
        brand_name = brand_in.name.strip()
        if not brand_name:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="Brand name cannot be empty", code="INVALID_BRAND").model_dump(mode="json")
            )
        
        # Check if exists
        query = db_session.query(Device.brand).filter(Device.brand == brand_name)
        if access.tenant_id:
            query = query.filter(Device.tenant_id == access.tenant_id)
        
        if query.first():
            raise HTTPException(
                status_code=409,
                detail=ApiError(message="Brand already exists", code="BRAND_EXISTS").model_dump(mode="json")
            )
        
        # Create placeholder device
        placeholder_device = Device(
            tenant_id=access.tenant_id,
            serial_number=f"BRAND_PLACEHOLDER_{brand_name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            brand=brand_name,
            model=f"Placeholder for {brand_name}",
            category="aksesuar",
            device_type="aksesuar",
            status='IN_STOCK',
            party_id="inventory",
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        
        db_session.add(placeholder_device)
        db_session.commit()
        
        return ResponseEnvelope(
            data={
                'brand': {
                    'name': brand_name,
                    'createdAt': datetime.now().isoformat()
                }
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create device brand error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/low-stock", operation_id="listDeviceLowStock", response_model=ResponseEnvelope[DeviceLowStockResponse])
def get_low_stock_devices(
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get devices with low stock levels"""
    try:
        query = db_session.query(Device).filter(Device.status == 'IN_STOCK')
        if access.tenant_id:
            query = query.filter_by(tenant_id=access.tenant_id)
        
        devices = query.limit(10).all()
        
        return ResponseEnvelope(
            data={
                'devices': devices,
                'count': len(devices)
            }
        )
    except Exception as e:
        logger.error(f"Get low stock devices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/devices/{device_id}", operation_id="getDevice")
def get_device(
    device_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get a specific device"""
    device = get_device_or_404(db_session, device_id, access)
    return ResponseEnvelope(data=DeviceRead.model_validate(device))

@router.put("/devices/{device_id}", operation_id="updateDevice")
def update_device(
    device_id: str,
    device_in: DeviceUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update a device"""
    try:
        device = get_device_or_404(db_session, device_id, access)
        data = device_in.model_dump(exclude_unset=True, by_alias=False)
        
        if 'brand' in data:
            device.brand = data['brand']
        if 'model' in data:
            device.model = data['model']
        if 'type' in data:
            device.device_type = data['type']
        if 'category' in data:
            device.category = DeviceCategory.from_legacy(data['category']).value
        if 'ear' in data:
            device.ear = DeviceSide.from_legacy(data['ear']).value
        if 'status' in data:
            device.status = DeviceStatus.from_legacy(data['status']).value
        if 'price' in data:
            device.price = data['price']
        if 'notes' in data:
            device.notes = data['notes']
        if 'serial_number' in data:
            device.serial_number = data['serial_number']
        if 'serial_number_left' in data:
            serial_left = data['serial_number_left']
            device.serial_number_left = serial_left if serial_left and serial_left.strip() else None
        if 'serial_number_right' in data:
            serial_right = data['serial_number_right']
            device.serial_number_right = serial_right if serial_right and serial_right.strip() else None
        
        # Trial period
        if data.get('trial_period'):
            trial = data['trial_period']
            if trial.get('start_date'):
                device.trial_start_date = datetime.fromisoformat(trial['start_date'])
            if trial.get('end_date'):
                device.trial_end_date = datetime.fromisoformat(trial['end_date'])
            if trial.get('extended_until'):
                device.trial_extended_until = datetime.fromisoformat(trial['extended_until'])
        
        # Warranty
        if data.get('warranty'):
            warranty = data['warranty']
            if warranty.get('start_date'):
                device.warranty_start_date = datetime.fromisoformat(warranty['start_date'])
            if warranty.get('end_date'):
                device.warranty_end_date = datetime.fromisoformat(warranty['end_date'])
            device.warranty_terms = warranty.get('terms')
        
        db_session.commit()
        return ResponseEnvelope(data=DeviceRead.model_validate(device))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update device error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/devices/{device_id}", operation_id="deleteDevice")
def delete_device(
    device_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Delete a device or device assignment"""
    try:
        device = db_session.get(Device, device_id)
        if device:
            if access.tenant_id and device.tenant_id != access.tenant_id:
                raise HTTPException(
                    status_code=404,
                    detail=ApiError(message="Device not found", code="DEVICE_NOT_FOUND").model_dump(mode="json")
                )
            db_session.delete(device)
            db_session.commit()
            return ResponseEnvelope(message="Device deleted successfully")
        
        # Try DeviceAssignment
        from models.sales import DeviceAssignment
        assignment = db_session.get(DeviceAssignment, device_id)
        
        if assignment:
            if access.tenant_id and assignment.tenant_id != access.tenant_id:
                raise HTTPException(
                    status_code=404,
                    detail=ApiError(message="Device not found", code="DEVICE_NOT_FOUND").model_dump(mode="json")
                )
            
            # Restore stock
            if assignment.delivery_status == 'delivered' and assignment.inventory_id:
                inventory = db_session.get(InventoryItem, assignment.inventory_id)
                if inventory:
                    inventory.update_inventory(1)
            
            if assignment.is_loaner and assignment.loaner_inventory_id:
                loaner_inv = db_session.get(InventoryItem, assignment.loaner_inventory_id)
                if loaner_inv:
                    loaner_inv.update_inventory(1)
            
            db_session.delete(assignment)
            db_session.commit()
            return ResponseEnvelope(message="Device assignment deleted and stock restored")
        
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Device not found", code="DEVICE_NOT_FOUND").model_dump(mode="json")
        )
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete device error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/devices/{device_id}/stock-update", operation_id="createDeviceStockUpdate")
def update_device_stock(
    device_id: str,
    stock_update: StockUpdateRequest,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update device stock levels"""
    try:
        device = get_device_or_404(db_session, device_id, access)
        
        if stock_update.notes:
            device.notes = (device.notes or '') + f"\n[stock-update] {stock_update.operation} x{stock_update.quantity}: {stock_update.notes}"
        
        db_session.add(device)
        db_session.commit()
        
        return ResponseEnvelope(message="Stock update applied")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update device stock error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
