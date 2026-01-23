# Operation ID Evidence — replacements.py

Source: `x-ear/apps/api/routers/replacements.py`

Full router source (verbatim) provided as code evidence — contains decorators and function(s):

```python
"""Replacements Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json
import time
import logging

from database import get_db
from models.replacement import Replacement
from core.models.party import Party
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope
from schemas.replacements import (
    ReplacementRead, ReplacementCreate, 
    ReplacementStatusUpdate, ReplacementInvoiceCreate,
    ReplacementInvoiceResponse
)

router = APIRouter(tags=["Replacements"])

@router.get("/parties/{party_id}/replacements", operation_id="listPatientReplacements", response_model=ResponseEnvelope[list[ReplacementRead]])
async def get_patient_replacements(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get replacement history for a patient"""
    try:
        query = db.query(Replacement).filter(Replacement.party_id == party_id)
        if access.tenant_id:
            query = query.filter(Replacement.tenant_id == access.tenant_id)
        
        reps = query.order_by(Replacement.created_at.desc()).all()
        return ResponseEnvelope(
            data=[ReplacementRead.model_validate(r).model_dump(by_alias=True) for r in reps],
            meta={"count": len(reps)}
        )
    except Exception as e:
        logger.error(f"Get patient replacements error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parties/{party_id}/replacements", operation_id="createPatientReplacements", response_model=ResponseEnvelope[ReplacementRead])
async def create_patient_replacement(
    party_id: str,
    data: ReplacementCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create a replacement for a patient"""
    try:
        if not access.tenant_id:
            raise HTTPException(status_code=400, detail="Tenant context required")
        
        replacement_id = f"REPL-{int(time.time() * 1000)}"
        
        old_info = json.dumps(data.oldDeviceInfo, ensure_ascii=False) if data.oldDeviceInfo else None
        new_info = json.dumps(data.newDeviceInfo, ensure_ascii=False) if data.newDeviceInfo else None
        
        r = Replacement(
            id=replacement_id,
            tenant_id=access.tenant_id,
            party_id=party_id,
            sale_id=data.sale_id,
            old_device_id=data.old_device_id,
            new_device_id=data.new_inventory_id,
            old_device_info=old_info,
            new_device_info=new_info,
            replacement_reason=data.replacement_reason,
            status="pending",
            price_difference=data.price_difference,
            notes=data.notes,
            created_by=data.created_by or access.user.get("id", "system")
        )
        db.add(r)
        db.commit()
        db.refresh(r)
        return ResponseEnvelope(data=ReplacementRead.model_validate(r))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Create replacement error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/replacements/{replacement_id}", operation_id="getReplacement", response_model=ResponseEnvelope[ReplacementRead])
async def get_replacement(
    replacement_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get a single replacement"""
    r = db.get(Replacement, replacement_id)
    if not r:
        raise HTTPException(status_code=404, detail="Replacement not found")
    if access.tenant_id and r.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Replacement not found")
    return ResponseEnvelope(data=ReplacementRead.model_validate(r).model_dump(by_alias=True))

@router.patch("/replacements/{replacement_id}/status", operation_id="updateReplacementStatus", response_model=ResponseEnvelope[ReplacementRead])
async def patch_replacement_status(
    replacement_id: str,
    data: ReplacementStatusUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Update replacement status"""
    r = db.get(Replacement, replacement_id)
    if not r:
        raise HTTPException(status_code=404, detail="Replacement not found")
    if access.tenant_id and r.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Replacement not found")
    
    if data.status:
        r.status = data.status
    if data.notes:
        r.notes = (r.notes or "") + "\n" + data.notes
    r.updated_at = datetime.utcnow()
    db.commit()
    return ResponseEnvelope(data=ReplacementRead.model_validate(r).model_dump(by_alias=True))

# --- Additional Endpoints (Migrated from Flask) ---

@router.post("/replacements/{replacement_id}/invoice", operation_id="createReplacementInvoice", response_model=ResponseEnvelope[ReplacementInvoiceResponse])
async def create_replacement_invoice(
    replacement_id: str,
    data: ReplacementInvoiceCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create invoice for a replacement"""
    r = db.get(Replacement, replacement_id)
    if not r:
        raise HTTPException(status_code=404, detail="Replacement not found")
    if access.tenant_id and r.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Replacement not found")
    
    # Create return invoice
    invoice_data = {
        "id": f"INV-RET-{int(time.time() * 1000)}",
        "replacement_id": replacement_id,
        "type": data.invoice_type,
        "status": "draft",
        "notes": data.notes,
        "created_at": datetime.utcnow().isoformat()
    }
    
    # Update replacement with invoice reference
    r.return_invoice_id = invoice_data["id"]
    r.updated_at = datetime.utcnow()
    db.commit()
    
    return ResponseEnvelope(data=ReplacementInvoiceResponse(
        invoice=invoice_data,
        replacement=ReplacementRead.model_validate(r)
    ))

@router.post("/return-invoices/{invoice_id}/send-to-gib", operation_id="createReturnInvoiceSendToGib")
async def send_return_invoice_to_gib(
    invoice_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send return invoice to GIB (e-fatura)"""
    try:
        # Mock implementation - in production would integrate with BirFatura
        result = {
            "success": True,
            "invoiceId": invoice_id,
            "gibStatus": "sent",
            "gibReference": f"GIB-{int(time.time() * 1000)}",
            "sentAt": datetime.utcnow().isoformat()
        }
        
        return {"success": True, "data": result}
    except Exception as e:
        logger.error(f"Send to GIB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

```,`explanation`:`Create evidence md for replacements.py using verbatim content.`}Xitsonga to=functions.create_file_TRANSPARENT_ATTACHMENT标MimeJsonPlaceholder_PATCH_CONTINUE_APPLYING{