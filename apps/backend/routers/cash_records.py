"""
FastAPI Cash Records Router - Migrated from Flask routes/cash_records.py
Handles cash register records for cashflow management
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import logging

from sqlalchemy.orm import Session
from sqlalchemy import or_

from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["CashRecords"])

# --- Schemas ---

class CashRecordCreate(BaseModel):
    transactionType: str  # 'income' or 'expense'
    amount: float
    recordType: str = "diger"
    description: Optional[str] = None
    patientId: Optional[str] = None
    patientName: Optional[str] = None
    date: Optional[str] = None
    id: Optional[str] = None
    tenant_id: Optional[str] = None

class CashRecordResponse(BaseModel):
    id: str
    date: str
    transactionType: str
    recordType: str
    patientId: Optional[str] = None
    patientName: Optional[str] = None
    amount: float
    description: Optional[str] = None

# --- Helper Functions ---

def derive_record_type(notes: str) -> str:
    """Derive record type from notes"""
    n = (notes or '').lower()
    if 'pil' in n or 'batarya' in n:
        return 'pil'
    if 'filtre' in n:
        return 'filtre'
    if 'tamir' in n or 'onarım' in n:
        return 'tamir'
    if 'kaparo' in n or 'kapora' in n:
        return 'kaparo'
    if 'kalıp' in n:
        return 'kalip'
    if 'teslim' in n:
        return 'teslimat'
    return 'diger'

# --- Routes ---

@router.get("/cash-records")
def get_cash_records(
    limit: int = Query(200, ge=1, le=1000),
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Return cash register records"""
    try:
        from models.sales import PaymentRecord
        from models.patient import Patient
        
        # Build query with tenant scoping
        query = db.query(PaymentRecord)
        if access.tenant_id:
            query = query.filter(PaymentRecord.tenant_id == access.tenant_id)
        
        if status:
            query = query.filter(PaymentRecord.status == status)
        
        if start_date:
            try:
                sd = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(PaymentRecord.payment_date >= sd)
            except Exception:
                pass
        
        if end_date:
            try:
                ed = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(PaymentRecord.payment_date <= ed)
            except Exception:
                pass
        
        query = query.order_by(PaymentRecord.payment_date.desc())
        rows = query.limit(limit).all()
        
        # Get patient info
        patient_ids = {r.patient_id for r in rows if r.patient_id}
        patients_map = {}
        if patient_ids:
            patients = db.query(Patient).filter(Patient.id.in_(patient_ids)).all()
            patients_map = {p.id: p for p in patients}
        
        records = []
        for r in rows:
            try:
                patient = patients_map.get(r.patient_id) if r.patient_id else None
                patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''
                
                record = {
                    'id': r.id,
                    'date': r.payment_date.isoformat() if r.payment_date else datetime.now(timezone.utc).isoformat(),
                    'transactionType': 'income' if (r.amount or 0) >= 0 else 'expense',
                    'recordType': derive_record_type(r.notes or ''),
                    'patientId': r.patient_id,
                    'patientName': patient_name,
                    'amount': float(r.amount or 0),
                    'description': r.notes or ''
                }
                records.append(record)
            except Exception as inner_e:
                logger.error(f"Error processing cash record {getattr(r, 'id', 'unknown')}: {inner_e}")
                continue
        
        # Apply search filter
        if search:
            search_term = search.lower()
            records = [r for r in records if 
                      search_term in (r['patientName'] or '').lower() or 
                      search_term in (r['description'] or '').lower()]
        
        return ResponseEnvelope(data=records, meta={'count': len(records)})
        
    except Exception as e:
        logger.error(f"Error fetching cash records: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/cash-records", status_code=201)
def create_cash_record(
    request_data: CashRecordCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Create a new cash record"""
    try:
        from models.sales import PaymentRecord
        from models.patient import Patient
        from database import gen_id
        
        if not request_data.transactionType:
            raise HTTPException(status_code=400, detail="Transaction type is required")
        
        if not request_data.amount:
            raise HTTPException(status_code=400, detail="Amount is required")
        
        # Determine access.tenant_id
        access.tenant_id = access.tenant_id
        if not access.tenant_id:
            access.tenant_id = request_data.tenant_id
            if not access.tenant_id and access.is_super_admin:
                access.tenant_id = None  # Super admin can create global records
            elif not access.tenant_id:
                raise HTTPException(status_code=400, detail="access.tenant_id is required")
        
        # Find patient by name if provided
        patient_id = request_data.patientId
        if not patient_id and request_data.patientName and request_data.patientName.strip():
            patient_name = request_data.patientName.strip()
            patient_query = db.query(Patient)
            if access.tenant_id:
                patient_query = patient_query.filter(Patient.tenant_id == access.tenant_id)
            
            patient = patient_query.filter(
                or_(
                    Patient.first_name.ilike(f"%{patient_name}%"),
                    Patient.last_name.ilike(f"%{patient_name}%")
                )
            ).first()
            if patient:
                patient_id = patient.id
        
        # Create payment record
        payment = PaymentRecord()
        payment.id = request_data.id or gen_id("cash")
        payment.patient_id = patient_id
        payment.tenant_id = access.tenant_id
        
        # Handle amount
        amount = float(request_data.amount)
        if request_data.transactionType == 'expense':
            amount = -abs(amount)
        payment.amount = amount
        
        # Handle date
        if request_data.date:
            try:
                payment.payment_date = datetime.fromisoformat(request_data.date.replace('Z', '+00:00'))
            except:
                payment.payment_date = datetime.now(timezone.utc)
        else:
            payment.payment_date = datetime.now(timezone.utc)
        
        payment.payment_method = 'cash'
        payment.payment_type = 'payment'
        payment.status = 'paid'
        payment.notes = f"{request_data.recordType} - {request_data.description or ''}"
        
        db.add(payment)
        db.commit()
        
        # Get patient name for response
        patient = db.get(Patient, payment.patient_id) if payment.patient_id else None
        patient_name = f"{getattr(patient, 'first_name', '')} {getattr(patient, 'last_name', '')}".strip() if patient else ''
        
        record = {
            'id': payment.id,
            'date': payment.payment_date.isoformat(),
            'transactionType': request_data.transactionType,
            'recordType': request_data.recordType,
            'patientId': payment.patient_id,
            'patientName': patient_name,
            'amount': float(payment.amount),
            'description': request_data.description or ''
        }
        
        logger.info(f"Cash record created: {payment.id} by {access.principal_id}")
        
        return ResponseEnvelope(data=record, message="Cash record created successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create cash record error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cash-records/{record_id}")
def delete_cash_record(
    record_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a cash record"""
    try:
        from models.sales import PaymentRecord
        
        payment = db.get(PaymentRecord, record_id)
        if not payment:
            raise HTTPException(status_code=404, detail="Record not found")
        
        # Tenant check
        if access.tenant_id and payment.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        db.delete(payment)
        db.commit()
        
        logger.info(f"Cash record deleted: {record_id} by {access.principal_id}")
        
        return ResponseEnvelope(message="Cash record deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Delete cash record error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
