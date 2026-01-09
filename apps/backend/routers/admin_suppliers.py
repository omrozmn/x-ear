"""Admin Suppliers Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional
from datetime import datetime
import logging

from database import get_db
from models.suppliers import Supplier
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.suppliers import SupplierCreate, SupplierUpdate, SupplierRead
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/suppliers", tags=["Admin Suppliers"])

# Response models
class SupplierListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class SupplierDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.get("", response_model=SupplierListResponse)
async def get_suppliers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.read", admin_only=True))
):
    """Get list of suppliers"""
    try:
        query = db.query(Supplier)
        
        if search:
            query = query.filter(
                or_(
                    Supplier.company_name.ilike(f"%{search}%"),
                    Supplier.contact_name.ilike(f"%{search}%"),
                    Supplier.email.ilike(f"%{search}%")
                )
            )
        if status:
            query = query.filter(Supplier.status == status)
        
        total = query.count()
        suppliers = query.order_by(Supplier.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return {
            "success": True,
            "data": {
                "suppliers": [s.to_dict() for s in suppliers],
                "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=SupplierDetailResponse)
async def create_supplier(
    data: SupplierCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.manage", admin_only=True))
):
    """Create a new supplier"""
    try:
        if not data.company_name:
            raise HTTPException(status_code=400, detail="Company name is required")
        
        new_supplier = Supplier(
            company_name=data.company_name,
            contact_name=data.contact_name,
            email=data.email,
            phone=data.phone,
            address=data.address,
            tax_id=data.tax_id,
            tax_office=data.tax_office,
            status=data.status,
            created_at=datetime.utcnow()
        )
        db.add(new_supplier)
        db.commit()
        db.refresh(new_supplier)
        return {"success": True, "data": {"supplier": new_supplier.to_dict()}}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{supplier_id}", operation_id="getAdminSupplier", response_model=SupplierDetailResponse)
async def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.read", admin_only=True))
):
    """Get single supplier"""
    try:
        supplier = db.get(Supplier, supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        return {"success": True, "data": {"supplier": supplier.to_dict()}}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{supplier_id}", operation_id="updateAdminSupplier", response_model=SupplierDetailResponse)
async def update_supplier(
    supplier_id: int,
    data: SupplierUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.manage", admin_only=True))
):
    """Update a supplier"""
    try:
        supplier = db.get(Supplier, supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        if data.company_name is not None:
            supplier.company_name = data.company_name
        if data.contact_name is not None:
            supplier.contact_name = data.contact_name
        if data.email is not None:
            supplier.email = data.email
        if data.phone is not None:
            supplier.phone = data.phone
        if data.address is not None:
            supplier.address = data.address
        if data.tax_id is not None:
            supplier.tax_id = data.tax_id
        if data.tax_office is not None:
            supplier.tax_office = data.tax_office
        if data.status is not None:
            supplier.status = data.status
        
        supplier.updated_at = datetime.utcnow()
        db.commit()
        return {"success": True, "data": {"supplier": supplier.to_dict()}}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/{supplier_id}", operation_id="deleteAdminSupplier", response_model=ResponseEnvelope)
async def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("suppliers.manage", admin_only=True))
):
    """Delete a supplier"""
    try:
        supplier = db.get(Supplier, supplier_id)
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")
        
        db.delete(supplier)
        db.commit()
        return {"success": True, "message": "Supplier deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
