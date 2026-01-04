"""
FastAPI Invoices Router - Migrated from Flask routes/invoices/
Handles invoice CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel
import logging
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import desc

from dependencies import get_db, get_current_user
from schemas.base import ResponseEnvelope
from models.user import User
from models.invoice import Invoice
from models.patient import Patient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Invoices"])

# --- Request Schemas ---

class CreateInvoiceRequest(BaseModel):
    patient_id: str
    sale_id: Optional[str] = None
    device_price: Optional[float] = 0
    service_price: Optional[float] = 0
    discount: Optional[float] = 0
    tax_rate: Optional[float] = 18
    status: Optional[str] = "draft"
    notes: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = []

class UpdateInvoiceRequest(BaseModel):
    device_price: Optional[float] = None
    service_price: Optional[float] = None
    discount: Optional[float] = None
    tax_rate: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None
    items: Optional[List[Dict[str, Any]]] = None

# --- Routes ---

@router.get("/invoices")
def get_invoices(
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
    patient_id: Optional[str] = None,
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all invoices with pagination"""
    try:
        query = db_session.query(Invoice).filter(
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.status != 'deleted'
        )
        
        if status:
            query = query.filter(Invoice.status == status)
        if patient_id:
            query = query.filter(Invoice.patient_id == patient_id)
        
        query = query.order_by(desc(Invoice.created_at))
        total = query.count()
        invoices = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return ResponseEnvelope(data={
            "invoices": [inv.to_dict() for inv in invoices],
            "meta": {
                "page": page,
                "perPage": per_page,
                "total": total,
                "totalPages": (total + per_page - 1) // per_page
            }
        })
    except Exception as e:
        logger.error(f"Get invoices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/{invoice_id}")
def get_invoice(
    invoice_id: str,
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific invoice"""
    invoice = db_session.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.tenant_id == current_user.tenant_id
    ).first()
    
    if not invoice or invoice.status == 'deleted':
        raise HTTPException(status_code=404, detail={"message": "Invoice not found", "code": "NOT_FOUND"})
    
    return ResponseEnvelope(data=invoice.to_dict())

@router.post("/invoices")
def create_invoice(
    request_data: CreateInvoiceRequest,
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new invoice"""
    try:
        # Verify patient exists
        patient = db_session.query(Patient).filter(
            Patient.id == request_data.patient_id,
            Patient.tenant_id == current_user.tenant_id
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail={"message": "Patient not found", "code": "NOT_FOUND"})
        
        invoice = Invoice(
            id=str(uuid.uuid4()),
            tenant_id=current_user.tenant_id,
            patient_id=request_data.patient_id,
            sale_id=request_data.sale_id,
            device_price=request_data.device_price,
            service_price=request_data.service_price,
            discount=request_data.discount,
            tax_rate=request_data.tax_rate,
            status=request_data.status,
            notes=request_data.notes,
            items=request_data.items,
            created_by=current_user.id
        )
        
        db_session.add(invoice)
        db_session.commit()
        
        return ResponseEnvelope(data=invoice.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create invoice error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/invoices/{invoice_id}")
def update_invoice(
    invoice_id: str,
    request_data: UpdateInvoiceRequest,
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update an invoice"""
    try:
        invoice = db_session.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id
        ).first()
        
        if not invoice or invoice.status == 'deleted':
            raise HTTPException(status_code=404, detail={"message": "Invoice not found", "code": "NOT_FOUND"})
        
        update_data = request_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(invoice, key, value)
        
        invoice.updated_at = datetime.utcnow()
        db_session.commit()
        
        return ResponseEnvelope(data=invoice.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update invoice error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/invoices/{invoice_id}")
def delete_invoice(
    invoice_id: str,
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an invoice (soft delete)"""
    try:
        invoice = db_session.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == current_user.tenant_id
        ).first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail={"message": "Invoice not found", "code": "NOT_FOUND"})
        
        invoice.status = 'deleted'
        invoice.updated_at = datetime.utcnow()
        db_session.commit()
        
        return ResponseEnvelope(message="Invoice deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Delete invoice error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/patients/{patient_id}/invoices")
def get_patient_invoices(
    patient_id: str,
    db_session: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all invoices for a patient"""
    try:
        patient = db_session.query(Patient).filter(
            Patient.id == patient_id,
            Patient.tenant_id == current_user.tenant_id
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail={"message": "Patient not found", "code": "NOT_FOUND"})
        
        invoices = db_session.query(Invoice).filter(
            Invoice.patient_id == patient_id,
            Invoice.tenant_id == current_user.tenant_id,
            Invoice.status != 'deleted'
        ).order_by(desc(Invoice.created_at)).all()
        
        return ResponseEnvelope(data=[inv.to_dict() for inv in invoices])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient invoices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
