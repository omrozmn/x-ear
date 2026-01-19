"""Admin Appointments Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging

from database import get_db
from models.appointment import Appointment
from core.models.party import Party
from models.tenant import Tenant
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope
from schemas.appointments import AppointmentRead  # Import AppointmentRead schema

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/appointments", tags=["Admin Appointments"])

# Response models
class AppointmentListResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.get("", operation_id="listAdminAppointments", response_model=AppointmentListResponse)
async def get_all_appointments(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    tenant_id: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("appointments.read", admin_only=True))
):
    """Get list of ALL appointments from ALL tenants"""
    try:
        query = db.query(Appointment).join(Party)
        
        if search:
            query = query.filter(
                (Party.first_name.ilike(f"%{search}%")) |
                (Party.last_name.ilike(f"%{search}%")) |
                (Party.phone.ilike(f"%{search}%"))
            )
        
        if access.tenant_id:
            query = query.filter(Appointment.tenant_id == access.tenant_id)
        
        if status:
            query = query.filter(Appointment.status == status)
        
        if start_date:
            try:
                start = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
                query = query.filter(Appointment.date >= start)
            except ValueError:
                pass
        
        if end_date:
            try:
                end = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                query = query.filter(Appointment.date <= end)
            except ValueError:
                pass
        
        total = query.count()
        appointments = query.order_by(
            Appointment.date.desc(), 
            Appointment.time.desc()
        ).offset((page - 1) * limit).limit(limit).all()
        
        appointments_list = []
        for appt in appointments:
            # Use Pydantic schema for type-safe serialization (NO to_dict())
            appt_data = AppointmentRead.model_validate(appt).model_dump(by_alias=True)
            
            # Add party name if available (using party relationship, not legacy patient)
            if appt.party:
                appt_data["partyName"] = f"{appt.party.first_name} {appt.party.last_name}"
            
            # Add tenant name for admin view
            if appt.tenant_id:
                tenant = db.get(Tenant, appt.tenant_id)
                if tenant:
                    appt_data["tenantName"] = tenant.name
            
            appointments_list.append(appt_data)
        
        return {
            "success": True,
            "data": {
                "appointments": appointments_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "totalPages": (total + limit - 1) // limit
                }
            }
        }
    except Exception as e:
        logger.error(f"Get all appointments error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
