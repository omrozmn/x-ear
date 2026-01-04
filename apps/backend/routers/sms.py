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
from dependencies import get_db, get_current_context, require_permission
from schemas.base import ResponseEnvelope, EmptyResponse
from schemas.base import ApiError
from models.sms_package import SmsPackage
from models.sms_integration import (
    SMSProviderConfig, SMSHeaderRequest, TenantSMSCredit, TargetAudience
)
from models.base import db
from models.user import User
from models.notification import Notification
# We need to access Flask app for context if using Flask-SQLAlchemy legacy models
from flask import current_app

router = APIRouter(tags=["SMS"])

# Dependency to get DB session (bridge for Flask-SQLAlchemy)
# In a pure FastAPI app, we would use a simpler session maker. 
# Here we piggyback on Flask's db session which is thread-local.
def get_db():
    # This assumes we are running in a context where db.session is usable
    # Since we use sync endpoints (def), FastAPI runs them in threads.
    # Flask-SQLAlchemy should work if the app context is pushed or if queries don't rely on it strictly (scoped_session).
    try:
        yield db.session
    except Exception:
        db.session.rollback()
        raise

# --- Public Routes ---

@router.get("/sms/packages", response_model=ResponseEnvelope[List[SMSPackageRead]])
def list_sms_packages(db: Session = Depends(get_db)):
    """List available SMS packages (Public)"""
    packages = SmsPackage.query.filter_by(is_active=True).order_by(SmsPackage.price).all()
    return ResponseEnvelope(data=packages)

# --- Admin Routes ---

@router.get("/admin/sms/packages", response_model=ResponseEnvelope[List[SMSPackageRead]])
def list_admin_packages(
    page: int = 1, 
    limit: int = 10,
    db: Session = Depends(get_db)
):
    """List all SMS packages (Admin)"""
    pagination = SmsPackage.query.order_by(SmsPackage.price).paginate(page=page, per_page=limit, error_out=False)
    
    return ResponseEnvelope(
        data=pagination.items,
        meta={
            "total": pagination.total,
            "page": pagination.page,
            "perPage": pagination.per_page,
            "totalPages": pagination.pages
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
    db.session.add(pkg)
    db.session.commit()
    return ResponseEnvelope(data=pkg)

@router.put("/admin/sms/packages/{pkg_id}", response_model=ResponseEnvelope[SMSPackageRead])
def update_package(pkg_id: str, pkg_in: SMSPackageUpdate, db: Session = Depends(get_db)):
    """Update an SMS package"""
    pkg = SmsPackage.query.get(pkg_id)
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
    
    db.session.commit()
    return ResponseEnvelope(data=pkg)

# --- Tenant Routes ---

@router.get("/sms/config", response_model=ResponseEnvelope[Optional[SMSProviderConfigRead]])
def get_sms_config(
        db: Session = Depends(get_db),
        ctx = Depends(get_current_context)
    ):
    """Get SMS configuration for tenant"""
    # Use tenant_scoped_query logic manually or via helper if available
    # For now, explicit filter since we have ctx.tenant_id
    if not ctx.tenant_id:
        return ResponseEnvelope(data=None)

    config = SMSProviderConfig.query.filter_by(tenant_id=ctx.tenant_id).first()
    
    if not config:
        # For tenant users, create default config
        if ctx.tenant_id:
            config = SMSProviderConfig(tenant_id=ctx.tenant_id)
            db.session.add(config)
            db.session.commit()
        else:
            return ResponseEnvelope(data=None)
            
    return ResponseEnvelope(data=config)

