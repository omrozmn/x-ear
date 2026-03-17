"""
AI Tools for Business Operations: Proformas, Payments, Campaigns, Documents.

These fill the critical gaps between what the app can do and what AI exposes.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict

from core.database import SessionLocal
from ai.tools import (
    ToolParameter, ToolCategory, RiskLevel,
    ToolExecutionMode, ToolExecutionResult, register_tool,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Proforma / Quote Tools
# =============================================================================

@register_tool(
    tool_id="listProformas",
    name="List Proformas/Quotes",
    description="List price quotes (proformas) for a patient or tenant",
    category=ToolCategory.USER_DATA,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
        ToolParameter(name="party_id", type="string", description="Patient ID (optional)", required=False),
        ToolParameter(name="status", type="string", description="Filter by status: pending, accepted, rejected, converted", required=False),
    ],
    returns="List of proformas",
    requires_approval=False,
    requires_permissions=["invoices.view"],
)
def listProformas(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """List proformas/quotes."""
    tenant_id = params["tenant_id"]
    party_id = params.get("party_id")
    status = params.get("status")
    try:
        db = SessionLocal()
        from core.models.invoice import Proforma
        query = db.query(Proforma).filter(Proforma.tenant_id == tenant_id)
        if party_id:
            query = query.filter(Proforma.party_id == party_id)
        if status:
            query = query.filter(Proforma.status == status)
        proformas = query.order_by(Proforma.created_at.desc()).limit(20).all()
        db.close()

        return ToolExecutionResult(
            tool_id="listProformas", success=True, mode=mode,
            result={
                "items": [p.to_dict() for p in proformas] if hasattr(proformas[0], 'to_dict') and proformas else [
                    {"id": p.id, "proformaNumber": p.proforma_number, "patientName": p.patient_name, "status": p.status}
                    for p in proformas
                ],
                "total": len(proformas),
            },
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="listProformas", success=False, mode=mode, error=str(e))


# =============================================================================
# Payment Tools
# =============================================================================

@register_tool(
    tool_id="recordPayment",
    name="Record Payment",
    description="Record a customer payment against a sale",
    category=ToolCategory.ACTION,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="sale_id", type="string", description="Sale ID", required=True),
        ToolParameter(name="amount", type="number", description="Payment amount", required=True),
        ToolParameter(name="payment_method", type="string", description="Payment method", required=True,
                      enum=["cash", "credit_card", "bank_transfer", "check"]),
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
        ToolParameter(name="notes", type="string", description="Payment notes", required=False),
    ],
    returns="Payment record",
    requires_approval=False,
    requires_permissions=["cash_records.write"],
)
def recordPayment(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Record a customer payment."""
    sale_id = params["sale_id"]
    amount = params["amount"]
    payment_method = params["payment_method"]
    tenant_id = params["tenant_id"]

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="recordPayment", success=True, mode=mode,
            simulated_changes={"sale_id": sale_id, "amount": amount, "method": payment_method},
        )
    try:
        db = SessionLocal()
        from core.models.sales import PaymentRecord, Sale
        from core.models.base import gen_id

        sale = db.query(Sale).filter(Sale.id == sale_id, Sale.tenant_id == tenant_id).first()
        if not sale:
            db.close()
            return ToolExecutionResult(tool_id="recordPayment", success=False, mode=mode, error="Sale not found")

        payment = PaymentRecord(
            id=gen_id("pay"),
            sale_id=sale_id,
            party_id=sale.party_id,
            tenant_id=tenant_id,
            amount=amount,
            payment_method=payment_method,
            status="paid",
            notes=params.get("notes", ""),
            payment_date=datetime.now(timezone.utc),
        )
        db.add(payment)

        # Update sale paid_amount
        sale.paid_amount = (sale.paid_amount or 0) + amount
        db.commit()
        payment_id = payment.id
        db.close()

        return ToolExecutionResult(
            tool_id="recordPayment", success=True, mode=mode,
            result={"payment_id": payment_id, "sale_id": sale_id, "amount": amount, "method": payment_method, "status": "recorded"},
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="recordPayment", success=False, mode=mode, error=str(e))


