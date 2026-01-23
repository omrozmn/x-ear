"""
FastAPI SMS Packages Router - Migrated from Flask routes/sms_packages.py
Handles SMS package management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
import logging

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope, ResponseMeta
from middleware.unified_access import UnifiedAccess, require_access, require_admin

from schemas.sms import (
    SmsPackageCreate,
    SmsPackageUpdate,
    SmsPackageRead as BaseSmsPackageRead
)
from schemas.sms_packages import DetailedSmsPackageRead

logger = logging.getLogger(__name__)

router = APIRouter(tags=["SMS"])

# --- Public Routes ---

@router.get("/sms-packages", operation_id="listSmsPackages", response_model=ResponseEnvelope[List[BaseSmsPackageRead]])
def list_public_packages(db: Session = Depends(get_db)):
    """List all active SMS packages (Public)"""
    try:
        from models.sms_package import SmsPackage
        
        packages = db.query(SmsPackage).filter_by(is_active=True).order_by(SmsPackage.price).all()
        
        return ResponseEnvelope(data=[
            BaseSmsPackageRead.model_validate(p)
            for p in packages
        ])
        
    except Exception as e:
        logger.error(f"List SMS packages error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Admin Routes ---

@router.get("/admin/sms/packages", operation_id="listAdminSmPackages", response_model=ResponseEnvelope[List[DetailedSmsPackageRead]])
def list_admin_packages(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """List all SMS packages (Admin)"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        from models.sms_package import SmsPackage
        
        query = db.query(SmsPackage).order_by(SmsPackage.price)
        total = query.count()
        
        offset = (page - 1) * limit
        packages = query.offset(offset).limit(limit).all()
        
        return ResponseEnvelope(
            data=[
                DetailedSmsPackageRead.model_validate(p)
                for p in packages
            ],
            meta=ResponseMeta(
                total=total,
                total_pages=(total + limit - 1) // limit,
                page=page,
                per_page=limit
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"List admin SMS packages error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/sms/packages", operation_id="createAdminSmPackages", status_code=201, response_model=ResponseEnvelope[DetailedSmsPackageRead])
def create_package(
    request_data: SmsPackageCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new SMS package (Admin)"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        from models.sms_package import SmsPackage
        
        pkg = SmsPackage(
            name=request_data.name,
            description=request_data.description,
            sms_count=request_data.smsCount,
            price=request_data.price,
            is_active=request_data.isActive
        )
        db.add(pkg)
        db.commit()
        
        return ResponseEnvelope(data=DetailedSmsPackageRead.model_validate(pkg))
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create SMS package error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/sms/packages/{package_id}", operation_id="updateAdminSmPackage", response_model=ResponseEnvelope[DetailedSmsPackageRead])
def update_package(
    package_id: str,
    request_data: SmsPackageUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update an SMS package (Admin)"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        from models.sms_package import SmsPackage
        
        pkg = db.get(SmsPackage, package_id)
        if not pkg:
            raise HTTPException(status_code=404, detail="Package not found")
        
        if request_data.name is not None:
            pkg.name = request_data.name
        if request_data.description is not None:
            pkg.description = request_data.description
        if request_data.smsCount is not None:
            pkg.sms_count = request_data.smsCount
        if request_data.price is not None:
            pkg.price = request_data.price
        if request_data.isActive is not None:
            pkg.is_active = request_data.isActive
        
        db.commit()
        
        return ResponseEnvelope(data=DetailedSmsPackageRead.model_validate(pkg))
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Update SMS package error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/sms/packages/{package_id}", operation_id="deleteAdminSmPackage")
def delete_package(
    package_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete an SMS package (Admin)"""
    try:
        if not access.is_super_admin:
            raise HTTPException(status_code=403, detail="Super admin access required")
        
        from models.sms_package import SmsPackage
        
        pkg = db.get(SmsPackage, package_id)
        if not pkg:
            raise HTTPException(status_code=404, detail="Package not found")
        
        db.delete(pkg)
        db.commit()
        
        return ResponseEnvelope(message="Package deleted")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Delete SMS package error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
