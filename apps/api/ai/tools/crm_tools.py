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
    tool_id="createParty",
    name="Create Party",
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
    requires_permissions=["parties.create"],
)
def createParty(
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

    # SIMULATE mode check
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="createParty",
            success=True,
            mode=mode,
            simulated_changes={
                "action": "create",
                "entity": "Party",
                "data": {
                    "first_name": first_name,
                    "last_name": last_name,
                    "phone": phone,
                    "email": email,
                    "tc_number": tc_number
                }
            }
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
            tool_id="createParty",
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
            tool_id="createParty",
            success=False,
            mode=mode,
            error=str(e),
        )


# =============================================================================
# Party Read Tools
# =============================================================================

@register_tool(
    tool_id="getPartyById",
    name="Get Party By ID",
    description="Retrieve a specific patient/party by their ID",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="party_id",
            type="string",
            description="ID of the party to retrieve",
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
    returns="Party details",
    requires_approval=False,
    requires_permissions=["parties.view"],
)
def getPartyById(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Get a party by ID."""
    party_id = params["party_id"]
    tenant_id = params.get("tenant_id", "default")

    try:
        db = SessionLocal()
        service = PartyService(db)
        party = service.get_party(party_id, tenant_id)
        db.close()

        return ToolExecutionResult(
            tool_id="getPartyById",
            success=True,
            mode=mode,
            result={
                "id": str(party.id),
                "firstName": party.first_name,
                "lastName": party.last_name,
                "phone": party.phone,
                "email": party.email,
                "status": party.status,
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="getPartyById",
            success=False,
            mode=mode,
            error=str(e),
        )


@register_tool(
    tool_id="listParties",
    name="List Parties",
    description="List all patients/parties with optional pagination",
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
            name="page",
            type="integer",
            description="Page number (1-indexed)",
            required=False,
            default=1,
        ),
        ToolParameter(
            name="per_page",
            type="integer",
            description="Items per page (max 50)",
            required=False,
            default=20,
        ),
    ],
    returns="List of parties with pagination info",
    requires_approval=False,
    requires_permissions=["parties.view"],
)
def listParties(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """List parties with pagination."""
    tenant_id = params.get("tenant_id", "default")
    page = params.get("page", 1)
    per_page = min(params.get("per_page", 20), 50)

    try:
        db = SessionLocal()
        service = PartyService(db)
        parties, total, _ = service.list_parties(tenant_id, page=page, per_page=per_page)
        db.close()

        return ToolExecutionResult(
            tool_id="listParties",
            success=True,
            mode=mode,
            result={
                "items": [
                    {
                        "id": str(p.id),
                        "firstName": p.first_name,
                        "lastName": p.last_name,
                        "phone": p.phone,
                    }
                    for p in parties
                ],
                "total": total,
                "page": page,
                "perPage": per_page,
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="listParties",
            success=False,
            mode=mode,
            error=str(e),
        )


@register_tool(
    tool_id="searchParties",
    name="Search Parties",
    description="Search patients/parties by name, phone, or email",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="search",
            type="string",
            description="Search query (name, phone, or email)",
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
    returns="List of matching parties",
    requires_approval=False,
    requires_permissions=["parties.view"],
)
def searchParties(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Search parties by query."""
    search = params["search"]
    tenant_id = params.get("tenant_id", "default")

    try:
        db = SessionLocal()
        service = PartyService(db)
        parties, total, _ = service.list_parties(tenant_id, search=search, per_page=20)
        db.close()

        return ToolExecutionResult(
            tool_id="searchParties",
            success=True,
            mode=mode,
            result={
                "items": [
                    {
                        "id": str(p.id),
                        "firstName": p.first_name,
                        "lastName": p.last_name,
                        "phone": p.phone,
                    }
                    for p in parties
                ],
                "total": total,
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="searchParties",
            success=False,
            mode=mode,
            error=str(e),
        )


@register_tool(
    tool_id="updateParty",
    name="Update Party",
    description="Update patient/party information",
    category=ToolCategory.CONFIG,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="party_id",
            type="string",
            description="ID of the party to update",
            required=True,
        ),
        ToolParameter(
            name="updates",
            type="object",
            description="Fields to update (firstName, lastName, phone, email, etc.)",
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
    returns="Updated party details",
    requires_approval=False,
    requires_permissions=["parties.edit"],
)
def updateParty(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Update a party."""
    party_id = params["party_id"]
    updates = params["updates"]
    tenant_id = params.get("tenant_id", "default")

    # SIMULATE mode check
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="updateParty",
            success=True,
            mode=mode,
            simulated_changes={
                "action": "update",
                "entity": "Party",
                "party_id": party_id,
                "updates": updates
            }
        )

    try:
        db = SessionLocal()
        service = PartyService(db)
        party = service.update_party(party_id, updates, tenant_id)
        db.close()

        return ToolExecutionResult(
            tool_id="updateParty",
            success=True,
            mode=mode,
            result={
                "id": str(party.id),
                "firstName": party.first_name,
                "lastName": party.last_name,
                "phone": party.phone,
                "status": "updated",
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="updateParty",
            success=False,
            mode=mode,
            error=str(e),
        )
