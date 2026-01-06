"""
FastAPI Payments Router - Migrated from Flask routes/payments.py
Payment records and promissory notes management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
import logging

from sqlalchemy.orm import Session

from schemas.base import ResponseEnvelope, ApiError

from models.sales import Sale, PaymentRecord
from models.promissory_note import PromissoryNote
from models.patient import Patient
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Payments"])

# --- Helper Functions ---

def tenant_scoped_query(access: UnifiedAccess, model, session: Session):
    """Apply tenant scoping to query"""
    query = session.query(model)
    if access.tenant_id:
        query = query.filter_by(tenant_id=access.tenant_id)
    return query

def get_or_404_scoped(session: Session, access: UnifiedAccess, model, record_id: str):
    """Get record with tenant scoping or raise 404"""
    record = session.get(model, record_id)
    if not record:
        return None
    if access.tenant_id and hasattr(record, 'tenant_id') and record.tenant_id != access.tenant_id:
        return None
    return record

# --- Request Schemas ---

class PaymentRecordCreate(BaseModel):
    patient_id: str = Field(..., alias="patientId")
    sale_id: Optional[str] = Field(None, alias="saleId")
    promissory_note_id: Optional[str] = Field(None, alias="promissoryNoteId")
    amount: float
    payment_method: str = Field(..., alias="paymentMethod")
    payment_type: str = Field("payment", alias="paymentType")
    payment_date: Optional[str] = Field(None, alias="paymentDate")
    due_date: Optional[str] = Field(None, alias="dueDate")
    reference_number: Optional[str] = Field(None, alias="referenceNumber")
    notes: Optional[str] = None
    branch_id: Optional[str] = Field(None, alias="branchId")
    tenant_id: Optional[str] = Field(None, alias="tenantId")

class PaymentRecordUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    paid_date: Optional[str] = Field(None, alias="paidDate")

class PromissoryNoteData(BaseModel):
    note_number: int = Field(..., alias="noteNumber")
    amount: float
    issue_date: str = Field(..., alias="issueDate")
    due_date: str = Field(..., alias="dueDate")
    debtor_name: str = Field(..., alias="debtorName")
    debtor_tc: Optional[str] = Field(None, alias="debtorTc")
    debtor_address: Optional[str] = Field(None, alias="debtorAddress")
    debtor_tax_office: Optional[str] = Field(None, alias="debtorTaxOffice")
    debtor_phone: Optional[str] = Field(None, alias="debtorPhone")
    has_guarantor: bool = Field(False, alias="hasGuarantor")
    guarantor_name: Optional[str] = Field(None, alias="guarantorName")
    guarantor_tc: Optional[str] = Field(None, alias="guarantorTc")
    guarantor_address: Optional[str] = Field(None, alias="guarantorAddress")
    guarantor_phone: Optional[str] = Field(None, alias="guarantorPhone")
    authorized_court: str = Field("İstanbul (Çağlayan)", alias="authorizedCourt")
    document_id: Optional[str] = Field(None, alias="documentId")
    file_name: Optional[str] = Field(None, alias="fileName")
    notes: Optional[str] = None

class PromissoryNotesCreate(BaseModel):
    patient_id: str = Field(..., alias="patientId")
    sale_id: Optional[str] = Field(None, alias="saleId")
    total_amount: Optional[float] = Field(None, alias="totalAmount")
    notes: List[PromissoryNoteData]
    tenant_id: Optional[str] = Field(None, alias="tenantId")

class PromissoryNoteUpdate(BaseModel):
    status: Optional[str] = None
    paid_date: Optional[str] = Field(None, alias="paidDate")
    notes: Optional[str] = None

class CollectPaymentRequest(BaseModel):
    amount: float
    payment_method: str = Field("cash", alias="paymentMethod")
    payment_date: Optional[str] = Field(None, alias="paymentDate")
    reference_number: Optional[str] = Field(None, alias="referenceNumber")
    notes: Optional[str] = None

# --- Routes ---

@router.post("/payment-records", status_code=201)
def create_payment_record(
    payment_in: PaymentRecordCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Create a new payment record"""
    try:
        access.tenant_id = access.tenant_id or payment_in.tenant_id
        if not access.tenant_id:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="access.tenant_id is required", code="TENANT_REQUIRED").model_dump(mode="json")
            )
        
        payment = PaymentRecord()
        payment.tenant_id = access.tenant_id
        payment.branch_id = payment_in.branch_id
        payment.patient_id = payment_in.patient_id
        payment.sale_id = payment_in.sale_id
        payment.promissory_note_id = payment_in.promissory_note_id
        payment.amount = float(payment_in.amount)
        
        payment_date = payment_in.payment_date or datetime.now().isoformat()
        payment.payment_date = datetime.fromisoformat(payment_date.replace('Z', '+00:00'))
        
        if payment_in.due_date:
            payment.due_date = datetime.fromisoformat(payment_in.due_date.replace('Z', '+00:00'))
        
        payment.payment_method = payment_in.payment_method
        payment.payment_type = payment_in.payment_type
        payment.status = 'paid'
        payment.reference_number = payment_in.reference_number
        payment.notes = payment_in.notes
        
        db_session.add(payment)
        
        # Update sale if sale_id is provided
        if payment.sale_id:
            sale = db_session.query(Sale).filter_by(id=payment.sale_id).first()
            if sale:
                existing_payments = db_session.query(PaymentRecord).filter_by(
                    sale_id=payment.sale_id,
                    status='paid'
                ).all()
                total_paid = sum(float(p.amount) for p in existing_payments) + float(payment.amount)
                
                sale.paid_amount = Decimal(str(total_paid))
                
                sale_total = float(sale.total_amount or sale.final_amount or 0)
                if total_paid >= sale_total - 0.01:
                    sale.status = 'paid'
                elif total_paid > 0:
                    sale.status = 'partial'
                
                db_session.add(sale)
        
        db_session.commit()
        logger.info(f"Payment record created: {payment.id}")
        
        return ResponseEnvelope(data=payment.to_dict(), message="Payment record created successfully")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create payment record error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patients/{patient_id}/payment-records")
