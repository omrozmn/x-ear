"""
FastAPI Patient Subresources Router - Migrated from Flask routes/patient_subresources.py
Handles patient devices, hearing tests, notes, ereceipts, and appointments
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import logging

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from schemas.sales import DeviceAssignmentRead, SaleRead
from schemas.party_subresources import PartyNoteRead
from schemas.appointments import AppointmentRead
from middleware.unified_access import UnifiedAccess, require_access

logger = logging.getLogger(__name__)

router = APIRouter(tags=["PartySubresources"])

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

from services.party_service import PartyService

# --- Patient Devices ---

@router.get("/parties/{party_id}/devices", operation_id="listPartyDevices", response_model=ResponseEnvelope[List[DeviceAssignmentRead]])
def get_party_devices(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all devices assigned to a specific party"""
    try:
        service = PartyService(db)
        
        # Get devices
        devices = service.list_device_assignments(party_id, access.tenant_id)
        
        # Get party for meta info
        party = service.get_party(party_id, access.tenant_id)
        
        return ResponseEnvelope(
            data=devices,
            meta={
                'partyId': party_id,
                'partyName': f"{party.first_name} {party.last_name}",
                'deviceCount': len(devices)
            }
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting patient devices: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# --- Party Notes ---

@router.get("/parties/{party_id}/notes", operation_id="listPartyNotes", response_model=ResponseEnvelope[List[PartyNoteRead]])
def get_party_notes(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all notes for a party"""
    try:
        service = PartyService(db)
        notes = service.list_notes(party_id, access.tenant_id)
        
        # Convert to Pydantic schemas
        data = [PartyNoteRead.model_validate(note) for note in notes]
        
        return ResponseEnvelope(
            data=data,
            meta={'total': len(data)}
        )
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error getting party notes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parties/{party_id}/notes", operation_id="createPartyNotes", status_code=201, response_model=ResponseEnvelope[PartyNoteRead])
def create_party_note(
    party_id: str,
    request_data: PatientNoteCreate,
    request: Request,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new note for party"""
    try:
        service = PartyService(db)
        data = request_data.model_dump()
        
        # Extract metadata
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get('User-Agent', '')
        
        new_note = service.create_note(
            party_id=party_id,
            data=data,
            tenant_id=access.tenant_id,
            user_id=request_data.createdBy, # Preserving original behavior
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return ResponseEnvelope(data=PartyNoteRead.model_validate(new_note))
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error creating patient note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/parties/{party_id}/notes/{note_id}", operation_id="updatePartyNote", response_model=ResponseEnvelope[PartyNoteRead])
def update_party_note(
    party_id: str,
    note_id: str,
    request_data: PatientNoteUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Update a party note"""
    try:
        service = PartyService(db)
        data = request_data.model_dump(exclude_unset=True)
        updated_note = service.update_note(party_id, note_id, data, access.tenant_id)
        return ResponseEnvelope(data=PartyNoteRead.model_validate(updated_note))
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating patient note: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/parties/{party_id}/notes/{note_id}", operation_id="deletePartyNote", response_model=ResponseEnvelope)
def delete_party_note(
    party_id: str,
    note_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a party note"""
    try:
        service = PartyService(db)
        service.delete_note(party_id, note_id, access.tenant_id)
        return ResponseEnvelope(message='Note deleted successfully')
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error deleting patient note: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# --- Party Sales (Flask parity) ---

@router.get("/parties/{party_id}/sales", operation_id="listPartySales", response_model=ResponseEnvelope[List[SaleRead]])
def get_party_sales(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all sales for a specific party - Flask parity with _build_full_sale_data"""
    try:
        from core.models.party import Party
        from models.sales import Sale
        # Import the helper function from sales router
        from routers.sales import _build_full_sale_data
        
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        # Tenant check
        if access.tenant_id and party.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get all sales for this party - Order by sale_date DESC, then by id DESC for same-day sales
        sales = db.query(Sale).filter_by(party_id=party_id).order_by(Sale.sale_date.desc(), Sale.id.desc()).all()
        
        # Use the same helper function as /api/sales/{sale_id} for consistency
        sales_data = []
        for sale in sales:
            try:
                sale_dict = _build_full_sale_data(db, sale)
                sales_data.append(sale_dict)
            except Exception as e:
                logger.warning(f"Error building sale data for {sale.id}: {e}")
                # Fallback to basic sale data
                sales_data.append({
                    'id': sale.id,
                    'partyId': sale.party_id,
                    'status': sale.status,
                    'totalAmount': float(sale.total_amount or 0),
                    'error': 'Failed to load full details'
                })
        
        return ResponseEnvelope(
            data=sales_data,
            meta={
                'partyId': party_id,
                'partyName': f"{party.first_name} {party.last_name}",
                'salesCount': len(sales_data)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting party sales: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Party Appointments ---

@router.get("/parties/{party_id}/appointments", operation_id="listPartyAppointments", response_model=ResponseEnvelope[List[AppointmentRead]])
def get_party_appointments(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all appointments for a specific party"""
    try:
        from core.models.party import Party
        from models.appointment import Appointment
        
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        # Tenant check
        if access.tenant_id and party.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        appointments = db.query(Appointment).filter_by(
            party_id=party_id
        ).order_by(Appointment.date.desc()).all()
        
        return ResponseEnvelope(
            data=[AppointmentRead.model_validate(appt) for appt in appointments],
            meta={
                'total': len(appointments),
                'partyId': party_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient appointments: {e}")
        raise HTTPException(status_code=500, detail=str(e))
