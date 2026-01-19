"""Admin Invoices Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging

from database import get_db
from models.invoice import Invoice
from models.tenant import Tenant
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.invoices import InvoiceCreate, InvoiceRead
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/invoices", tags=["Admin Invoices"])

# Response models
class InvoiceListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class InvoiceDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.get("", operation_id="listAdminInvoices", response_model=InvoiceListResponse)
async def get_admin_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get paginated list of admin invoices"""
    try:
        query = db.query(Invoice)
        
        if access.tenant_id:
            query = query.filter(Invoice.tenant_id == access.tenant_id)
        if status:
            query = query.filter(Invoice.status == status)
        if search:
            query = query.filter(Invoice.invoice_number.ilike(f"%{search}%"))
        
        total = query.count()
        invoices = query.order_by(Invoice.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        invoice_list = []
        for inv in invoices:
            inv_dict = InvoiceRead.model_validate(inv).model_dump(by_alias=True)
            tenant = db.get(Tenant, inv.tenant_id)
            if tenant:
                inv_dict["tenantName"] = tenant.name
            invoice_list.append(inv_dict)
        
        return ResponseEnvelope(
            data={
                "items": invoice_list,
                "pagination": {"total": total, "page": page, "limit": limit, "totalPages": (total + limit - 1) // limit}
            }
        )
    except Exception as e:
        logger.error(f"Get invoices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", operation_id="createAdminInvoice", response_model=InvoiceDetailResponse)
async def create_admin_invoice(
    data: InvoiceCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Create a new invoice"""
    try:
        if not data.tenant_id or not data.amount:
            raise HTTPException(status_code=400, detail="Tenant ID and amount are required")
        
        new_invoice = Invoice(
            tenant_id=data.tenant_id,
            invoice_number=f"INV-{int(datetime.utcnow().timestamp())}",
            device_price=data.amount,
            status="active",
            created_at=datetime.utcnow()
        )
        db.add(new_invoice)
        db.commit()
        db.refresh(new_invoice)
        return ResponseEnvelope(data={"invoice": InvoiceRead.model_validate(new_invoice).model_dump(by_alias=True)})
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create invoice error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/{invoice_id}", operation_id="getAdminInvoice", response_model=InvoiceDetailResponse)
async def get_admin_invoice(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get single invoice"""
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        inv_dict = InvoiceRead.model_validate(invoice).model_dump(by_alias=True)
        tenant = db.get(Tenant, invoice.tenant_id)
        if tenant:
            inv_dict["tenantName"] = tenant.name
        return ResponseEnvelope(data={"invoice": inv_dict})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{invoice_id}/payment", operation_id="createAdminInvoicePayment", response_model=InvoiceDetailResponse)
async def record_payment(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Record payment for invoice"""
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        invoice.status = "paid"
        db.commit()
        return ResponseEnvelope(data={"invoice": InvoiceRead.model_validate(invoice).model_dump(by_alias=True)})
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{invoice_id}/pdf", operation_id="listAdminInvoicePdf", response_model=ResponseEnvelope)
async def get_invoice_pdf(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get invoice PDF link"""
    try:
        invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if invoice.gib_pdf_link:
            return {"success": True, "data": {"url": invoice.gib_pdf_link}}
        raise HTTPException(status_code=404, detail="PDF not available")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
