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
from schemas.sales import DeviceAssignmentRead, SaleRead, PaymentPlanRead, PaymentRecordRead
from schemas.party_subresources import PartyNoteRead
from schemas.appointments import AppointmentRead
from schemas.invoices import InvoiceRead
from middleware.unified_access import UnifiedAccess, require_access, require_admin

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
from services.hearing_profile_service import HearingProfileService

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
    """Get all sales for a specific party - Flask parity"""
    try:
        from core.models.party import Party
        from models.sales import Sale, DeviceAssignment, PaymentRecord, PaymentPlan
        from models.inventory import InventoryItem
        from models.invoice import Invoice
        
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        # Tenant check
        if access.tenant_id and party.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get all sales for this party
        sales = db.query(Sale).filter_by(party_id=party_id).order_by(Sale.sale_date.desc()).all()
        
        sales_data = []
        for sale in sales:
            sale_dict = SaleRead.model_validate(sale).model_dump(by_alias=True)
            
            # === Flask parity: Get device assignments (new method first, then legacy) ===
            assignments = db.query(DeviceAssignment).filter_by(sale_id=sale.id).all()
            
            # Legacy fallback if no assignments found by sale_id
            if not assignments:
                linked_ids = [
                    getattr(sale, 'right_ear_assignment_id', None),
                    getattr(sale, 'left_ear_assignment_id', None)
                ]
                linked_ids = [lid for lid in linked_ids if lid]
                if linked_ids:
                    assignments = db.query(DeviceAssignment).filter(DeviceAssignment.id.in_(linked_ids)).all()
            
            # Add devices from assignments
            devices = []
            for assignment in assignments:
                # Get inventory item details if available
                inventory_item = None
                if assignment.inventory_id:
                    inventory_item = db.get(InventoryItem, assignment.inventory_id)
                
                # Build device info with inventory details
                if inventory_item:
                    device_name = f"{inventory_item.brand} {inventory_item.model}"
                    brand = inventory_item.brand
                    model = inventory_item.model
                    barcode = inventory_item.barcode
                else:
                    # Fallback for manual/loaner devices
                    device_name = f"{assignment.loaner_brand or 'Unknown'} {assignment.loaner_model or 'Device'}".strip()
                    brand = assignment.loaner_brand or ''
                    model = assignment.loaner_model or ''
                    barcode = None
                
                device_info = {
                    'id': assignment.inventory_id or assignment.device_id,
                    'name': device_name,
                    'brand': brand,
                    'model': model,
                    'serialNumber': assignment.serial_number or assignment.serial_number_left or assignment.serial_number_right,
                    'barcode': barcode,
                    'ear': assignment.ear,
                    'listPrice': float(assignment.list_price) if assignment.list_price else None,
                    'salePrice': float(assignment.sale_price) if assignment.sale_price else None,
                    'sgkCoverageAmount': float(assignment.sgk_support) if assignment.sgk_support else 0.0,
                    'patientResponsibleAmount': float(assignment.net_payable) if assignment.net_payable else None,
                    # Legacy frontend support
                    'sgkReduction': float(assignment.sgk_support) if assignment.sgk_support else 0.0,
                    'patientPayment': float(assignment.net_payable) if assignment.net_payable else None
                }
                devices.append(device_info)
            
            sale_dict['devices'] = devices
            
            # === Flask parity: Add payment plan ===
            payment_plan = db.query(PaymentPlan).filter_by(sale_id=sale.id).first()
            if payment_plan:
                sale_dict['paymentPlan'] = PaymentPlanRead.model_validate(payment_plan).model_dump(by_alias=True)
            else:
                sale_dict['paymentPlan'] = None
            
            # Add payment records
            payment_records = []
            payments = db.query(PaymentRecord).filter_by(sale_id=sale.id).order_by(PaymentRecord.payment_date.desc()).all()
            for payment in payments:
                payment_records.append(PaymentRecordRead.model_validate(payment).model_dump(by_alias=True))
            
            sale_dict['paymentRecords'] = payment_records
            
            # === Flask parity: Add invoice ===
            invoice = db.query(Invoice).filter_by(sale_id=sale.id).first()
            if invoice:
                sale_dict['invoice'] = InvoiceRead.model_validate(invoice).model_dump(by_alias=True)
            else:
                sale_dict['invoice'] = None
            
            # === Flask parity: SGK coverage recalculation if zero ===
            sgk_coverage_value = float(sale.sgk_coverage) if sale.sgk_coverage else 0.0
            if abs(sgk_coverage_value) < 0.01 and assignments:
                # Recalculate from assignments
                total_sgk = sum(float(a.sgk_support or 0) for a in assignments)
                sgk_coverage_value = total_sgk
            sale_dict['sgkCoverage'] = sgk_coverage_value
            
            sales_data.append(sale_dict)
        
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