def get_patient_payment_records(
    patient_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get all payment records for a patient"""
    try:
        query = tenant_scoped_query(access, PaymentRecord, db_session).filter_by(patient_id=patient_id)
        
        total = query.count()
        payment_records = query.order_by(PaymentRecord.payment_date.desc()).offset((page - 1) * per_page).limit(per_page).all()
        
        return ResponseEnvelope(
            data=[record.to_dict() for record in payment_records],
            meta={
                "total": total,
                "page": page,
                "perPage": per_page,
                "totalPages": (total + per_page - 1) // per_page
            }
        )
    except Exception as e:
        logger.error(f"Get patient payment records error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/payment-records/{record_id}")
def update_payment_record(
    record_id: str,
    payment_in: PaymentRecordUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update a payment record"""
    try:
        payment = get_or_404_scoped(db_session, access, PaymentRecord, record_id)
        if not payment:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Payment record not found", code="PAYMENT_NOT_FOUND").model_dump(mode="json")
            )
        
        data = payment_in.model_dump(exclude_unset=True, by_alias=False)
        
        if 'status' in data:
            payment.status = data['status']
        if 'notes' in data:
            payment.notes = data['notes']
        if 'paid_date' in data and data['paid_date']:
            payment.payment_date = datetime.fromisoformat(data['paid_date'].replace('Z', '+00:00'))
        
        db_session.commit()
        
        return ResponseEnvelope(data=payment.to_dict(), message="Payment record updated successfully")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update payment record error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patients/{patient_id}/promissory-notes")
def get_patient_promissory_notes(
    patient_id: str,
    sale_id: Optional[str] = Query(None, alias="sale_id"),
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get all promissory notes for a patient"""
    try:
        query = tenant_scoped_query(access, PromissoryNote, db_session).filter_by(patient_id=patient_id)
        
        if sale_id:
            query = query.filter_by(sale_id=sale_id)
        
        notes = query.order_by(PromissoryNote.due_date.asc()).all()
        
        return ResponseEnvelope(
            data=[note.to_dict() for note in notes],
            meta={"count": len(notes)}
        )
    except Exception as e:
        logger.error(f"Get patient promissory notes error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/promissory-notes", status_code=201)
def create_promissory_notes(
    notes_in: PromissoryNotesCreate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Create multiple promissory notes"""
    try:
        access.tenant_id = access.tenant_id or notes_in.tenant_id
        if not access.tenant_id:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="access.tenant_id is required", code="TENANT_REQUIRED").model_dump(mode="json")
            )
        
        if not notes_in.notes or len(notes_in.notes) == 0:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="Notes must be a non-empty list", code="EMPTY_NOTES").model_dump(mode="json")
            )
        
        created_notes = []
        
        for note_data in notes_in.notes:
            data = note_data.model_dump(by_alias=False)
            
            note = PromissoryNote()
            note.tenant_id = access.tenant_id
            note.patient_id = notes_in.patient_id
            note.sale_id = notes_in.sale_id
            note.note_number = data['note_number']
            note.total_notes = len(notes_in.notes)
            note.amount = float(data['amount'])
            note.total_amount = float(notes_in.total_amount or 0)
            
            note.issue_date = datetime.fromisoformat(data['issue_date'].replace('Z', '+00:00'))
            note.due_date = datetime.fromisoformat(data['due_date'].replace('Z', '+00:00'))
            
            note.debtor_name = data['debtor_name']
            note.debtor_tc = data.get('debtor_tc')
            note.debtor_address = data.get('debtor_address')
            note.debtor_tax_office = data.get('debtor_tax_office')
            note.debtor_phone = data.get('debtor_phone')
            
            note.has_guarantor = data.get('has_guarantor', False)
            if note.has_guarantor:
                note.guarantor_name = data.get('guarantor_name')
                note.guarantor_tc = data.get('guarantor_tc')
                note.guarantor_address = data.get('guarantor_address')
                note.guarantor_phone = data.get('guarantor_phone')
            
            note.authorized_court = data.get('authorized_court', 'İstanbul (Çağlayan)')
            note.document_id = data.get('document_id')
            note.file_name = data.get('file_name')
            note.notes = data.get('notes')
            note.status = 'active'
            
            db_session.add(note)
            created_notes.append(note)
        
        db_session.commit()
        
        return ResponseEnvelope(
            data=[note.to_dict() for note in created_notes],
            message=f"{len(created_notes)} promissory notes created successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create promissory notes error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/promissory-notes/{note_id}")
