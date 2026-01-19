"""Admin BirFatura Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional, List
import logging

from database import get_db
from schemas.base import ResponseEnvelope
from schemas.birfatura import BirFaturaStats, BirFaturaLogsResponse, BirFaturaInvoicesResponse
from models.invoice import Invoice
from models.purchase_invoice import PurchaseInvoice
from models.user import ActivityLog
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.invoices import InvoiceRead
from schemas.purchase_invoices import PurchaseInvoiceRead
from schemas.audit import ActivityLogRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/birfatura", tags=["Admin BirFatura"])

@router.get("/stats", operation_id="listAdminBirfaturaStats", response_model=ResponseEnvelope[BirFaturaStats])
async def get_stats(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
    """Get BirFatura statistics"""
    try:
        # Outgoing Invoices Stats
        outgoing_stats = db.query(
            Invoice.edocument_status,
            func.count(Invoice.id)
        ).filter(Invoice.edocument_status.isnot(None)).group_by(Invoice.edocument_status).all()
        
        outgoing_dict = {status: count for status, count in outgoing_stats}
        
        # Incoming Invoices Stats
        incoming_stats = db.query(
            PurchaseInvoice.status,
            func.count(PurchaseInvoice.id)
        ).group_by(PurchaseInvoice.status).all()
        
        incoming_dict = {status: count for status, count in incoming_stats}
        
        return ResponseEnvelope(data={
            "outgoing": outgoing_dict,
            "incoming": incoming_dict,
            "totalOutgoing": sum(outgoing_dict.values()),
            "totalIncoming": sum(incoming_dict.values())
        })
    except Exception as e:
        logger.error(f"Get BirFatura stats error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/invoices", operation_id="listAdminBirfaturaInvoices", response_model=ResponseEnvelope[BirFaturaInvoicesResponse])
async def get_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    direction: str = Query("outgoing", pattern="^(outgoing|incoming)$"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
    """Get invoices with BirFatura status"""
    try:
        if direction == "outgoing":
            query = db.query(Invoice).filter(Invoice.edocument_status.isnot(None))
            if status:
                query = query.filter(Invoice.edocument_status == status)
            
            total = query.count()
            invoices = query.order_by(Invoice.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
            data = [InvoiceRead.model_validate(inv).model_dump(by_alias=True) for inv in invoices]
        else:
            query = db.query(PurchaseInvoice)
            if status:
                query = query.filter(PurchaseInvoice.status == status)
            
            total = query.count()
            invoices = query.order_by(PurchaseInvoice.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
            data = [PurchaseInvoiceRead.model_validate(inv).model_dump(by_alias=True) for inv in invoices]
        
        return ResponseEnvelope(data={
            "invoices": data,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Get BirFatura invoices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs", operation_id="listAdminBirfaturaLogs", response_model=ResponseEnvelope[BirFaturaLogsResponse])
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
    """Get BirFatura related logs"""
    try:
        query = db.query(ActivityLog).filter(
            or_(
                ActivityLog.action.like("invoice.%"),
                ActivityLog.action.like("birfatura.%")
            )
        )
        
        total = query.count()
        logs = query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return ResponseEnvelope(data={
            "logs": [ActivityLogRead.model_validate(log).model_dump(by_alias=True) for log in logs],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Get BirFatura logs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
