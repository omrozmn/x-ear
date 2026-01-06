from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from schemas.sms import (
    SMSPackageRead, SMSPackageCreate, SMSPackageUpdate,
    SMSHeaderRequestRead, SMSHeaderRequestCreate,
    SMSProviderConfigRead, SMSProviderConfigUpdate,
    TenantSMSCreditRead, TargetAudienceRead, TargetAudienceCreate
)
from schemas.base import ResponseEnvelope, EmptyResponse
from schemas.base import ApiError
from models.sms_package import SmsPackage
from models.sms_integration import (
    SMSProviderConfig, SMSHeaderRequest, TenantSMSCredit, TargetAudience
)

from models.user import User
from models.notification import Notification
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

router = APIRouter(tags=["SMS"])

# --- Public Routes removed (handled in sms_integration.py) ---

# --- Admin Routes ---

@router.get("/admin/sms/packages", response_model=ResponseEnvelope[List[SMSPackageRead]])
def list_admin_packages(
    page: int = 1, 
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """List all SMS packages (Admin)"""
    query = db.query(SmsPackage).order_by(SmsPackage.price)
    
    total = query.count()
    total_pages = (total + limit - 1) // limit
    items = query.offset((page - 1) * limit).limit(limit).all()
    
    return ResponseEnvelope(
        data=items,
        meta={
            "total": total,
            "page": page,
            "perPage": limit,
            "totalPages": total_pages
        }
    )

@router.post("/admin/sms/packages", response_model=ResponseEnvelope[SMSPackageRead], status_code=201)
def create_package(pkg_in: SMSPackageCreate, db: Session = Depends(get_db)):
    """Create a new SMS package"""
    pkg = SmsPackage(
        name=pkg_in.name,
        description=pkg_in.description,
        sms_count=pkg_in.sms_count,
        price=pkg_in.price,
        currency=pkg_in.currency,
        is_active=pkg_in.is_active
    )
    db.add(pkg)
    db.commit()
    return ResponseEnvelope(data=pkg)

@router.put("/admin/sms/packages/{pkg_id}", response_model=ResponseEnvelope[SMSPackageRead])
def update_package(pkg_id: str, pkg_in: SMSPackageUpdate, db: Session = Depends(get_db)):
    """Update an SMS package"""
    pkg = db.get(SmsPackage, pkg_id)
    if not pkg:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Package not found", code="SMS_PACKAGE_NOT_FOUND").model_dump(mode="json"),
        )
        
    if pkg_in.name is not None: pkg.name = pkg_in.name
    if pkg_in.description is not None: pkg.description = pkg_in.description
    if pkg_in.sms_count is not None: pkg.sms_count = pkg_in.sms_count
    if pkg_in.price is not None: pkg.price = pkg_in.price
    if pkg_in.currency is not None: pkg.currency = pkg_in.currency
    if pkg_in.is_active is not None: pkg.is_active = pkg_in.is_active
    
    db.commit()
    return ResponseEnvelope(data=pkg)

# --- Tenant Routes removed (handled in sms_integration.py) ---

