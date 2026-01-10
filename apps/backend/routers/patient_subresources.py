"""
FastAPI Patient Subresources Router - Migrated from Flask routes/patient_subresources.py
Handles patient devices, hearing tests, notes, ereceipts, and appointments
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import logging
import uuid
import json

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from schemas.sales import DeviceAssignmentRead
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["PatientSubresources"])

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

# --- Schemas ---

class HearingTestCreate(BaseModel):
    testDate: str
    audiologist: Optional[str] = None
    audiogramData: Optional[dict] = None

class HearingTestUpdate(BaseModel):
    testDate: Optional[str] = None
    audiologist: Optional[str] = None
    audiogramData: Optional[dict] = None

class PatientNoteCreate(BaseModel):
    content: str
    type: str = "genel"
    category: str = "general"
    isPrivate: bool = False
    createdBy: str = "system"

class PatientNoteUpdate(BaseModel):
    content: Optional[str] = None
    title: Optional[str] = None
    noteType: Optional[str] = None
    category: Optional[str] = None
    isPrivate: Optional[bool] = None
    tags: Optional[List[str]] = None

class EReceiptCreate(BaseModel):
    sgkReportId: Optional[str] = None
    number: Optional[str] = None
    doctorName: Optional[str] = None
    date: Optional[str] = None
    materials: Optional[List[dict]] = None
    status: str = "pending"

class EReceiptUpdate(BaseModel):
    materials: Optional[List[dict]] = None
    status: Optional[str] = None
    doctorName: Optional[str] = None

# --- Patient Devices ---

@router.get("/patients/{patient_id}/devices", operation_id="listPatientDevices", response_model=ResponseEnvelope[List[DeviceAssignmentRead]])
def get_patient_devices(
    patient_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all devices assigned to a specific patient"""
    try:
        from models.patient import Patient
        from models.sales import DeviceAssignment
        from models.device import Device
        from models.inventory import InventoryItem
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get all device assignments for this patient, ordered by created_at descending (newest first)
        assignments = db.query(DeviceAssignment).filter_by(patient_id=patient_id).order_by(DeviceAssignment.created_at.desc()).all()
        
        # Map assignments to the structure expected by frontend
        mapped_devices = []
        for assignment in assignments:
            # Get full dict from model - this includes createdAt, assignedDate, sgkScheme, paymentMethod, etc.
            d = assignment.to_dict() if hasattr(assignment, 'to_dict') else {}
            
            # Hydrate with details from linked Device or Inventory
            brand = d.get('brand')
            model = d.get('model')
            serial = d.get('serialNumber')
            barcode = d.get('barcode')
            
            if not brand or not model:
                # Try to find linked device
                if assignment.device_id:
                    device = db.get(Device, assignment.device_id)
                    if device:
                        brand = brand or device.brand
                        model = model or device.model
                        serial = serial or device.serial_number
                        barcode = barcode or getattr(device, 'barcode', None)
                
                # Try to find linked inventory
                if (not brand or not model) and assignment.inventory_id:
                    inv = db.get(InventoryItem, assignment.inventory_id)
                    if inv:
                        brand = brand or inv.brand
                        model = model or inv.model
                        serial = serial or inv.serial_number
                        barcode = barcode or inv.barcode
            
            # Merge enriched data with original dict (original dict has priority for existing fields)
            enriched = {
                'brand': brand or 'Bilinmiyor',
                'model': model or 'Bilinmiyor',
                'serialNumber': serial,
                'barcode': barcode,
                'status': d.get('status', 'assigned'),
                'type': d.get('deviceType', 'hearing_aid'),
            }
            
            # Merge: original dict values take priority, enriched fills in missing
            final_device = {**enriched, **d}
            mapped_devices.append(final_device)
        
        return ResponseEnvelope(
            data=mapped_devices,
            meta={
                'patientId': patient_id,
                'patientName': f"{patient.first_name} {patient.last_name}",
                'deviceCount': len(mapped_devices)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Hearing Tests ---

@router.get("/patients/{patient_id}/hearing-tests", operation_id="listPatientHearingTests")
def get_patient_hearing_tests(
    patient_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all hearing tests for a patient"""
    try:
        from models.patient import Patient
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        hearing_tests = [test.to_dict() for test in patient.hearing_tests]
        
        return ResponseEnvelope(
            data=hearing_tests,
            meta={'total': len(hearing_tests)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting hearing tests: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patients/{patient_id}/hearing-tests", operation_id="createPatientHearingTests", status_code=201)
def add_patient_hearing_test(
    patient_id: str,
    request_data: HearingTestCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Add a new hearing test to patient"""
    try:
        from models.patient import Patient
        from models.medical import HearingTest
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        new_test = HearingTest(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            test_date=datetime.fromisoformat(request_data.testDate),
            audiologist=request_data.audiologist,
            audiogram_data=json.dumps(request_data.audiogramData) if request_data.audiogramData else None
        )
        db.add(new_test)
        db.commit()
        
        return ResponseEnvelope(data=new_test.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding hearing test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/patients/{patient_id}/hearing-tests/{test_id}", operation_id="updatePatientHearingTest")
def update_patient_hearing_test(
    patient_id: str,
    test_id: str,
    request_data: HearingTestUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update a hearing test"""
    try:
        from models.patient import Patient
        from models.medical import HearingTest
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        hearing_test = db.query(HearingTest).filter_by(id=test_id, patient_id=patient_id).first()
        if not hearing_test:
            raise HTTPException(status_code=404, detail="Hearing test not found")
        
        if request_data.testDate:
            hearing_test.test_date = datetime.fromisoformat(request_data.testDate)
        if request_data.audiologist is not None:
            hearing_test.audiologist = request_data.audiologist
        if request_data.audiogramData is not None:
            hearing_test.audiogram_data = json.dumps(request_data.audiogramData)
        
        hearing_test.updated_at = now_utc()
        db.commit()
        
        return ResponseEnvelope(data=hearing_test.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating hearing test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/patients/{patient_id}/hearing-tests/{test_id}", operation_id="deletePatientHearingTest")
def delete_patient_hearing_test(
    patient_id: str,
    test_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a hearing test"""
    try:
        from models.patient import Patient
        from models.medical import HearingTest
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        hearing_test = db.query(HearingTest).filter_by(id=test_id, patient_id=patient_id).first()
        if not hearing_test:
            raise HTTPException(status_code=404, detail="Hearing test not found")
        
        db.delete(hearing_test)
        db.commit()
        
        return ResponseEnvelope(message='Hearing test deleted successfully')
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting hearing test: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Patient Notes ---

@router.get("/patients/{patient_id}/notes", operation_id="listPatientNotes")
def get_patient_notes(
    patient_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all notes for a patient"""
    try:
        from models.patient import Patient
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        notes = [note.to_dict() for note in patient.notes]
        
        return ResponseEnvelope(
            data=notes,
            meta={'total': len(notes)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patients/{patient_id}/notes", operation_id="createPatientNotes", status_code=201)
def create_patient_note(
    patient_id: str,
    request_data: PatientNoteCreate,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new note for patient"""
    try:
        from models.patient import Patient
        from models.medical import PatientNote
        from models.user import ActivityLog
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        new_note = PatientNote(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            tenant_id=patient.tenant_id,
            author_id=request_data.createdBy,
            note_type=request_data.type,
            category=request_data.category,
            title=request_data.type,
            content=request_data.content,
            is_private=request_data.isPrivate
        )
        db.add(new_note)
        db.commit()
        
        # Create Activity Log
        try:
            activity_log = ActivityLog(
                user_id=request_data.createdBy,
                action='note_created',
                entity_type='patient',
                entity_id=patient_id,
                details=f"Note created: {new_note.content[:50]}{'...' if len(new_note.content) > 50 else ''}",
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get('User-Agent', ''),
                tenant_id=access.tenant_id
            )
            db.add(activity_log)
            db.commit()
        except Exception as log_error:
            logger.error(f"Failed to create activity log: {log_error}")
        
        return ResponseEnvelope(data=new_note.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating patient note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/patients/{patient_id}/notes/{note_id}", operation_id="updatePatientNote")
def update_patient_note(
    patient_id: str,
    note_id: str,
    request_data: PatientNoteUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update a patient note"""
    try:
        from models.patient import Patient
        from models.medical import PatientNote
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        note = db.query(PatientNote).filter_by(id=note_id, patient_id=patient_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        if request_data.content is not None:
            note.content = request_data.content
        if request_data.title is not None:
            note.title = request_data.title
        if request_data.noteType is not None:
            note.note_type = request_data.noteType
        if request_data.category is not None:
            note.category = request_data.category
        if request_data.isPrivate is not None:
            note.is_private = request_data.isPrivate
        if request_data.tags is not None:
            note.tags = json.dumps(request_data.tags)
        
        note.updated_at = now_utc()
        db.commit()
        
        return ResponseEnvelope(data=note.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating patient note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/patients/{patient_id}/notes/{note_id}", operation_id="deletePatientNote")
def delete_patient_note(
    patient_id: str,
    note_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a patient note"""
    try:
        from models.patient import Patient
        from models.medical import PatientNote
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        note = db.query(PatientNote).filter_by(id=note_id, patient_id=patient_id).first()
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")
        
        db.delete(note)
        db.commit()
        
        return ResponseEnvelope(message='Note deleted successfully')
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting patient note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- E-Receipts ---

@router.get("/patients/{patient_id}/ereceipts", operation_id="listPatientEreceipts")
def get_patient_ereceipts(
    patient_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all e-receipts for a patient"""
    try:
        from models.patient import Patient
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        ereceipts = [receipt.to_dict() for receipt in patient.ereceipts]
        
        return ResponseEnvelope(
            data=ereceipts,
            meta={'total': len(ereceipts)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting e-receipts: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patients/{patient_id}/ereceipts", operation_id="createPatientEreceipts", status_code=201)
def create_patient_ereceipt(
    patient_id: str,
    request_data: EReceiptCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new e-receipt for patient"""
    try:
        from models.patient import Patient
        from models.medical import EReceipt
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        new_ereceipt = EReceipt(
            id=str(uuid.uuid4()),
            patient_id=patient_id,
            sgk_report_id=request_data.sgkReportId,
            receipt_number=request_data.number,
            doctor_name=request_data.doctorName,
            issue_date=datetime.fromisoformat(request_data.date) if request_data.date else now_utc(),
            materials=json.dumps(request_data.materials or []),
            status=request_data.status
        )
        db.add(new_ereceipt)
        db.commit()
        
        return ResponseEnvelope(data=new_ereceipt.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating e-receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/patients/{patient_id}/ereceipts/{ereceipt_id}", operation_id="updatePatientEreceipt")
def update_patient_ereceipt(
    patient_id: str,
    ereceipt_id: str,
    request_data: EReceiptUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update an e-receipt"""
    try:
        from models.patient import Patient
        from models.medical import EReceipt
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        ereceipt = db.query(EReceipt).filter_by(id=ereceipt_id, patient_id=patient_id).first()
        if not ereceipt:
            raise HTTPException(status_code=404, detail="E-receipt not found")
        
        if request_data.materials is not None:
            ereceipt.materials = json.dumps(request_data.materials)
        if request_data.status is not None:
            ereceipt.status = request_data.status
        if request_data.doctorName is not None:
            ereceipt.doctor_name = request_data.doctorName
        
        ereceipt.updated_at = now_utc()
        db.commit()
        
        return ResponseEnvelope(data=ereceipt.to_dict())
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating e-receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/patients/{patient_id}/ereceipts/{ereceipt_id}", operation_id="deletePatientEreceipt")
def delete_patient_ereceipt(
    patient_id: str,
    ereceipt_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete an e-receipt"""
    try:
        from models.patient import Patient
        from models.medical import EReceipt
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        ereceipt = db.query(EReceipt).filter_by(id=ereceipt_id, patient_id=patient_id).first()
        if not ereceipt:
            raise HTTPException(status_code=404, detail="E-receipt not found")
        
        db.delete(ereceipt)
        db.commit()
        
        return ResponseEnvelope(message='E-receipt deleted successfully')
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting e-receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Patient Appointments ---

@router.get("/patients/{patient_id}/appointments", operation_id="listPatientAppointments")
def get_patient_appointments(
    patient_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all appointments for a specific patient"""
    try:
        from models.patient import Patient
        from models.appointment import Appointment
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        appointments = db.query(Appointment).filter_by(
            patient_id=patient_id
        ).order_by(Appointment.date.desc()).all()
        
        return ResponseEnvelope(
            data=[appt.to_dict() for appt in appointments],
            meta={
                'total': len(appointments),
                'patientId': patient_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))
