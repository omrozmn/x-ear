"""
CRM Tools for AI Layer

Contains tools for managing Patients (Parties) and Customers.
"""
from typing import Any, Dict
from ai.tools import (
    register_tool,
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
)
from core.database import SessionLocal
from services.party_service import PartyService

@register_tool(
    tool_id="patient_create",
    name="Create Patient",
    description="Create a new patient record with basic information",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="first_name",
            type="string",
            description="Patient's first name",
            required=True,
        ),
        ToolParameter(
            name="last_name",
            type="string",
            description="Patient's last name",
            required=True,
        ),
        ToolParameter(
            name="phone",
            type="string",
            description="Patient's phone number",
            required=True,
        ),
        ToolParameter(
            name="email",
            type="string",
            description="Patient's email address",
            required=False,
        ),
        ToolParameter(
            name="tc_number",
            type="string",
            description="Patient's TC Identity Number",
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
    returns="Created patient details",
    requires_approval=False,
    requires_permissions=["party:write"],
)
def patient_create(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Create a new patient."""
    first_name = params["first_name"]
    last_name = params["last_name"]
    phone = params["phone"]
    tenant_id = params["tenant_id"]
    
    # Optional params
    email = params.get("email")
    tc_number = params.get("tc_number")
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="patient_create",
            success=True,
            mode=mode,
            simulated_changes={
                "action": "create_patient",
                "first_name": first_name,
                "last_name": last_name,
                "phone": phone,
                "tenant_id": tenant_id,
            },
        )
    
    # Execute mode
    try:
        db = SessionLocal()
        service = PartyService(db)
        
        # Construct data dict for service
        data = {
            "firstName": first_name,
            "lastName": last_name,
            "phone": phone,
        }
        if email:
            data["email"] = email
        if tc_number:
            data["tcNumber"] = tc_number
            
        result = service.create_party(data, tenant_id)
        
        # Commit handled by service, close db
        db.close()
        
        return ToolExecutionResult(
            tool_id="patient_create",
            success=True,
            mode=mode,
            result={
                "id": str(result.id),
                "name": f"{result.first_name} {result.last_name}",
                "phone": result.phone,
                "status": "created"
            },
        )
        
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="patient_create",
            success=False,
            mode=mode,
            error=str(e),
        )