def update_promissory_note(
    note_id: str,
    note_in: PromissoryNoteUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Update a promissory note"""
    try:
        note = get_or_404_scoped(db_session, access, PromissoryNote, note_id)
        if not note:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Promissory note not found", code="NOTE_NOT_FOUND").model_dump(mode="json")
            )
        
        data = note_in.model_dump(exclude_unset=True, by_alias=False)
        
        if 'status' in data:
            note.status = data['status']
        if 'paid_date' in data and data['paid_date']:
            note.paid_date = datetime.fromisoformat(data['paid_date'].replace('Z', '+00:00'))
        if 'notes' in data:
            note.notes = data['notes']
        
        db_session.commit()
        
        return ResponseEnvelope(data=note.to_dict(), message="Promissory note updated successfully")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update promissory note error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/promissory-notes/{note_id}/collect", status_code=201)
def collect_promissory_note(
    note_id: str,
    collect_in: CollectPaymentRequest,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Collect payment for a promissory note"""
    try:
        note = get_or_404_scoped(db_session, access, PromissoryNote, note_id)
        if not note:
            raise HTTPException(
                status_code=404,
                detail=ApiError(message="Promissory note not found", code="NOTE_NOT_FOUND").model_dump(mode="json")
            )
        
        payment_amount = float(collect_in.amount)
        if payment_amount <= 0:
            raise HTTPException(
                status_code=400,
                detail=ApiError(message="Invalid payment amount", code="INVALID_AMOUNT").model_dump(mode="json")
            )
        
        note_amount = float(note.amount)
        paid_amount = float(note.paid_amount or 0)
        remaining = note_amount - paid_amount
        
        if payment_amount > remaining + 0.01:
            raise HTTPException(
                status_code=400,
                detail=ApiError(
                    message=f"Payment amount ({payment_amount}) exceeds remaining balance ({remaining})",
                    code="EXCEEDS_BALANCE"
                ).model_dump(mode="json")
            )
        
        access.tenant_id = access.tenant_id or note.tenant_id
        
        payment = PaymentRecord()
        payment.tenant_id = access.tenant_id
        payment.patient_id = note.patient_id
        payment.sale_id = note.sale_id
        payment.promissory_note_id = note_id
        payment.amount = Decimal(str(payment_amount))
        
        payment_date = collect_in.payment_date or datetime.now().isoformat()
        payment.payment_date = datetime.fromisoformat(payment_date.replace('Z', '+00:00'))
        
        payment.payment_method = collect_in.payment_method
        payment.payment_type = 'promissory_note'
        payment.status = 'paid'
        payment.reference_number = collect_in.reference_number or f'SENET-{note_id}'
        payment.notes = collect_in.notes
        
        db_session.add(payment)
        
        new_paid_amount = paid_amount + payment_amount
        note.paid_amount = Decimal(str(new_paid_amount))
        
        if new_paid_amount >= note_amount - 0.01:
            note.status = 'paid'
            note.paid_date = payment.payment_date
        else:
            note.status = 'partial'
        
        # Update sale if exists
        if note.sale_id:
            sale = db_session.get(Sale, note.sale_id)
            if sale:
                sale_payments = db_session.query(PaymentRecord).filter_by(
                    sale_id=note.sale_id,
                    status='paid'
                ).all()
                
                total_sale_paid = sum(float(p.amount) for p in sale_payments) + payment_amount
                sale.paid_amount = Decimal(str(total_sale_paid))
                
                sale_total = float(sale.total_amount or sale.final_amount or 0)
                if total_sale_paid >= sale_total - 0.01:
                    sale.status = 'paid'
                elif total_sale_paid > 0:
                    sale.status = 'partial'
                
                db_session.add(sale)
        
        db_session.commit()
        logger.info(f"Promissory note {note_id} payment collected: {payment_amount} TL")
        
        return ResponseEnvelope(
            data={
                "note": note.to_dict(),
                "payment": payment.to_dict()
            },
            message="Payment collected successfully"
        )
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Collect promissory note error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sales/{sale_id}/promissory-notes")
def get_sale_promissory_notes(
    sale_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db_session: Session = Depends(get_db)
):
    """Get all promissory notes for a specific sale"""
    try:
        notes = tenant_scoped_query(access, PromissoryNote, db_session).filter_by(sale_id=sale_id).order_by(PromissoryNote.note_number.asc()).all()
        
        return ResponseEnvelope(
            data=[note.to_dict() for note in notes],
            meta={"count": len(notes)}
        )
    except Exception as e:
        logger.error(f"Get sale promissory notes error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
