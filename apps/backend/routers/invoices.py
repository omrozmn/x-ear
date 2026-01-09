"""
FastAPI Invoices Router - Migrated from Flask routes/invoices/
Handles invoice CRUD operations
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime
import logging
import uuid

from sqlalchemy.orm import Session
from sqlalchemy import desc

from schemas.base import ResponseEnvelope
from schemas.invoices import InvoiceCreate, InvoiceUpdate, InvoiceRead
from models.user import User
from models.invoice import Invoice
from models.patient import Patient
from models.efatura_outbox import EFaturaOutbox
from models.user import ActivityLog
from utils.efatura import build_return_invoice_xml, write_outbox_file
import os
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Invoices"])

# --- Routes ---

@router.get("/invoices", operation_id="listInvoices", response_model=ResponseEnvelope[List[InvoiceRead]])
def get_invoices(
    page: int = 1,
    per_page: int = 20,
    status: Optional[str] = None,
    patient_id: Optional[str] = None,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get all invoices with pagination"""
    try:
        query = db_session.query(Invoice).filter(
            Invoice.tenant_id == access.tenant_id,
            Invoice.status != 'deleted'
        )
        
        if status:
            query = query.filter(Invoice.status == status)
        if patient_id:
            query = query.filter(Invoice.patient_id == patient_id)
        
        query = query.order_by(desc(Invoice.created_at))
        total = query.count()
        invoices = query.offset((page - 1) * per_page).limit(per_page).all()
        
        return ResponseEnvelope(
            data=[inv.to_dict() for inv in invoices],
            meta={
                "page": page,
                "perPage": per_page,
                "total": total,
                "totalPages": (total + per_page - 1) // per_page,
            },
        )
    except Exception as e:
        logger.error(f"Get invoices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/{invoice_id}", operation_id="getInvoice", response_model=ResponseEnvelope[InvoiceRead])
