"""Invoice Actions Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from datetime import datetime
import os
import logging

from database import get_db
from models.invoice import Invoice
from models.user import ActivityLog
from models.efatura_outbox import EFaturaOutbox
from models.integration_config import IntegrationConfig
from utils.efatura import build_return_invoice_xml, write_outbox_file
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.invoices import (
    InvoiceRead, InvoiceIssueResponse, 
    InvoiceCopyCancelResponse
)
from schemas.efatura import EFaturaOutboxRead
from schemas.base import ResponseEnvelope
from database import get_db
from models.tenant import Tenant
from utils.ubl_utils import generate_ubl_xml, map_unit_code
from services.birfatura.service import BirfaturaClient
import base64

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/invoices", tags=["Invoice Actions"])

@router.post("/{invoice_id}/issue", operation_id="createInvoiceIssue", response_model=ResponseEnvelope[InvoiceIssueResponse])
async def issue_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Issue invoice and send to e-fatura outbox"""
    try:
        invoice = db.get(Invoice, invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if getattr(invoice, "sent_to_gib", False):
            raise HTTPException(status_code=400, detail="Invoice already sent to GIB")
        
        # 1. Update status to 'processing' immediately
        invoice.edocument_status = "processing"
        db.commit()
        
        # 2. Get Tenant Info for Supplier details
        tenant = db.get(Tenant, access.tenant_id)
        if not tenant:
            raise HTTPException(status_code=400, detail="Tenant not found")
            
        tenant_settings = (tenant.settings or {}).get("invoice_integration", {})
        
        # 3. Construct Payload for UBL Generation
        # Convert Invoice model + its relations to a dict suitable for ubl_utils
        # legacy: UBL generation requires dict format - TODO: refactor to use Pydantic schema
        to_dict_method = getattr(invoice, 'to_dict', None)
        invoice_dict = to_dict_method() if to_dict_method else {}
        invoice_dict['supplier'] = {
            'name': tenant.company_name or tenant.name,
            'tax_id': tenant_settings.get("vkn") or tenant_settings.get("tckn"),
            'tax_office': tenant_settings.get("tax_office"),
            'address': tenant.address or {}
        }
        
        # Map specialized fields from metadata_json if exists
        meta = invoice.metadata_json or {}
        invoice_dict.update({
            'sgk_data': meta.get('sgkData'),
            'return_invoice_details': meta.get('returnInvoiceDetails'),
            'export_details': meta.get('exportDetails'),
            'medical_device_data': meta.get('medicalDeviceData'),
            'xslt_code': meta.get('xslt_code', 'default')
        })
        
        # 4. Generate REAL UBL XML
        outbox_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "instance", "efatura_outbox"))
        os.makedirs(outbox_dir, exist_ok=True)
        xml_filename = f"INV_{invoice.id}_{int(datetime.utcnow().timestamp())}.xml"
        xml_path = os.path.join(outbox_dir, xml_filename)
        
        generate_ubl_xml(invoice_dict, xml_path)
        
        with open(xml_path, "rb") as f:
            xml_content = f.read()
            content_b64 = base64.b64encode(xml_content).decode('utf-8')
            
        # 5. Call Birfatura API
        try:
            client = BirfaturaClient(
                api_key=tenant_settings.get("api_key"),
                secret_key=tenant_settings.get("secret_key"),
                integration_key=db.query(IntegrationConfig).filter_by(integration_type="birfatura", config_key="integration_key").first().config_value if db.query(IntegrationConfig).filter_by(integration_type="birfatura", config_key="integration_key").first() else None
            )
            
            resp = client.send_document({
                "fileName": xml_filename,
                "documentBase64": content_b64
            })
            
            if resp.get("Success"):
                result = resp.get("Result", {})
                invoice.sent_to_gib = True
                invoice.sent_to_gib_at = datetime.utcnow()
                invoice.edocument_status = "sent"
                invoice.invoice_number = result.get("invoiceNo") or invoice.invoice_number
                invoice.gib_pdf_link = result.get("pdfLink")
                invoice.ettn = result.get("ettn") or invoice.ettn
                invoice.remote_message = resp.get("Message")
                
                # Update outbox
                outbox = EFaturaOutbox(
                    invoice_id=str(invoice.id),
                    file_name=xml_filename,
                    ettn=invoice.ettn,
                    uuid=invoice.ettn,
                    xml_content=xml_content.decode('utf-8') if isinstance(xml_content, bytes) else xml_content,
                    status="sent"
                )
                db.add(outbox)
            else:
                invoice.edocument_status = "failed"
                invoice.remote_message = resp.get("Message", "Unknown error from Birfatura")
                raise Exception(invoice.remote_message)
                
        except Exception as e:
            logger.error(f"Birfatura submission error: {e}")
            invoice.edocument_status = "failed"
            invoice.remote_message = str(e)
            db.commit()
            raise HTTPException(status_code=502, detail=f"Birfatura Integration Error: {str(e)}")
        
        try:
            log = ActivityLog(
                user_id=access.user.get("id", "system"),
                action="invoice_issued",
                entity_type="invoice",
                entity_id=str(invoice.id)
            )
            db.add(log)
        except Exception:
            pass
        
        db.commit()
        
        return ResponseEnvelope(data=InvoiceIssueResponse(
            invoice=InvoiceRead.model_validate(invoice),
            outbox=EFaturaOutboxRead.model_validate(outbox)
        ))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{invoice_id}/copy", operation_id="createInvoiceCopy", response_model=ResponseEnvelope[InvoiceRead])
