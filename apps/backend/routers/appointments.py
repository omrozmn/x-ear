"""
FastAPI Appointments Router - Migrated from Flask routes/appointments.py
Handles appointment CRUD, scheduling, availability
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel, Field
import logging

from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope, ResponseMeta, ApiError
from schemas.appointments import AppointmentRead
from models.appointment import Appointment
from models.enums import AppointmentStatus
from models.patient import Patient
from models.tenant import Tenant


logger = logging.getLogger(__name__)

router = APIRouter(tags=["Appointments"])

# --- Request Schemas ---

class AppointmentCreate(BaseModel):
    patient_id: str = Field(..., alias="patientId")
    clinician_id: Optional[str] = Field(None, alias="clinicianId")
    branch_id: Optional[str] = Field(None, alias="branchId")
    date: str
    time: str
    duration: int = 30
    type: str = "consultation"
    status: str = "scheduled"
    notes: Optional[str] = None

class AppointmentUpdate(BaseModel):
    date: Optional[str] = None
    time: Optional[str] = None
    duration: Optional[int] = None
    type: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    clinician_id: Optional[str] = Field(None, alias="clinicianId")
    branch_id: Optional[str] = Field(None, alias="branchId")

class RescheduleRequest(BaseModel):
    date: str
    time: str

# --- Helper Functions ---

def get_appointment_or_404(db_session: Session, appointment_id: str, access: UnifiedAccess) -> Appointment:
    """Get appointment or raise 404"""
    appointment = db_session.get(Appointment, appointment_id)
    if not appointment:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Appointment not found", code="APPOINTMENT_NOT_FOUND").model_dump(mode="json")
        )
    if access.tenant_id and appointment.tenant_id != access.tenant_id:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Appointment not found", code="APPOINTMENT_NOT_FOUND").model_dump(mode="json")
        )
    return appointment

def parse_date(date_str: str) -> datetime:
    """Parse date string to datetime"""
    if 'T' in date_str:
        date_str = date_str.split('T')[0]
    return datetime.strptime(date_str, '%Y-%m-%d')

# --- Routes ---

@router.get("/appointments", operation_id="listAppointments", response_model=ResponseEnvelope[List[AppointmentRead]])
def get_appointments(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    patient_id: Optional[str] = Query(None, alias="patient_id"),
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get appointments with filtering and pagination"""
    try:
        query = db_session.query(Appointment)
        
        # Tenant scope
        if access.tenant_id:
            query = query.filter_by(tenant_id=access.tenant_id)
        
        # Date filters
        if start_date:
            start_dt = datetime.fromisoformat(start_date) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Appointment.date >= start_dt)
        
        if end_date:
            if 'T' in end_date:
                end_dt = datetime.fromisoformat(end_date)
            else:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1) - timedelta(microseconds=1)
            query = query.filter(Appointment.date <= end_dt)
        
        # Other filters
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        if status:
            try:
                status_enum = AppointmentStatus.from_legacy(status) if isinstance(status, str) else status
                query = query.filter_by(status=status_enum)
            except (ValueError, AttributeError):
                pass
        
        query = query.order_by(Appointment.date)
        
        # Pagination
        total = query.count()
        appointments = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return ResponseEnvelope(
            data=[apt.to_dict() for apt in appointments],
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page,
                "tenantScope": access.tenant_id
            }
        )
    except Exception as e:
        logger.error(f"Get appointments error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/appointments", operation_id="createAppointments", status_code=201, response_model=ResponseEnvelope[AppointmentRead])
