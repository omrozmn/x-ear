"""
SGK Tools for AI Layer

Contains tools for managing SGK-specific operations like monthly invoice drafting.
"""
from typing import Any, Dict, List
import datetime
import calendar
from ai.tools import (  # type: ignore
    register_tool,
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
)
from core.database import SessionLocal  # type: ignore
from core.models.invoice import Invoice  # type: ignore
from core.models.tenant import Tenant  # type: ignore


@register_tool(
    tool_id="createSgkMonthlyInvoiceDraft",
    name="Create SGK Monthly Invoice Draft",
    description="Automatically determines the period and creates a draft SGK invoice with specified amount and reference number",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="total_amount",
            type="number",
            description="Total invoice amount (KDV included)",
            required=True,
        ),
        ToolParameter(
            name="dosya_referans_no",
            type="string",
            description="File reference number (Dosya Referans No)",
            required=True,
        ),
        ToolParameter(
            name="mukellef_kodu",
            type="string",
            description="Taxpayer code (Mükellef Kodu), if not provided will use default from settings",
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
    returns="Draft invoice summary and preview link",
    requires_approval=True,
    requires_permissions=["invoices.write"],
)
def createSgkMonthlyInvoiceDraft(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Creates a draft SGK invoice."""
    total_amount = params["total_amount"]
    dosya_ref = params["dosya_referans_no"]
    mukellef_kodu = params.get("mukellef_kodu")
    tenant_id = params.get("tenant_id", "default")

    # 1. Determine Period
    now = datetime.datetime.now()
    if now.day <= 7:
        # Previous month
        year = now.year if now.month > 1 else now.year - 1
        month = now.month - 1 if now.month > 1 else 12
    else:
        # Current month
        year = now.year
        month = now.month
    
    first_day = datetime.datetime(year, month, 1)
    last_day_num = calendar.monthrange(year, month)[1]
    last_day = datetime.datetime(year, month, last_day_num)
    
    period_str = f"{first_day.strftime('%d.%m.%Y')} - {last_day.strftime('%d.%m.%Y')}"

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="createSgkMonthlyInvoiceDraft",
            success=True,
            mode=mode,
            simulated_changes={
                "action": "create_sgk_invoice_draft",
                "period": period_str,
                "amount": total_amount,
                "reference": dosya_ref,
                "status": "Draft Prepared (Simulated)",
            },
        )

    try:
        db = SessionLocal()
        
        # 2. Get Tenant Info
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            db.close()
            return ToolExecutionResult(
                tool_id="createSgkMonthlyInvoiceDraft", success=False, mode=mode, error="Tenant not found"
            )
        
        tenant_settings = (tenant.settings or {}).get("invoice_integration", {})
        if not mukellef_kodu:
            mukellef_kodu = tenant_settings.get("mukellef_kodu", "NOT_SET")
        
        # 3. Create Invoice Record
        # We use 'ay' unit and 'İŞİTME CİHAZI' as product name by default for SGK monthly invoices
        invoice = Invoice(
            tenant_id=tenant_id,
            invoice_number=f"DRAFT-SGK-{int(now.timestamp())}",
            device_name="İŞİTME CİHAZI",
            device_price=total_amount,
            status="draft",
            edocument_status="draft",
            edocument_type="EFATURA",
            invoice_type_code="SGK",
            profile_id="TEMELFATURA",
            notes=f"SGK AYLIK FATURASI ({period_str})",
            metadata_json={
                "sgkData": {
                    "dosyaNo": dosya_ref,
                    "mukellefKodu": mukellef_kodu,
                    "mukellefAdi": tenant.company_name or tenant.name,
                    "periodStart": first_day.isoformat(),
                    "periodEnd": last_day.isoformat(),
                    "unit": "ay",
                    "quantity": 1
                }
            },
            created_at=now,
            updated_at=now
        )
        
        db.add(invoice)
        db.commit()
        db.refresh(invoice)
        
        inv_id = invoice.id
        db.close()

        summary = (
            f"### SGK Fatura Taslağı Oluşturuldu\n\n"
            f"- **Dönem:** {period_str}\n"
            f"- **Tutar:** {total_amount:,.2f} TRY\n"
            f"- **Dosya Referans No:** {dosya_ref}\n"
            f"- **Mükellef Kodu:** {mukellef_kodu}\n\n"
            f"Faturayı önizlemek için [buraya tıklayın](/api/invoices/{inv_id}/pdf).\n"
            f"Onaylıyorsanız 'Faturayı Kes' diyerek GİB'e gönderebiliriz."
        )

        return ToolExecutionResult(
            tool_id="createSgkMonthlyInvoiceDraft",
            success=True,
            mode=mode,
            result={
                "invoiceId": inv_id,
                "summary": summary,
                "previewUrl": f"/api/invoices/{inv_id}/pdf"
            },
        )
    except Exception as e:
        if 'db' in locals():
            db.rollback()
            db.close()
        return ToolExecutionResult(
            tool_id="createSgkMonthlyInvoiceDraft",
            success=False,
            mode=mode,
            error=str(e),
        )