async def copy_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create a copy of an invoice"""
    try:
        invoice = db.get(Invoice, invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        new_inv = Invoice()
        new_inv.invoice_number = f"{getattr(invoice, 'invoice_number', 'COPY')}-COPY-{int(datetime.utcnow().timestamp())}"
        new_inv.party_id = invoice.party_id
        new_inv.patient_name = getattr(invoice, "patient_name", None)
        new_inv.device_price = getattr(invoice, "device_price", getattr(invoice, "total_amount", 0))
        new_inv.status = "draft"
        new_inv.notes = (getattr(invoice, "notes", "") or "") + "\n[copy created]"
        new_inv.created_at = datetime.utcnow()
        new_inv.updated_at = datetime.utcnow()
        
        db.add(new_inv)
        db.commit()
        db.refresh(new_inv)
        
        return ResponseEnvelope(data=InvoiceRead.model_validate(new_inv))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{invoice_id}/copy-cancel", operation_id="createInvoiceCopyCancel", response_model=ResponseEnvelope[InvoiceCopyCancelResponse])
async def copy_invoice_cancel(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create copy and cancellation draft"""
    try:
        invoice = db.get(Invoice, invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        copy_inv = Invoice()
        copy_inv.invoice_number = f"{getattr(invoice, 'invoice_number', 'COPY')}-COPY-{int(datetime.utcnow().timestamp())}"
        copy_inv.party_id = invoice.party_id
        copy_inv.status = "draft"
        copy_inv.created_at = datetime.utcnow()
        copy_inv.updated_at = datetime.utcnow()
        db.add(copy_inv)
        db.flush()
        
        cancel_inv = Invoice()
        cancel_inv.invoice_number = f"CNL-{copy_inv.invoice_number}"
        cancel_inv.party_id = copy_inv.party_id
        cancel_inv.status = "draft"
        cancel_inv.notes = f"Cancellation draft for {copy_inv.invoice_number}"
        cancel_inv.created_at = datetime.utcnow()
        cancel_inv.updated_at = datetime.utcnow()
        db.add(cancel_inv)
        
        db.commit()
        
        return ResponseEnvelope(data=InvoiceCopyCancelResponse(
            copy_invoice=InvoiceRead.model_validate(copy_inv),
            cancellation=InvoiceRead.model_validate(cancel_inv)
        ))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{invoice_id}/pdf", operation_id="listInvoicePdf")
async def serve_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    """Serve invoice PDF"""
    try:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "examples"))
        candidate = os.path.join(base, "hasta-musteri satis fatura.pdf")
        if not os.path.exists(candidate):
            raise HTTPException(status_code=404, detail="Example PDF not available")
        return FileResponse(candidate, media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{invoice_id}/shipping-pdf", operation_id="listInvoiceShippingPdf")
async def serve_shipping_pdf(invoice_id: int, db: Session = Depends(get_db)):
    """Serve shipping PDF"""
    try:
        base = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "docs", "examples"))
        candidate = os.path.join(base, "kargo fisi.pdf")
        if not os.path.exists(candidate):
            raise HTTPException(status_code=404, detail="Shipping PDF not available")
        return FileResponse(candidate, media_type="application/pdf")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
