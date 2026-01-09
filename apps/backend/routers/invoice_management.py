"""Invoice Management Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime, timezone
import json
import xml.etree.ElementTree as ET
from xml.dom import minidom
import uuid
import logging

from database import get_db
from models.invoice import Invoice
from models.system import Settings
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Invoice Management"])

def now_utc():
    return datetime.now(timezone.utc)

class DynamicInvoiceCreate(BaseModel):
    recipient_name: str
    recipient_tax_number: str
    recipient_address: Optional[str] = ""
    recipient_email: Optional[str] = None
    invoice_date: str
    due_date: Optional[str] = None
    scenario: Optional[str] = "36"
    currency: Optional[str] = "TRY"
    product_name: Optional[str] = "Dinamik Fatura"
    quantity: Optional[float] = 1
    unit_price: Optional[float] = 0
    vat_rate: Optional[str] = "20"
    unit: Optional[str] = "C62"

class InvoiceSettingsUpdate(BaseModel):
    company_info: Optional[Dict[str, Any]] = None
    invoice_logo: Optional[str] = None
    invoice_signature: Optional[str] = None

@router.get("/invoice-schema", operation_id="listInvoiceSchema")
async def get_invoice_schema(db: Session = Depends(get_db)):
    """Get the invoice fields schema for dynamic form generation"""
    schema = {
        "invoiceTypes": {
            "TEMEL": {"name": "Temel Fatura", "requiredFields": ["recipient", "invoiceDetails"]},
            "TICARI": {"name": "Ticari Fatura", "requiredFields": ["recipient", "invoiceDetails", "products"]},
            "IADE": {"name": "Iade Faturasi", "requiredFields": ["recipient", "invoiceDetails", "products"]}
        },
        "fieldDefinitions": {
            "recipient": {
                "name": "Alici Bilgileri",
                "fields": {
                    "name": {"id": "recipient_name", "label": "Ad Soyad / Unvan", "type": "text", "required": True},
                    "taxNumber": {"id": "recipient_tax_number", "label": "VKN/TCKN", "type": "text", "required": True},
                    "address": {"id": "recipient_address", "label": "Adres", "type": "textarea", "required": True},
                    "email": {"id": "recipient_email", "label": "E-posta", "type": "email", "required": False}
                }
            },
            "invoiceDetails": {
                "name": "Fatura Detaylari",
                "fields": {
                    "invoiceDate": {"id": "invoice_date", "label": "Fatura Tarihi", "type": "date", "required": True},
                    "dueDate": {"id": "due_date", "label": "Vade Tarihi", "type": "date", "required": False},
                    "scenario": {"id": "scenario", "label": "Senaryo", "type": "select", "required": True, "defaultValue": "36"},
                    "currency": {"id": "currency", "label": "Para Birimi", "type": "select", "required": True, "defaultValue": "TRY"}
                }
            },
            "products": {
                "name": "Urun/Hizmet Bilgileri",
                "fields": {
                    "productName": {"id": "product_name", "label": "Urun/Hizmet Adi", "type": "text", "required": True},
                    "quantity": {"id": "quantity", "label": "Miktar", "type": "number", "required": True},
                    "unitPrice": {"id": "unit_price", "label": "Birim Fiyat", "type": "number", "required": True},
                    "vatRate": {"id": "vat_rate", "label": "KDV Orani (%)", "type": "select", "required": True}
                }
            }
        }
    }
    return {"success": True, "data": schema, "requestId": str(uuid.uuid4()), "timestamp": now_utc().isoformat()}

@router.post("/invoices/create-dynamic", operation_id="createInvoiceCreateDynamic")
async def create_dynamic_invoice(
    data: DynamicInvoiceCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create invoice from dynamic form data"""
    try:
        year_month = datetime.utcnow().strftime("%Y%m")
        latest = db.query(Invoice).filter(
            Invoice.invoice_number.like(f"DYN{year_month}%")
        ).order_by(Invoice.created_at.desc()).first()
        
        new_num = int(latest.invoice_number[-4:]) + 1 if latest else 1
        invoice_number = f"DYN{year_month}{new_num:04d}"
        
        invoice = Invoice(
            invoice_number=invoice_number,
            patient_name=data.recipient_name,
            patient_tc=data.recipient_tax_number,
            patient_address=data.recipient_address,
            device_name=data.product_name,
            device_price=data.unit_price * data.quantity,
            status="active",
            created_by=access.user.get("id", "system")
        )
        
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        
        return {
            "success": True,
            "data": {
                "invoiceId": invoice.id,
                "invoiceNumber": invoice.invoice_number,
                "status": invoice.status,
                "createdAt": invoice.created_at.isoformat()
            },
            "requestId": str(uuid.uuid4()),
            "timestamp": now_utc().isoformat()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices/{invoice_id}/xml", operation_id="listInvoiceXml")
async def generate_invoice_xml(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Generate XML for e-invoice integration"""
    try:
        invoice = db.get(Invoice, invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        root = ET.Element("Invoice")
        root.set("xmlns", "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2")
        
        id_elem = ET.SubElement(root, "cbc:ID")
        id_elem.text = invoice.invoice_number
        
        issue_date = ET.SubElement(root, "cbc:IssueDate")
        issue_date.text = invoice.created_at.strftime("%Y-%m-%d")
        
        rough_string = ET.tostring(root, "utf-8")
        reparsed = minidom.parseString(rough_string)
        pretty_xml = reparsed.toprettyxml(indent="  ")
        
        return {
            "success": True,
            "data": {
                "invoiceId": invoice.id,
                "invoiceNumber": invoice.invoice_number,
                "xml": pretty_xml,
                "generatedAt": now_utc().isoformat()
            },
            "requestId": str(uuid.uuid4()),
            "timestamp": now_utc().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoices/{invoice_id}/send-gib", operation_id="createInvoiceSendGib")
async def send_invoice_to_gib(
    invoice_id: int,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send invoice to GIB for e-invoice"""
    try:
        invoice = db.get(Invoice, invoice_id)
        if not invoice:
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        if getattr(invoice, "sent_to_gib", False):
            raise HTTPException(status_code=400, detail="Invoice already sent to GIB")
        
        invoice.sent_to_gib = True
        invoice.sent_to_gib_at = now_utc()
        db.commit()
        
        return {
            "success": True,
            "data": {
                "invoiceId": invoice.id,
                "invoiceNumber": invoice.invoice_number,
                "sentToGib": True,
                "sentToGibAt": invoice.sent_to_gib_at.isoformat()
            },
            "requestId": str(uuid.uuid4()),
            "timestamp": now_utc().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoice-settings", operation_id="listInvoiceSettings")
async def get_invoice_settings(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get invoice-related settings"""
    try:
        settings_keys = ["company_info", "invoice_logo", "invoice_signature"]
        settings = {}
        
        for key in settings_keys:
            setting = db.query(Settings).filter(Settings.key == key).first()
            if setting:
                try:
                    settings[key] = json.loads(setting.value)
                except (json.JSONDecodeError, TypeError):
                    settings[key] = setting.value
            else:
                settings[key] = None
        
        return {"success": True, "data": settings, "requestId": str(uuid.uuid4()), "timestamp": now_utc().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/invoice-settings", operation_id="createInvoiceSettings")
async def update_invoice_settings(
    data: InvoiceSettingsUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Update invoice-related settings"""
    try:
        updated_settings = []
        data_dict = data.dict(exclude_none=True)
        
        for key, value in data_dict.items():
            if key in ["company_info", "invoice_logo", "invoice_signature"]:
                setting = db.query(Settings).filter(Settings.key == key).first()
                
                if setting:
                    setting.value = json.dumps(value) if isinstance(value, (dict, list)) else str(value)
                    setting.updated_at = now_utc()
                else:
                    setting = Settings(
                        key=key,
                        value=json.dumps(value) if isinstance(value, (dict, list)) else str(value),
                        created_at=now_utc(),
                        updated_at=now_utc()
                    )
                    db.add(setting)
                
                updated_settings.append(key)
        
        db.commit()
        
        return {
            "success": True,
            "data": {"updatedSettings": updated_settings, "updatedAt": now_utc().isoformat()},
            "requestId": str(uuid.uuid4()),
            "timestamp": now_utc().isoformat()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
