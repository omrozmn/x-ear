"""Admin Patients Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import logging

from database import get_db
from models.patient import Patient
from models.tenant import Tenant
from models.sales import DeviceAssignment, Sale
from models.user import ActivityLog
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/patients", tags=["Admin Patients"])

# Response models
class PatientListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class PatientDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.get("", operation_id="listAdminPatients", response_model=PatientListResponse)
async def get_all_patients(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("patients.read", admin_only=True))
):
    """Get list of ALL patients from ALL tenants"""
    try:
        query = db.query(Patient)
        
        if search:
            query = query.filter(
                (Patient.first_name.ilike(f"%{search}%")) |
                (Patient.last_name.ilike(f"%{search}%")) |
                (Patient.tc_kimlik.ilike(f"%{search}%")) |
                (Patient.phone.ilike(f"%{search}%"))
            )
        
        total = query.count()
        patients = query.order_by(Patient.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        patients_list = []
        for p in patients:
            p_dict = p.to_dict()
            if p.tenant_id:
                tenant = db.get(Tenant, p.tenant_id)
                if tenant:
                    p_dict["tenant_name"] = tenant.name
            patients_list.append(p_dict)
        
        return {
            "success": True,
            "data": {
                "patients": patients_list,
                "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
            }
        }
    except Exception as e:
        logger.error(f"Get all patients error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{patient_id}", operation_id="getAdminPatient", response_model=PatientDetailResponse)
async def get_patient_detail(
    patient_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("patients.read", admin_only=True))
):
    """Get single patient detail"""
    try:
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        patient_dict = patient.to_dict()
        if patient.tenant_id:
            tenant = db.get(Tenant, patient.tenant_id)
            if tenant:
                patient_dict["tenant_name"] = tenant.name
        return {"success": True, "data": patient_dict}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{patient_id}/devices", operation_id="listAdminPatientDevices", response_model=ResponseEnvelope)
async def get_patient_devices(
    patient_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("patients.read", admin_only=True))
):
    """Get devices for a patient"""
    try:
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        devices = db.query(DeviceAssignment).filter(DeviceAssignment.patient_id == patient_id).all()
        return {"success": True, "data": {"devices": [d.to_dict() for d in devices]}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient devices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{patient_id}/sales", operation_id="listAdminPatientSales", response_model=ResponseEnvelope)
async def get_patient_sales(
    patient_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("patients.read", admin_only=True))
):
    """Get sales for a patient"""
    try:
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        sales = db.query(Sale).filter(Sale.patient_id == patient_id).all()
        return {"success": True, "data": {"sales": [s.to_dict() for s in sales]}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient sales error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{patient_id}/timeline", operation_id="listAdminPatientTimeline", response_model=ResponseEnvelope)
async def get_patient_timeline(
    patient_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("patients.read", admin_only=True))
):
    """Get timeline/activity log for a patient"""
    try:
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        activities = db.query(ActivityLog).filter(
            ActivityLog.entity_id == patient_id
        ).order_by(ActivityLog.created_at.desc()).all()
        return {"success": True, "data": {"timeline": [a.to_dict() for a in activities]}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient timeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{patient_id}/documents", operation_id="listAdminPatientDocuments", response_model=ResponseEnvelope)
async def get_patient_documents(
    patient_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("patients.read", admin_only=True))
):
    """Get documents for a patient"""
    try:
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Get documents from patient's custom_data if available
        documents = []
        if hasattr(patient, 'custom_data_json') and patient.custom_data_json:
            documents = patient.custom_data_json.get('documents', [])
        
        # Also try to get from Document model if exists
        try:
            from models.document import Document
            doc_records = db.query(Document).filter(Document.patient_id == patient_id).all()
            documents.extend([d.to_dict() for d in doc_records])
        except Exception:
            pass
        
        return {"success": True, "data": {"documents": documents}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
