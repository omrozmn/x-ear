from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List, Optional, Any, Dict
from datetime import datetime
from sqlalchemy import or_
from sqlalchemy.orm import Session
import json
import base64
from enum import Enum

from schemas.patients import (
    PatientRead, PatientCreate, PatientUpdate, PatientSearchFilters
)
from schemas.base import ResponseEnvelope, ResponseMeta
from schemas.base import ApiError
from models.patient import Patient
from models.sales import Sale, DeviceAssignment, PaymentRecord
from models.inventory import InventoryItem

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access

import logging

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Patients"])

# --- HELPERS ---

def get_patient_or_404(db_session: Session, patient_id: str, access: UnifiedAccess) -> Patient:
    patient = db_session.get(Patient, patient_id)
    if not patient:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
            )
    if access.tenant_id and patient.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Patient not found", code="PATIENT_NOT_FOUND").model_dump(mode="json"),
        ) # Hide cross-tenant
    return patient

# --- ROUTES ---

@router.get("/patients", response_model=ResponseEnvelope[List[PatientRead]])
def list_patients(
    page: int = 1,
    per_page: int = 20,
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    city: Optional[str] = None,
    district: Optional[str] = None,
    cursor: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access("patients.view")),
    db: Session = Depends(get_db)
):
    """List patients with filtering and pagination"""
    try:
        query = db.query(Patient)
        
        # Tenant Scope
        if access.tenant_id:
            query = query.filter_by(tenant_id=access.tenant_id)
            
        # Branch Logic (Legacy Admin restriction)
        if access.is_tenant_admin and access.user and access.user.role == 'admin':
             user_branch_ids = [b.id for b in getattr(access.user, 'branches', [])]
             if user_branch_ids:
                 query = query.filter(Patient.branch_id.in_(user_branch_ids))
             elif getattr(access.user, 'branches', []):
                  return ResponseEnvelope(data=[], meta=ResponseMeta(total=0, page=page, perPage=per_page, totalPages=0))
        
        # Search
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Patient.first_name.ilike(search_term),
                    Patient.last_name.ilike(search_term),
                    Patient.phone.ilike(search_term),
                    Patient.email.ilike(search_term),
                    Patient.tc_number.ilike(search_term)
                )
            )
            
        # Filters
        if status_filter:
            from models.enums import PatientStatus
            # Convert status filter to enum value if possible
            try:
                status_enum = PatientStatus.from_legacy(status_filter)
                # Use .value for safe comparison with SQLAlchemy
                query = query.filter(Patient.status == status_enum.value)
            except:
                query = query.filter(Patient.status == status_filter)
        if city:
            query = query.filter(Patient.address_city == city)
        if district:
            query = query.filter(Patient.address_district == district)
            
        # Cursor Pagination Logic
        if cursor:
             try:
                 cursor_id = base64.b64decode(cursor.encode()).decode()
                 query = query.filter(Patient.id > cursor_id)
             except Exception:
                 pass
        
        # Count total (separate query)
        total = query.count() if not cursor else 0 # optimized, don't count on cursor pages usually
        
        # Paginate
        query = query.order_by(Patient.id)
        limit = min(per_page, 200)
        items = query.limit(limit + 1).all()
        
        has_next = len(items) > limit
        if has_next:
            items = items[:-1]
            
        # Next Cursor
        next_cursor = None
        if has_next and items:
            next_cursor = base64.b64encode(str(items[-1].id).encode()).decode()
            
        # Manual pagination meta calculation if not cursor
        total_pages = 0
        if not cursor and total > 0:
            total_pages = (total + per_page - 1) // per_page
            
        return ResponseEnvelope(
            data=[item.to_dict() for item in items],
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": total_pages,
                "hasNext": has_next,
                "nextCursor": next_cursor
            }
        )
    except Exception as e:
        logger.error(f"List patients error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# ... imports ...

@router.post("/patients", response_model=ResponseEnvelope[PatientRead], status_code=201)
def create_patient(
    patient_in: PatientCreate,
    access: UnifiedAccess = Depends(require_access("patients.create")),
    db: Session = Depends(get_db)
):
    """Create a new patient"""
    try:
        if not access.tenant_id:
              raise HTTPException(
                  status_code=400,
                  detail=ApiError(message="Tenant context required", code="TENANT_REQUIRED").model_dump(mode="json"),
              )

        # Create instance
        # Pydantic model dump -> kwargs
        # Note: We need to handle aliasing. patient_in has fields like 'firstName', 
        # but model expects 'first_name'. Pydantic v2 model_dump(by_alias=False) gives snake_case default names.
        data = patient_in.model_dump(exclude_unset=True)

        # Force conversion just in case
        if 'birth_date' in data and data['birth_date']:
             d = data['birth_date']
             from datetime import date, datetime, time
             if type(d) == date:  # Strict type check to catch pure date
                 data['birth_date'] = datetime.combine(d, time.min)
        
        # Manual overrides/handling
        
        # Manual overrides/handling
        tags = data.pop('tags', [])
        sgk_info = data.pop('sgk_info', {})
        
        # Handle address flat vs nested
        # Schema might have 'address' dict. Model expects address_city, etc.
        # But our Schema PatientCreate defines flat fields: address_city, address_district...
        # Wait, looked at schemas/patients.py, it uses AddressSchema for 'address' field?
        # Let's check schema again. Step 110 shows PatientCreate inherits PatientBase.
        # PatientBase has `first_name`, `last_name`, etc.
        # It has `address: Optional[AddressSchema]`.
        # Database has `address_city`, `address_district`, `address_full`.
        address_data = data.pop('address', None)
        
        if 'status' in data:
             from models.enums import PatientStatus as ModelPatientStatus
             # Convert schema status (lowercase) to model status (UPPERCASE)
             status_val = data['status']
             if isinstance(status_val, str) or isinstance(status_val, Enum):
                 # Handle Pydantic Enum or string
                 val_str = status_val.value if hasattr(status_val, 'value') else str(status_val)
                 data['status'] = ModelPatientStatus.from_legacy(val_str)

        # Handle Date -> DateTime conversion for SQLite
        if 'birth_date' in data and data['birth_date']:
            logger.info(f"Birthdate type before: {type(data['birth_date'])} value: {data['birth_date']}")
            from datetime import date as date_type, datetime as datetime_type
            if isinstance(data['birth_date'], date_type) and not isinstance(data['birth_date'], datetime_type):
                data['birth_date'] = datetime_type.combine(data['birth_date'], datetime_type.min.time())
            logger.info(f"Birthdate type after: {type(data['birth_date'])}")
        
        patient = Patient(tenant_id=access.tenant_id, **data)
        
        # Set JSON fields
        patient.tags_json = tags if tags else []
        patient.sgk_info_json = sgk_info if sgk_info else {'rightEarDevice': 'available', 'leftEarDevice': 'available'}
        
        # Set Address flattened
        if address_data:
            # address_data is a dict or object depending on model_dump
            patient.address_city = address_data.get('city')
            patient.address_district = address_data.get('district')
            patient.address_full = address_data.get('fullAddress') or address_data.get('address')
            
        # Defaults
        if not patient.status: 
             patient.status = 'ACTIVE'
        
        db.add(patient)
        db.commit()
        
        return ResponseEnvelope(data=patient.to_dict())
    except Exception as e:
        db.rollback()
        logger.error(f"Create patient error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patients/{patient_id}", response_model=ResponseEnvelope[PatientRead])
def get_patient(
    patient_id: str,
    access: UnifiedAccess = Depends(require_access("patients.view")),
    db: Session = Depends(get_db)
):
    """Get single patient"""
    patient = get_patient_or_404(db, patient_id, access)
    return ResponseEnvelope(data=patient.to_dict())

@router.put("/patients/{patient_id}", response_model=ResponseEnvelope[PatientRead])
def update_patient(
    patient_id: str,
    patient_in: PatientUpdate,
    access: UnifiedAccess = Depends(require_access("patients.edit")),
    db: Session = Depends(get_db)
):
    """Update patient"""
    patient = get_patient_or_404(db, patient_id, access)
    
    data = patient_in.model_dump(exclude_unset=True)
    
    # Handle complex fields same as create
    if 'tags' in data:
        patient.tags_json = data.pop('tags')
    
    if 'sgk_info' in data:
        patient.sgk_info_json = data.pop('sgk_info')
        
    if 'address' in data:
        addr = data.pop('address')
        if addr:
            patient.address_city = addr.get('city')
            patient.address_district = addr.get('district')
            patient.address_full = addr.get('fullAddress') or addr.get('address')

    for k, v in data.items():
        if hasattr(patient, k):
            setattr(patient, k, v)
            
    try:
        db.commit()
        return ResponseEnvelope(data=patient.to_dict())
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/patients/{patient_id}")
def delete_patient(
    patient_id: str,
    access: UnifiedAccess = Depends(require_access("patients.delete")),
    db: Session = Depends(get_db)
):
    """Delete patient"""
    patient = get_patient_or_404(db, patient_id, access)
    try:
        db.delete(patient)
        db.commit()
        return ResponseEnvelope(message="Patient deleted")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Endpoints moved to routers/patient_subresources.py and routers/sales.py

@router.get("/patients/count")
def count_patients(
    access: UnifiedAccess = Depends(require_access("patients.view")),
    db: Session = Depends(get_db),
    status: Optional[str] = None,
    segment: Optional[str] = None
):
    """Count patients"""
    if not access.tenant_id:
        return {"data": {"count": 0}}
        
    query = db.query(Patient).filter_by(tenant_id=access.tenant_id)
    # Filter valid phone
    query = query.filter(Patient.phone.isnot(None))
    
    if status:
        query = query.filter(Patient.status == status)
    if segment:
        query = query.filter(Patient.segment == segment)
        
    return ResponseEnvelope(data={'count': query.count()})
