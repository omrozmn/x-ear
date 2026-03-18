"""Admin Tickets Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.exc import OperationalError
from typing import Optional
from datetime import datetime, timezone
import logging

from core.database import get_db
from core.database import unbound_session
from middleware.unified_access import UnifiedAccess, require_access
from schemas.tickets import TicketCreate, TicketUpdate, TicketResponseCreate
from schemas.base import ResponseEnvelope
from core.models.ticket import Ticket, TicketResponse, TicketStatus, TicketPriority
from core.models.tenant import Tenant
from core.models.notification import Notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/tickets", tags=["Admin Tickets"])


def _build_notification_ticket_rows(
    db: Session,
    page: int,
    limit: int,
    status: Optional[str],
    priority: Optional[str],
    search: Optional[str],
):
    """Fallback legacy support source backed by notifications."""
    query = db.query(Notification)

    if priority:
        query = query.filter(Notification.priority == priority)

    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            or_(
                Notification.title.ilike(search_pattern),
                Notification.message.ilike(search_pattern),
            )
        )

    total = query.count()
    notifications = (
        query.order_by(Notification.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    tickets = []
    for notification in notifications:
        tenant_name = None
        if notification.tenant_id:
            tenant = db.query(Tenant).filter(Tenant.id == notification.tenant_id).first()
            if tenant:
                tenant_name = tenant.name

        read_state = bool(getattr(notification, "is_read", False))
        mapped_status = "resolved" if read_state else "open"
        if status and status != mapped_status:
            continue

        raw_priority = (notification.priority or "").lower()
        mapped_priority = raw_priority if raw_priority in {"low", "medium", "high", "urgent"} else "medium"

        tickets.append({
            "id": notification.id,
            "title": notification.title,
            "description": notification.message,
            "status": mapped_status,
            "priority": mapped_priority,
            "category": "general",
            "tenantId": notification.tenant_id,
            "tenantName": tenant_name,
            "assignedTo": None,
            "assignedAdminName": None,
            "slaDueDate": getattr(notification, "expires_at", None).isoformat() if getattr(notification, "expires_at", None) else None,
            "createdBy": notification.user_id,
            "createdAt": notification.created_at.isoformat() if notification.created_at else None,
            "updatedAt": notification.updated_at.isoformat() if notification.updated_at else None,
        })

    return tickets, total


@router.get("", operation_id="listAdminTickets", response_model=ResponseEnvelope[dict])
async def get_admin_tickets(
    page: int = Query(1, ge=1, le=10000),
    limit: int = Query(10, ge=1, le=100),
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.read", admin_only=True))
):
    """Get list of tickets"""
    try:
        with unbound_session(reason="admin-cross-tenant"):
            try:
                query = db.query(Ticket)
            
                if status:
                    try:
                        query = query.filter(Ticket.status == TicketStatus(status))
                    except ValueError:
                        pass
            
                if priority:
                    try:
                        query = query.filter(Ticket.priority == TicketPriority(priority))
                    except ValueError:
                        pass
            
                if search:
                    search_pattern = f"%{search}%"
                    query = query.filter(
                        or_(
                            Ticket.title.ilike(search_pattern),
                            Ticket.description.ilike(search_pattern)
                        )
                    )
            
                total = query.count()
            
                tickets = query.order_by(Ticket.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
            except OperationalError:
                tickets, total = _build_notification_ticket_rows(db, page, limit, status, priority, search)
                return ResponseEnvelope(
                    success=True,
                    data={
                        "tickets": tickets,
                        "pagination": {
                            "page": page,
                            "limit": limit,
                            "perPage": limit,
                            "total": total,
                            "totalPages": (total + limit - 1) // limit
                        }
                    }
                )
        
        # Format response
        tickets_data = []
        for ticket in tickets:
            # Get tenant name if tenant_id exists
            tenant_name = None
            if ticket.tenant_id:
                tenant = db.query(Tenant).filter(Tenant.id == ticket.tenant_id).first()
                if tenant:
                    tenant_name = tenant.name
            
            # Get assigned admin name
            assigned_admin_name = None
            if ticket.assigned_admin:
                assigned_admin_name = f"{ticket.assigned_admin.first_name} {ticket.assigned_admin.last_name}"
            
            tickets_data.append({
                "id": ticket.id,
                "title": ticket.title,
                "description": ticket.description,
                "status": ticket.status.value if isinstance(ticket.status, TicketStatus) else ticket.status,
                "priority": ticket.priority.value if isinstance(ticket.priority, TicketPriority) else ticket.priority,
                "category": ticket.category.value if hasattr(ticket.category, 'value') else ticket.category,
                "tenantId": ticket.tenant_id,
                "tenantName": tenant_name,
                "assignedTo": ticket.assigned_to,
                "assignedAdminName": assigned_admin_name,
                "slaDueDate": ticket.sla_due_date.isoformat() if ticket.sla_due_date else None,
                "createdBy": ticket.created_by,
                "createdAt": ticket.created_at.isoformat() if ticket.created_at else None,
                "updatedAt": ticket.updated_at.isoformat() if ticket.updated_at else None,
            })
        
        return ResponseEnvelope(
            success=True,
            data={
                "tickets": tickets_data,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "perPage": limit,
                    "total": total,
                    "totalPages": (total + limit - 1) // limit
                }
            }
        )
    except Exception as e:
        logger.error(f"Error listing tickets: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("", operation_id="createAdminTicket", response_model=ResponseEnvelope[dict])
async def create_admin_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.manage", admin_only=True))
):
    """Create a new ticket"""
    try:
        # Resolve tenant_id: use request body first, fallback for super_admin with 'system'
        tenant_id = data.tenant_id
        if not tenant_id or tenant_id == 'system':
            if access.effective_tenant_id and access.effective_tenant_id != 'system':
                tenant_id = access.effective_tenant_id
            elif access.tenant_id and access.tenant_id != 'system':
                tenant_id = access.tenant_id
            else:
                # Pick first real tenant from DB
                first_tenant = db.query(Tenant).first()
                tenant_id = first_tenant.id if first_tenant else None

        # Create ticket
        ticket = Ticket(
            title=data.title,
            description=data.description,
            priority=data.priority,
            category=data.category,
            tenant_id=tenant_id,
            created_by=access.user.id if access.user else None,
            status=TicketStatus.OPEN,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        
        # Calculate SLA due date
        ticket.calculate_sla_due_date()
        
        db.add(ticket)
        db.commit()
        db.refresh(ticket)
        
        return ResponseEnvelope(
            success=True,
            data={
                "ticket": {
                    "id": ticket.id,
                    "title": ticket.title,
                    "description": ticket.description,
                    "status": ticket.status.value,
                    "priority": ticket.priority.value,
                    "category": ticket.category.value,
                    "tenantId": ticket.tenant_id,
                    "slaDueDate": ticket.sla_due_date.isoformat() if ticket.sla_due_date else None,
                    "createdAt": ticket.created_at.isoformat(),
                }
            }
        )
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating ticket: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{ticket_id}", operation_id="updateAdminTicket", response_model=ResponseEnvelope[dict])
async def update_admin_ticket(
    ticket_id: str,
    data: TicketUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.manage", admin_only=True))
):
    """Update a ticket"""
    if not ticket_id or len(ticket_id) > 200 or not ticket_id.isprintable():
        raise HTTPException(status_code=400, detail="Invalid ticket ID")
    try:
        with unbound_session(reason="admin-cross-tenant"):
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        # Update fields
        if data.title is not None:
            ticket.title = data.title
        if data.description is not None:
            ticket.description = data.description
        if data.status is not None:
            ticket.status = data.status
            # Update resolved/closed timestamps
            if data.status == TicketStatus.RESOLVED and not ticket.resolved_at:
                ticket.mark_resolved()
            elif data.status == TicketStatus.CLOSED and not ticket.closed_at:
                ticket.mark_closed()
        if data.priority is not None:
            ticket.priority = data.priority
            # Recalculate SLA if priority changed
            ticket.calculate_sla_due_date()
        if data.category is not None:
            ticket.category = data.category
        if data.assigned_to is not None:
            ticket.assigned_to = data.assigned_to
        
        db.commit()
        db.refresh(ticket)
        
        return ResponseEnvelope(
            success=True,
            data={
                "ticket": {
                    "id": ticket.id,
                    "title": ticket.title,
                    "description": ticket.description,
                    "status": ticket.status.value,
                    "priority": ticket.priority.value,
                    "category": ticket.category.value,
                    "assignedTo": ticket.assigned_to,
                    "updatedAt": ticket.updated_at.isoformat(),
                }
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating ticket: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{ticket_id}/responses", operation_id="createAdminTicketResponse", response_model=ResponseEnvelope[dict])
async def create_ticket_response(
    ticket_id: str,
    data: TicketResponseCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("tickets.manage", admin_only=True))
):
    """Add a response to a ticket"""
    if not ticket_id or len(ticket_id) > 200 or not ticket_id.isprintable():
        raise HTTPException(status_code=400, detail="Invalid ticket ID")
    try:
        with unbound_session(reason="admin-cross-tenant"):
            ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            raise HTTPException(status_code=404, detail="Ticket not found")

        # Create response
        response = TicketResponse(
            ticket_id=ticket_id,
            message=data.message,
            created_by=access.user.id if access.user else "system",
            is_internal='false'
        )
        
        db.add(response)
        db.commit()
        db.refresh(response)
        
        return ResponseEnvelope(
            success=True,
            data={
                "response": {
                    "id": response.id,
                    "ticketId": response.ticket_id,
                    "message": response.message,
                    "createdBy": response.created_by,
                    "createdAt": response.created_at.isoformat(),
                }
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating ticket response: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