def create_appointment(
    appointment_in: AppointmentCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Create a new appointment"""
    try:
        data = appointment_in.model_dump(by_alias=False)
        
        # Generate ID
        appointment_id = f"apt_{datetime.now().strftime('%d%m%Y_%H%M%S')}_{str(hash(data['patient_id']))[-6:]}"
        
        appointment = Appointment()
        appointment.id = appointment_id
        appointment.patient_id = data['patient_id']
        appointment.clinician_id = data.get('clinician_id')
        appointment.branch_id = data.get('branch_id')
        
        # Handle access.tenant_id
        if access.tenant_id:
            appointment.tenant_id = access.tenant_id
        else:
            patient = db_session.get(Patient, data['patient_id'])
            if patient and patient.tenant_id:
                appointment.tenant_id = patient.tenant_id
            else:
                tenant = db_session.query(Tenant).first()
                if tenant:
                    appointment.tenant_id = tenant.id
                else:
                    raise HTTPException(
                        status_code=400,
                        detail=ApiError(message="Tenant not found", code="TENANT_REQUIRED").model_dump(mode="json")
                    )
        
        # Parse date
        appointment.date = parse_date(data['date'])
        appointment.time = data['time']
        appointment.duration = data.get('duration', 30)
        appointment.appointment_type = data.get('type', 'consultation')
        
        # Handle status
        status_value = data.get('status', 'scheduled')
        if isinstance(status_value, str):
            status_value = status_value.upper()
            appointment.status = AppointmentStatus.from_legacy(status_value)
        else:
            appointment.status = status_value or AppointmentStatus.SCHEDULED
        
        appointment.notes = data.get('notes')
        
        db_session.add(appointment)
        db_session.commit()
        
        logger.info(f"Appointment created: {appointment.id}")
        
        return ResponseEnvelope(data=appointment.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create appointment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/appointments/{appointment_id}", operation_id="getAppointment", response_model=ResponseEnvelope[AppointmentRead])
def get_appointment(
    appointment_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get a single appointment"""
    appointment = get_appointment_or_404(db_session, appointment_id, ctx)
    return ResponseEnvelope(data=appointment.to_dict())

@router.put("/appointments/{appointment_id}", operation_id="updateAppointment", response_model=ResponseEnvelope[AppointmentRead])
def update_appointment(
    appointment_id: str,
    appointment_in: AppointmentUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update appointment"""
    try:
        appointment = get_appointment_or_404(db_session, appointment_id, ctx)
        data = appointment_in.model_dump(exclude_unset=True, by_alias=False)
        
        if 'date' in data and data['date']:
            appointment.date = parse_date(data['date'])
        if 'time' in data:
            appointment.time = data['time']
        if 'duration' in data:
            appointment.duration = data['duration']
        if 'type' in data:
            appointment.appointment_type = data['type']
        if 'status' in data:
            appointment.status = data['status']
        if 'notes' in data:
            appointment.notes = data['notes']
        if 'clinician_id' in data:
            appointment.clinician_id = data['clinician_id']
        if 'branch_id' in data:
            appointment.branch_id = data['branch_id']
        
        db_session.commit()
        return ResponseEnvelope(data=appointment.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update appointment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/appointments/{appointment_id}", operation_id="deleteAppointment")
def delete_appointment(
    appointment_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Delete an appointment"""
    try:
        appointment = get_appointment_or_404(db_session, appointment_id, ctx)
        db_session.delete(appointment)
        db_session.commit()
        return ResponseEnvelope(message="Appointment deleted")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete appointment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/appointments/{appointment_id}/reschedule", operation_id="createAppointmentReschedule", response_model=ResponseEnvelope[AppointmentRead])
def reschedule_appointment(
    appointment_id: str,
    reschedule_data: RescheduleRequest,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Reschedule an appointment"""
    try:
        appointment = get_appointment_or_404(db_session, appointment_id, ctx)
        
        appointment.date = parse_date(reschedule_data.date)
        appointment.time = reschedule_data.time
        appointment.status = 'rescheduled'
        
        db_session.commit()
        return ResponseEnvelope(data=appointment.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Reschedule appointment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/appointments/{appointment_id}/cancel", operation_id="createAppointmentCancel", response_model=ResponseEnvelope[AppointmentRead])
def cancel_appointment(
    appointment_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Cancel an appointment"""
    try:
        appointment = get_appointment_or_404(db_session, appointment_id, ctx)
        appointment.status = 'cancelled'
        db_session.commit()
        return ResponseEnvelope(data=appointment.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Cancel appointment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/appointments/{appointment_id}/complete", operation_id="createAppointmentComplete", response_model=ResponseEnvelope[AppointmentRead])
def complete_appointment(
    appointment_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Mark appointment as completed"""
    try:
        appointment = get_appointment_or_404(db_session, appointment_id, ctx)
        appointment.status = AppointmentStatus.COMPLETED
        db_session.commit()
        return ResponseEnvelope(data=appointment.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Complete appointment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/appointments/availability", operation_id="listAppointmentAvailability")
def get_availability(
    date: str,
    duration: int = Query(30, ge=15, le=120),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get available time slots for a date"""
    try:
        target_date = datetime.fromisoformat(date).date()
        
        query = db_session.query(Appointment).filter(
            db.func.date(Appointment.date) == target_date,
            Appointment.status.in_(['scheduled', 'confirmed'])
        )
        
        if access.tenant_id:
            query = query.filter_by(tenant_id=access.tenant_id)
        
        appointments = query.all()
        
        # Generate time slots (9:00 - 18:00, 30 min intervals)
        time_slots = [f"{hour:02d}:{minute:02d}" for hour in range(9, 18) for minute in [0, 30]]
        
        # Calculate occupied slots
        occupied_slots = set()
        for apt in appointments:
            apt_hour, apt_minute = map(int, apt.time.split(':'))
            current_minute = apt_hour * 60 + apt_minute
            end_minute = current_minute + apt.duration
            
            slot_minute = 9 * 60
            while slot_minute < 18 * 60:
                slot_end_minute = slot_minute + 30
                if current_minute < slot_end_minute and end_minute > slot_minute:
                    slot_hour = slot_minute // 60
                    slot_min = slot_minute % 60
                    occupied_slots.add(f"{slot_hour:02d}:{slot_min:02d}")
                slot_minute += 30
        
        available_slots = [slot for slot in time_slots if slot not in occupied_slots]
        
        return ResponseEnvelope(
            data={
                "availableSlots": available_slots,
                "occupiedSlots": list(occupied_slots),
                "date": date
            }
        )
    except Exception as e:
        logger.error(f"Get availability error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/appointments/list", operation_id="listAppointmentList", response_model=ResponseEnvelope[List[AppointmentRead]])
def list_appointments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    patient_id: Optional[str] = Query(None, alias="patient_id"),
    status: Optional[str] = None,
    start_date: Optional[str] = Query(None, alias="start_date"),
    end_date: Optional[str] = Query(None, alias="end_date"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """List appointments with filters"""
    try:
        query = db_session.query(Appointment)
        
        if access.tenant_id:
            query = query.filter_by(tenant_id=access.tenant_id)
        
        if patient_id:
            query = query.filter_by(patient_id=patient_id)
        
        if status:
            query = query.filter_by(status=status)
        
        if start_date:
            start_dt = datetime.fromisoformat(start_date) if 'T' in start_date else datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(Appointment.date >= start_dt)
        
        if end_date:
            if 'T' in end_date:
                end_dt = datetime.fromisoformat(end_date)
            else:
                end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1) - timedelta(microseconds=1)
            query = query.filter(Appointment.date <= end_dt)
        
        total = query.count()
        appointments = query.order_by(Appointment.date.desc()).offset((page - 1) * per_page).limit(per_page).all()
        
        return ResponseEnvelope(
            data=[apt.to_dict() for apt in appointments],
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"List appointments error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
