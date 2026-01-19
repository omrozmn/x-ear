"""Admin Inventory Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import logging

from database import get_db
from models.device import Device
from models.tenant import Tenant
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope
from schemas.devices import DeviceRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/inventory", tags=["Admin Inventory"])

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
    """Get list of ALL devices/inventory from ALL tenants"""
    try:
        query = db.query(Device)
        
        if search:
            query = query.filter(
                (Device.brand.ilike(f"%{search}%")) |
                (Device.model.ilike(f"%{search}%")) |
                (Device.serial_number.ilike(f"%{search}%")) |
                (Device.serial_number_left.ilike(f"%{search}%")) |
                (Device.serial_number_right.ilike(f"%{search}%"))
            )
        
        if access.tenant_id:
            query = query.filter(Device.tenant_id == access.tenant_id)
        if status:
            query = query.filter(Device.status == status)
        if category:
            query = query.filter(Device.category == category)
        
        total = query.count()
        devices = query.order_by(Device.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        devices_list = []
        for dev in devices:
            dev_data = DeviceRead.model_validate(dev).model_dump(by_alias=True)
            if dev.tenant_id:
                tenant = db.get(Tenant, dev.tenant_id)
                if tenant:
                    dev_data["tenantName"] = tenant.name
            devices_list.append(dev_data)
        
        return ResponseEnvelope(
            data=devices_list,
            meta={
                "page": page,
                "per_page": limit,
                "total": total,
                "total_pages": (total + limit - 1) // limit
            }
        )
    except Exception as e:
        logger.error(f"Get all inventory error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