def get_invoice(
    invoice_id: int,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get a specific invoice"""
    invoice = db_session.query(Invoice).filter(
        Invoice.id == invoice_id,
        Invoice.tenant_id == access.tenant_id
    ).first()
    
    if not invoice or invoice.status == 'deleted':
        raise HTTPException(status_code=404, detail={"message": "Invoice not found", "code": "NOT_FOUND"})
    
    return ResponseEnvelope(data=invoice.to_dict())

@router.post("/invoices", operation_id="createInvoices", response_model=ResponseEnvelope[InvoiceRead], status_code=201)
def create_invoice(
    request_data: InvoiceCreate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create a new invoice"""
    try:
        # Verify patient exists
        payload = request_data.model_dump(by_alias=False)
        patient_id = payload.get("patient_id")
        sale_id = payload.get("sale_id")

        # Patient is optional for some invoice types
        if patient_id:
            patient = db_session.query(Patient).filter(
                Patient.id == patient_id,
                Patient.tenant_id == access.tenant_id
            ).first()
            
            if not patient:
                raise HTTPException(status_code=404, detail={"message": "Patient not found", "code": "NOT_FOUND"})
        
        # Generate invoice number
        from datetime import datetime
        invoice_number = f"INV-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:6].upper()}"
        
        invoice = Invoice(
            # id is auto-generated (Integer primary key)
            tenant_id=access.tenant_id,
            invoice_number=invoice_number,
            patient_id=patient_id,
            sale_id=sale_id,
            status=(payload.get("status") or "draft"),
            notes=payload.get("notes"),
            device_price=payload.get("total_amount", 0),
            created_by=access.user_id
        )
        
        db_session.add(invoice)
        db_session.commit()
        db_session.refresh(invoice)
        
        return ResponseEnvelope(data=invoice.to_dict())
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Create invoice error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/invoices/{invoice_id}", operation_id="updateInvoice", response_model=ResponseEnvelope[InvoiceRead])
def update_invoice(
    invoice_id: int,
    request_data: InvoiceUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Update an invoice"""
    try:
        invoice = db_session.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == access.tenant_id
        ).first()
        
        if not invoice or invoice.status == 'deleted':
            raise HTTPException(status_code=404, detail={"message": "Invoice not found", "code": "NOT_FOUND"})
        
        update_data = request_data.model_dump(exclude_unset=True, by_alias=False)
        for key, value in update_data.items():
            if value is None:
                continue
            if hasattr(invoice, key):
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

@router.delete("/invoices/{invoice_id}", operation_id="deleteInvoice", response_model=ResponseEnvelope[None])
def delete_invoice(
    invoice_id: int,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Delete an invoice (soft delete)"""
    try:
        invoice = db_session.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == access.tenant_id
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

@router.get("/patients/{patient_id}/invoices", operation_id="listPatientInvoices", response_model=ResponseEnvelope[List[InvoiceRead]])
def get_patient_invoices(
    patient_id: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get all invoices for a patient"""
    try:
        patient = db_session.query(Patient).filter(
            Patient.id == patient_id,
            Patient.tenant_id == access.tenant_id
        ).first()
        
        if not patient:
            raise HTTPException(status_code=404, detail={"message": "Patient not found", "code": "NOT_FOUND"})
        
        invoices = db_session.query(Invoice).filter(
            Invoice.patient_id == patient_id,
            Invoice.tenant_id == access.tenant_id,
            Invoice.status != 'deleted'
        ).order_by(desc(Invoice.created_at)).all()
        
        return ResponseEnvelope(data=[inv.to_dict() for inv in invoices])
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient invoices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoices/{invoice_id}/send-to-gib", operation_id="createInvoiceSendToGib", response_model=ResponseEnvelope[dict])
def send_to_gib(
    invoice_id: int,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send invoice to GIB (Generate e-Fatura/e-Arşiv)"""
    try:
        invoice = db_session.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.tenant_id == access.tenant_id
        ).first()
        
        if not invoice:
            raise HTTPException(status_code=404, detail={"message": "Invoice not found", "code": "NOT_FOUND"})

        if getattr(invoice, 'sent_to_gib', False):
             raise HTTPException(status_code=400, detail={"message": "Invoice already sent to GİB", "code": "ALREADY_SENT"})

        # Build minimal xml using invoice metadata
        invoice_meta = {
            'invoiceNumber': getattr(invoice, 'invoice_number', str(invoice.id)),
            'items': getattr(invoice, 'items', [])
        }

        # Mock object for type('X', ...)
        class InvoiceMock:
            id = invoice.id
            
        file_name, ettn, uid, xml_content = build_return_invoice_xml(InvoiceMock(), invoice_meta=invoice_meta)

        outbox = EFaturaOutbox(
            invoice_id=str(invoice.id),
            file_name=file_name,
            ettn=ettn,
            uuid=uid,
            xml_content=xml_content,
            status='pending',
            tenant_id=access.tenant_id # Ensure tenant ownership
        )
        db_session.add(outbox)

        # Attempt to write outbox file to instance folder (non-fatal)
        try:
            # Assuming instance/efatura_outbox path structure
            outbox_dir = os.path.abspath(os.path.join(os.getcwd(), 'instance', 'efatura_outbox'))
            if not os.path.exists(outbox_dir):
                os.makedirs(outbox_dir, exist_ok=True)
                
            write_outbox_file(outbox_dir, file_name, xml_content)
            outbox.status = 'sent'
        except Exception as e:
            logger.warning(f"Failed to write outbox file: {e}")
            outbox.status = 'error'

        # Mark invoice metadata
        invoice.sent_to_gib = True
        # invoice.sent_to_gib_at = datetime.utcnow() # SQLAlchemy DateTime defaults usually handles it or model
        invoice.status = 'sent'
        # invoice.updated_at = datetime.utcnow()

        # Activity log
        try:
            log = ActivityLog(
                user_id=access.user_id or 'system', 
                action='invoice_issued', 
                entity_type='invoice', 
                entity_id=str(invoice.id),
                tenant_id=access.tenant_id
            )
            db_session.add(log)
        except Exception:
            pass

        db_session.commit()

        return ResponseEnvelope(data={'invoice': invoice.to_dict(), 'outbox': outbox.to_dict()})
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Send to GIB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
