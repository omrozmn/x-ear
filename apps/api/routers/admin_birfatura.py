"""Admin BirFatura Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional
from datetime import datetime, timezone, timedelta
import logging

from database import get_db
from core.database import unbound_session
from schemas.base import ResponseEnvelope
from schemas.birfatura import BirFaturaStats, BirFaturaLogsResponse, BirFaturaInvoicesResponse, InvoiceSyncResponse
from models.invoice import Invoice
from models.purchase_invoice import PurchaseInvoice
from models.user import ActivityLog
from middleware.unified_access import UnifiedAccess, require_access
from schemas.invoices import InvoiceRead
from schemas.purchase_invoices import PurchaseInvoiceRead
from schemas.audit import AuditLogRead
from services.birfatura.invoice_sync import InvoiceSyncService
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/birfatura", tags=["Admin BirFatura"])

@router.get("/stats", operation_id="listAdminBirfaturaStats", response_model=ResponseEnvelope[BirFaturaStats])
async def get_stats(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
    """Get BirFatura statistics"""
    try:
        with unbound_session(reason="admin-cross-tenant"):
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
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/invoices", operation_id="listAdminBirfaturaInvoices", response_model=ResponseEnvelope[BirFaturaInvoicesResponse])
async def get_invoices(
    page: int = Query(1, ge=1, le=10000),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    direction: str = Query("outgoing", pattern="^(outgoing|incoming)$"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
    """Get invoices with BirFatura status"""
    try:
        with unbound_session(reason="admin-cross-tenant"):
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
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/logs", operation_id="listAdminBirfaturaLogs", response_model=ResponseEnvelope[BirFaturaLogsResponse])
async def get_logs(
    page: int = Query(1, ge=1, le=10000),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
    """Get BirFatura related logs"""
    try:
        with unbound_session(reason="admin-cross-tenant"):
            query = db.query(ActivityLog).filter(
                or_(
                    ActivityLog.action.like("invoice.%"),
                    ActivityLog.action.like("birfatura.%")
                )
            )
            
            total = query.count()
            logs = query.order_by(ActivityLog.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return ResponseEnvelope(data={
            "logs": [AuditLogRead.model_validate(log).model_dump(by_alias=True) for log in logs],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "totalPages": (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Get BirFatura logs error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/sync/{tenant_id}", operation_id="createAdminBirfaturaSync", response_model=ResponseEnvelope[InvoiceSyncResponse])
async def admin_sync_invoices(
    tenant_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
    """Admin: Trigger invoice sync for a specific tenant"""
    try:
        with unbound_session(reason="admin-sync-tenant"):
            sync_service = InvoiceSyncService(db)
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=365)
            stats = sync_service.sync_invoices(tenant_id, start_date, end_date)

        incoming = stats.get('incoming', 0)
        outgoing = stats.get('outgoing', 0)
        return ResponseEnvelope(data=InvoiceSyncResponse(
            synced_count=incoming + outgoing,
            incoming=incoming,
            outgoing=outgoing,
            duplicates=stats.get('duplicates', 0),
        ))
    except Exception as e:
        logger.error(f"Admin sync error for tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/backfill/{tenant_id}", operation_id="createAdminBirfaturaBackfill")
async def admin_backfill_invoices(
    tenant_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("birfatura.read", admin_only=True))
):
    """Admin: Backfill invoice details for a specific tenant"""
    try:
        with unbound_session(reason="admin-backfill-tenant"):
            sync_service = InvoiceSyncService(db)
            stats = sync_service.backfill_invoice_items(tenant_id)
            out_stats = sync_service.backfill_outgoing_detail(tenant_id)

        return ResponseEnvelope(data={
            "backfilled": stats.get('updated', 0),
            "outgoing_backfilled": out_stats.get('updated', 0),
            "errors": stats.get('errors', 0) + out_stats.get('errors', 0),
        })
    except Exception as e:
        logger.error(f"Admin backfill error for tenant {tenant_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