@register_tool(
    tool_id="listPayments",
    name="List Payments",
    description="List payment records for a sale or patient",
    category=ToolCategory.USER_DATA,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
        ToolParameter(name="party_id", type="string", description="Patient ID (optional)", required=False),
        ToolParameter(name="sale_id", type="string", description="Sale ID (optional)", required=False),
    ],
    returns="Payment history",
    requires_approval=False,
    requires_permissions=["cash_records.view"],
)
def listPayments(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """List payments."""
    tenant_id = params["tenant_id"]
    try:
        db = SessionLocal()
        from core.models.sales import PaymentRecord
        query = db.query(PaymentRecord).filter(PaymentRecord.tenant_id == tenant_id)
        if params.get("party_id"):
            query = query.filter(PaymentRecord.party_id == params["party_id"])
        if params.get("sale_id"):
            query = query.filter(PaymentRecord.sale_id == params["sale_id"])
        payments = query.order_by(PaymentRecord.payment_date.desc()).limit(20).all()
        db.close()

        return ToolExecutionResult(
            tool_id="listPayments", success=True, mode=mode,
            result={
                "items": [
                    {"id": p.id, "amount": float(p.amount or 0), "method": p.payment_method, "date": str(p.payment_date), "status": p.status}
                    for p in payments
                ],
                "total": len(payments),
            },
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="listPayments", success=False, mode=mode, error=str(e))


# =============================================================================
# Campaign Tools
# =============================================================================

@register_tool(
    tool_id="createCampaign",
    name="Create Campaign",
    description="Create an SMS or email campaign targeting a patient segment",
    category=ToolCategory.ACTION,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
        ToolParameter(name="name", type="string", description="Campaign name", required=True),
        ToolParameter(name="campaign_type", type="string", description="Type", required=True, enum=["sms", "email"]),
        ToolParameter(name="message", type="string", description="Message text", required=True),
        ToolParameter(name="target_segment", type="string", description="Target segment", required=False,
                      enum=["all", "lead", "customer", "trial", "inactive"]),
    ],
    returns="Campaign details",
    requires_approval=True,
    requires_permissions=["campaigns.write"],
)
def createCampaign(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Create a campaign."""
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="createCampaign", success=True, mode=mode,
            simulated_changes={"name": params["name"], "type": params["campaign_type"], "target": params.get("target_segment", "all")},
        )
    try:
        db = SessionLocal()
        from core.models.campaign import Campaign
        from core.models.base import gen_id

        campaign = Campaign(
            id=gen_id("camp"),
            tenant_id=params["tenant_id"],
            name=params["name"],
            campaign_type=params["campaign_type"],
            message_template=params["message"],
            target_segment=params.get("target_segment", "all"),
            status="draft",
        )
        db.add(campaign)
        db.commit()
        camp_id = campaign.id
        db.close()

        return ToolExecutionResult(
            tool_id="createCampaign", success=True, mode=mode,
            result={"campaign_id": camp_id, "name": params["name"], "status": "draft", "message": "Campaign created as draft. Send it from the campaigns panel."},
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="createCampaign", success=False, mode=mode, error=str(e))


@register_tool(
    tool_id="listCampaigns",
    name="List Campaigns",
    description="List SMS/email campaigns",
    category=ToolCategory.USER_DATA,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
        ToolParameter(name="status", type="string", description="Filter by status", required=False),
    ],
    returns="Campaign list",
    requires_approval=False,
    requires_permissions=["campaigns.view"],
)
def listCampaigns(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """List campaigns."""
    try:
        db = SessionLocal()
        from core.models.campaign import Campaign
        query = db.query(Campaign).filter(Campaign.tenant_id == params["tenant_id"])
        if params.get("status"):
            query = query.filter(Campaign.status == params["status"])
        campaigns = query.order_by(Campaign.created_at.desc()).limit(20).all()
        db.close()

        return ToolExecutionResult(
            tool_id="listCampaigns", success=True, mode=mode,
            result={
                "items": [{"id": c.id, "name": c.name, "type": c.campaign_type, "status": c.status, "target": c.target_segment} for c in campaigns],
                "total": len(campaigns),
            },
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="listCampaigns", success=False, mode=mode, error=str(e))


# =============================================================================
# Document Tools
# =============================================================================

@register_tool(
    tool_id="listDocuments",
    name="List Patient Documents",
    description="List uploaded documents for a patient",
    category=ToolCategory.USER_DATA,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="party_id", type="string", description="Patient ID", required=True),
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
    ],
    returns="Document list",
    requires_approval=False,
    requires_permissions=["parties.view"],
)
def listDocuments(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """List documents for a patient."""
    try:
        db = SessionLocal()
        from core.models.medical import PatientDocument
        docs = db.query(PatientDocument).filter(
            PatientDocument.party_id == params["party_id"],
            PatientDocument.tenant_id == params["tenant_id"],
        ).order_by(PatientDocument.created_at.desc()).limit(20).all()
        db.close()

        return ToolExecutionResult(
            tool_id="listDocuments", success=True, mode=mode,
            result={
                "items": [{"id": d.id, "name": getattr(d, 'file_name', ''), "type": getattr(d, 'document_type', ''), "date": str(d.created_at)} for d in docs],
                "total": len(docs),
            },
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="listDocuments", success=False, mode=mode, error=str(e))


# =============================================================================
# Patient Balance Tool
# =============================================================================

@register_tool(
    tool_id="getPatientBalance",
    name="Get Patient Balance",
    description="Get financial summary for a patient: total debt, paid amount, remaining balance",
    category=ToolCategory.USER_DATA,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(name="party_id", type="string", description="Patient ID", required=True),
        ToolParameter(name="tenant_id", type="string", description="Tenant ID", required=True),
    ],
    returns="Patient financial summary",
    requires_approval=False,
    requires_permissions=["cash_records.view"],
)
def getPatientBalance(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Get patient's financial balance."""
    try:
        db = SessionLocal()
        from sqlalchemy import func
        from core.models.sales import Sale

        stats = db.query(
            func.sum(Sale.final_amount).label('total'),
            func.sum(Sale.paid_amount).label('paid'),
            func.count(Sale.id).label('sale_count'),
        ).filter(
            Sale.party_id == params["party_id"],
            Sale.tenant_id == params["tenant_id"],
            Sale.status.in_(["completed", "pending"]),
        ).first()
        db.close()

        total = float(stats[0] or 0)
        paid = float(stats[1] or 0)
        remaining = total - paid

        return ToolExecutionResult(
            tool_id="getPatientBalance", success=True, mode=mode,
            result={
                "party_id": params["party_id"],
                "total_amount": total,
                "paid_amount": paid,
                "remaining_balance": remaining,
                "sale_count": stats[2] or 0,
                "status": "paid" if remaining <= 0 else ("overdue" if remaining > 0 else "current"),
            },
        )
    except Exception as e:
        return ToolExecutionResult(tool_id="getPatientBalance", success=False, mode=mode, error=str(e))
