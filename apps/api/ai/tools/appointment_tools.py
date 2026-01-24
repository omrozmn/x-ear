"""
Appointment Tools for AI Layer

Contains tools for managing Appointments.
"""
from typing import Any, Dict
from datetime import datetime
from ai.tools import (
    register_tool,
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
)
from core.database import SessionLocal
from core.models.appointment import Appointment


# =============================================================================
# Appointment Read Tools
# =============================================================================

@register_tool(
    tool_id="listAppointments",
    name="List Appointments",
    description="List scheduled appointments with optional filters",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID (automatically injected)",
            required=False,
            default="default",
        ),
        ToolParameter(
            name="user_id",
            type="string",
            description="User ID (automatically injected)",
            required=False,
        ),
        ToolParameter(
            name="party_id",
            type="string",
            description="Filter by patient ID",
            required=False,
        ),
        ToolParameter(
            name="date_from",
            type="string",
            description="Filter by start date (ISO format)",
            required=False,
        ),
        ToolParameter(
            name="page",
            type="integer",
            description="Page number",
            required=False,
            default=1,
        ),
        ToolParameter(
            name="per_page",
            type="integer",
            description="Items per page",
            required=False,
            default=20,
        ),
    ],
    returns="List of appointments",
    requires_approval=False,
    requires_permissions=["appointments.view"],
)
def listAppointments(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """List appointments with filters."""
    tenant_id = params.get("tenant_id", "default")
    party_id = params.get("party_id")
    date_from = params.get("date_from")
    page = params.get("page", 1)
    per_page = min(params.get("per_page", 20), 50)
    offset = (page - 1) * per_page

    try:
        db = SessionLocal()
        query = db.query(Appointment).filter(Appointment.tenant_id == tenant_id)

        if party_id:
            query = query.filter(Appointment.party_id == party_id)
        if date_from:
            try:
                date_obj = datetime.fromisoformat(date_from.replace('Z', '+00:00'))
                query = query.filter(Appointment.date >= date_obj)
            except ValueError:
                pass

        total = query.count()
        appointments = query.order_by(Appointment.date.desc()).offset(offset).limit(per_page).all()
        db.close()

        return ToolExecutionResult(
            tool_id="listAppointments",
            success=True,
            mode=mode,
            result={
                "items": [apt.to_dict() for apt in appointments],
                "total": total,
                "page": page,
                "perPage": per_page,
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="listAppointments",
            success=False,
            mode=mode,
            error=str(e),
        )


@register_tool(
    tool_id="getAppointmentById",
    name="Get Appointment By ID",
    description="Retrieve a specific appointment by its ID",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="appointment_id",
            type="string",
            description="ID of the appointment to retrieve",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID (automatically injected)",
            required=False,
            default="default",
        ),
    ],
    returns="Appointment details",
    requires_approval=False,
    requires_permissions=["appointments.view"],
)
def getAppointmentById(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Get an appointment by ID."""
    appointment_id = params["appointment_id"]
    tenant_id = params.get("tenant_id", "default")

    try:
        db = SessionLocal()
        apt = db.query(Appointment).filter(
            Appointment.id == appointment_id,
            Appointment.tenant_id == tenant_id
        ).first()
        db.close()

        if not apt:
            return ToolExecutionResult(
                tool_id="getAppointmentById",
                success=False,
                mode=mode,
                error="Appointment not found",
            )

        return ToolExecutionResult(
            tool_id="getAppointmentById",
            success=True,
            mode=mode,
            result=apt.to_dict(),
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="getAppointmentById",
            success=False,
            mode=mode,
            error=str(e),
        )


# =============================================================================
# Appointment Write Tools
# =============================================================================

@register_tool(
    tool_id="createAppointment",
    name="Create Appointment",
    description="Schedule a new appointment for a patient",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="party_id",
            type="string",
            description="ID of the patient",
            required=True,
        ),
        ToolParameter(
            name="date",
            type="string",
            description="Appointment date (ISO format)",
            required=True,
        ),
        ToolParameter(
            name="time",
            type="string",
            description="Appointment time (HH:MM format)",
            required=True,
        ),
        ToolParameter(
            name="appointment_type",
            type="string",
            description="Type of appointment (consultation, hearing_test, device_fitting, control)",
            required=False,
            default="consultation",
        ),
        ToolParameter(
            name="duration",
            type="integer",
            description="Duration in minutes",
            required=False,
            default=30,
        ),
        ToolParameter(
            name="notes",
            type="string",
            description="Appointment notes",
            required=False,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID (automatically injected)",
            required=False,
            default="default",
        ),
    ],
    returns="Created appointment details",
    requires_approval=False,
    requires_permissions=["appointments.create"],
)
def createAppointment(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Create a new appointment."""
    party_id = params["party_id"]
    date_str = params["date"]
    time_str = params["time"]
    appointment_type = params.get("appointment_type", "consultation")
    duration = params.get("duration", 30)
    notes = params.get("notes", "")
    tenant_id = params.get("tenant_id", "default")

    try:
        # Parse date
        date_obj = datetime.fromisoformat(date_str.replace('Z', '+00:00'))

        db = SessionLocal()

        appointment = Appointment(
            party_id=party_id,
            tenant_id=tenant_id,
            date=date_obj,
            time=time_str,
            appointment_type=appointment_type,
            duration=duration,
            notes=notes,
        )
        db.add(appointment)
        db.commit()
        db.refresh(appointment)
        result = appointment.to_dict()
        db.close()

        return ToolExecutionResult(
            tool_id="createAppointment",
            success=True,
            mode=mode,
            result=result,
        )
    except Exception as e:
        if 'db' in locals():
            db.rollback()
            db.close()
        return ToolExecutionResult(
            tool_id="createAppointment",
            success=False,
            mode=mode,
            error=str(e),
        )
