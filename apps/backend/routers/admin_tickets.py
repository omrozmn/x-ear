"""Admin Tickets Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import uuid
import logging

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.tickets import TicketCreate, TicketUpdate, TicketRead
from schemas.base import ResponseEnvelope

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/tickets", tags=["Admin Tickets"])

# Response models
class TicketListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class TicketDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

# Mock data for tickets
MOCK_TICKETS = [
    {
        "id": "1",
        "title": "Login Issue",
        "description": "User cannot login",
        "status": "open",
        "priority": "high",
        "category": "technical",
        "tenant_id": "tenant-1",
        "tenant_name": "Acme Corp",
        "created_by": "John Doe",
        "created_at": datetime.utcnow().isoformat(),
        "sla_due_date": datetime.utcnow().isoformat()
    }
]

@router.get("", response_model=TicketListResponse)
async def get_admin_tickets(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.read", admin_only=True))
):
    """Get list of tickets"""
    filtered = MOCK_TICKETS.copy()
    
    if status:
        filtered = [t for t in filtered if t["status"] == status]
    if priority:
        filtered = [t for t in filtered if t["priority"] == priority]
    if search:
        search = search.lower()
        filtered = [t for t in filtered if search in t["title"].lower() or search in t.get("description", "").lower()]
    
    total = len(filtered)
    start = (page - 1) * limit
    paginated = filtered[start:start + limit]
    
    return {
        "success": True,
        "data": {
            "tickets": paginated,
            "pagination": {"page": page, "limit": limit, "total": total, "totalPages": (total + limit - 1) // limit}
        }
    }

@router.post("", response_model=TicketDetailResponse)
async def create_admin_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.manage", admin_only=True))
):
    """Create a new ticket"""
    new_ticket = {
        "id": str(uuid.uuid4()),
        "created_at": datetime.utcnow().isoformat(),
        "status": "open",
        "title": data.title,
        "description": data.description,
        "priority": data.priority,
        "category": data.category,
        "tenant_id": data.tenant_id
    }
    MOCK_TICKETS.append(new_ticket)
    return {"success": True, "data": {"ticket": new_ticket}}

@router.put("/{ticket_id}", operation_id="updateAdminTicket", response_model=TicketDetailResponse)
async def update_admin_ticket(
    ticket_id: str,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.manage", admin_only=True))
):
    """Update a ticket"""
    ticket = next((t for t in MOCK_TICKETS if t["id"] == ticket_id), None)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if data.title is not None:
        ticket["title"] = data.title
    if data.description is not None:
        ticket["description"] = data.description
    if data.status is not None:
        ticket["status"] = data.status
    if data.priority is not None:
        ticket["priority"] = data.priority
    if data.category is not None:
        ticket["category"] = data.category
    
    return {"success": True, "data": {"ticket": ticket}}
