"""Admin Patients Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
import logging

from database import get_db
from core.models.party import Party
from models.tenant import Tenant
from models.sales import DeviceAssignment, Sale
from models.user import ActivityLog
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope
from schemas.parties import PartyRead
from schemas.sales import DeviceAssignmentRead, SaleRead
from schemas.audit import AuditLogRead
from schemas.documents import DocumentRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/parties", tags=["Admin Parties"])

# Response models
class PartyListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class PartyDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.get("", operation_id="listAdminParties", response_model=PartyListResponse)
async def get_all_parties(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
    """Get list of ALL parties from ALL tenants"""
    try:
        query = db.query(Party)
        
        if search:
            query = query.filter(
                (Party.first_name.ilike(f"%{search}%")) |
                (Party.last_name.ilike(f"%{search}%")) |
                (Party.tc_number.ilike(f"%{search}%")) |
                (Party.phone.ilike(f"%{search}%"))
            )
        
        total = query.count()
        parties = query.order_by(Party.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        parties_list = []
        for p in parties:
            p_dict = PartyRead.model_validate(p).model_dump(by_alias=True)
            if p.tenant_id:
                tenant = db.get(Tenant, p.tenant_id)
                if tenant:
                    p_dict["tenantName"] = tenant.name
            parties_list.append(p_dict)
        
        return ResponseEnvelope(
            data={
                "parties": parties_list,
                "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
            }
        )
    except Exception as e:
        logger.error(f"Get all patients error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{party_id}", operation_id="getAdminParty", response_model=PartyDetailResponse)
async def get_party_detail(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
    """Get single party detail"""
    try:
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        party_dict = PartyRead.model_validate(party).model_dump(by_alias=True)
        if party.tenant_id:
            tenant = db.get(Tenant, party.tenant_id)
            if tenant:
                party_dict["tenantName"] = tenant.name
        return ResponseEnvelope(data=party_dict)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient detail error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{party_id}/devices", operation_id="listAdminPartyDevices", response_model=ResponseEnvelope)
async def get_party_devices(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
    """Get devices for a party"""
    try:
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        devices = db.query(DeviceAssignment).filter(DeviceAssignment.party_id == party_id).all()
        return ResponseEnvelope(data={"devices": [DeviceAssignmentRead.model_validate(d).model_dump(by_alias=True) for d in devices]})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient devices error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{party_id}/sales", operation_id="listAdminPartySales", response_model=ResponseEnvelope)
async def get_party_sales(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
    """Get sales for a party"""
    try:
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        sales = db.query(Sale).filter(Sale.party_id == party_id).all()
        return ResponseEnvelope(data={"sales": [SaleRead.model_validate(s).model_dump(by_alias=True) for s in sales]})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient sales error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{party_id}/timeline", operation_id="listAdminPartyTimeline", response_model=ResponseEnvelope)
async def get_party_timeline(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
    """Get timeline/activity log for a party"""
    try:
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        activities = db.query(ActivityLog).filter(
            ActivityLog.entity_id == party_id
        ).order_by(ActivityLog.created_at.desc()).all()
        return ResponseEnvelope(data={"timeline": [AuditLogRead.model_validate(a).model_dump(by_alias=True) for a in activities]})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient timeline error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{party_id}/documents", operation_id="listAdminPartyDocuments", response_model=ResponseEnvelope)
async def get_party_documents(
    party_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("parties.read", admin_only=True))
):
    """Get documents for a party"""
    try:
        party = db.get(Party, party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        # Get documents from party's custom_data if available
        documents = []
        if hasattr(party, 'custom_data_json') and party.custom_data_json:
            documents = party.custom_data_json.get('documents', [])
        
        # Also try to get from Document model if exists
        try:
            from models.document import Document
            doc_records = db.query(Document).filter(Document.party_id == party_id).all()
            documents.extend([DocumentRead.model_validate(d).model_dump(by_alias=True) for d in doc_records])
        except Exception:
            pass
        
        return {"success": True, "data": {"documents": documents}}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Get patient documents error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
