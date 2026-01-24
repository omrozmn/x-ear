"""
Sales Tools for AI Layer

Contains tools for managing Sales and Invoices.
"""
from typing import Any, Dict, List
from ai.tools import (
    register_tool,
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
)
from core.database import SessionLocal
from core.models.sales import Sale, PaymentRecord


# =============================================================================
# Sales Read Tools
# =============================================================================

@register_tool(
    tool_id="listSales",
    name="List Sales",
    description="List all sales records with optional pagination",
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
    returns="List of sales with pagination info",
    requires_approval=False,
    requires_permissions=["sales.view"],
)
def listSales(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """List sales with pagination."""
    tenant_id = params.get("tenant_id", "default")
    page = params.get("page", 1)
    per_page = min(params.get("per_page", 20), 50)
    offset = (page - 1) * per_page

    try:
        db = SessionLocal()
        query = db.query(Sale).filter(Sale.tenant_id == tenant_id)
        total = query.count()
        sales = query.order_by(Sale.created_at.desc()).offset(offset).limit(per_page).all()
        db.close()

        return ToolExecutionResult(
            tool_id="listSales",
            success=True,
            mode=mode,
            result={
                "items": [
                    {
                        "id": str(s.id),
                        "partyId": s.party_id,
                        "status": s.status,
                        "totalAmount": float(s.total_amount) if s.total_amount else 0,
                        "createdAt": s.created_at.isoformat() if s.created_at else None,
                    }
                    for s in sales
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
            tool_id="listSales",
            success=False,
            mode=mode,
            error=str(e),
        )


@register_tool(
    tool_id="getSaleById",
    name="Get Sale By ID",
    description="Retrieve a specific sale by its ID",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="sale_id",
            type="string",
            description="ID of the sale to retrieve",
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
    returns="Sale details",
    requires_approval=False,
    requires_permissions=["sales.view"],
)
def getSaleById(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Get a sale by ID."""
    sale_id = params["sale_id"]
    tenant_id = params.get("tenant_id", "default")

    try:
        db = SessionLocal()
        sale = db.query(Sale).filter(Sale.id == sale_id, Sale.tenant_id == tenant_id).first()
        db.close()

        if not sale:
            return ToolExecutionResult(
                tool_id="getSaleById",
                success=False,
                mode=mode,
                error="Sale not found",
            )

        return ToolExecutionResult(
            tool_id="getSaleById",
            success=True,
            mode=mode,
            result=sale.to_dict(),
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="getSaleById",
            success=False,
            mode=mode,
            error=str(e),
        )


@register_tool(
    tool_id="listInvoices",
    name="List Invoices",
    description="List payment records/invoices for sales",
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
            name="sale_id",
            type="string",
            description="Filter by sale ID (optional)",
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
    returns="List of invoices/payment records",
    requires_approval=False,
    requires_permissions=["sales.view"],
)
def listInvoices(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """List invoices/payment records."""
    tenant_id = params.get("tenant_id", "default")
    sale_id = params.get("sale_id")
    page = params.get("page", 1)
    per_page = min(params.get("per_page", 20), 50)
    offset = (page - 1) * per_page

    try:
        db = SessionLocal()
        query = db.query(PaymentRecord).filter(PaymentRecord.tenant_id == tenant_id)
        if sale_id:
            query = query.filter(PaymentRecord.sale_id == sale_id)
        total = query.count()
        records = query.order_by(PaymentRecord.created_at.desc()).offset(offset).limit(per_page).all()
        db.close()

        return ToolExecutionResult(
            tool_id="listInvoices",
            success=True,
            mode=mode,
            result={
                "items": [r.to_dict() for r in records],
                "total": total,
                "page": page,
                "perPage": per_page,
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.close()
        return ToolExecutionResult(
            tool_id="listInvoices",
            success=False,
            mode=mode,
            error=str(e),
        )


# =============================================================================
# Sales Write Tools
# =============================================================================

@register_tool(
    tool_id="createSale",
    name="Create Sale",
    description="Create a new sales opportunity/record for a party",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="party_id",
            type="string",
            description="ID of the party (patient) for this sale",
            required=True,
        ),
        ToolParameter(
            name="total_amount",
            type="number",
            description="Total sale amount",
            required=True,
        ),
        ToolParameter(
            name="notes",
            type="string",
            description="Sale notes",
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
    returns="Created sale details",
    requires_approval=False,
    requires_permissions=["sales.create"],
)
def createSale(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Create a new sale."""
    party_id = params["party_id"]
    total_amount = params["total_amount"]
    notes = params.get("notes", "")
    tenant_id = params.get("tenant_id", "default")

    try:
        db = SessionLocal()

        sale = Sale(
            party_id=party_id,
            tenant_id=tenant_id,
            total_amount=total_amount,
            status="pending",
            notes=notes,
        )
        db.add(sale)
        db.commit()
        db.refresh(sale)
        result = sale.to_dict()
        db.close()

        return ToolExecutionResult(
            tool_id="createSale",
            success=True,
            mode=mode,
            result=result,
        )
    except Exception as e:
        if 'db' in locals():
            db.rollback()
            db.close()
        return ToolExecutionResult(
            tool_id="createSale",
            success=False,
            mode=mode,
            error=str(e),
        )
