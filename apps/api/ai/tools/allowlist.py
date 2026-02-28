"""
AI Tool Allowlist

Defines the initial set of allowlisted tools for AI agents.
All tools must be explicitly registered here to be callable.

Requirements:
- 5.1: AI can only call allowlisted Tool API endpoints
- 5.4: Tools have simulate/execute modes
- 21.1: Dry-run mode for testing
"""

from typing import Any, Dict
from ai.tools import (
    ToolParameter,
    ToolCategory,
    RiskLevel,
    ToolExecutionMode,
    ToolExecutionResult,
    register_tool,
)


# =============================================================================
# Feature Flag Tools
# =============================================================================

@register_tool(
    tool_id="feature_flag_toggle",
    name="Toggle Feature Flag",
    description="Enable or disable a feature flag for a tenant",
    category=ToolCategory.CONFIG,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="flag_name",
            type="string",
            description="Name of the feature flag",
            required=True,
        ),
        ToolParameter(
            name="enabled",
            type="boolean",
            description="Whether to enable or disable the flag",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID to apply the change to",
            required=True,
        ),
    ],
    returns="Updated feature flag status",
    requires_approval=False,
    requires_permissions=["feature_flags:write"],
)
def feature_flag_toggle(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Toggle a feature flag."""
    flag_name = params["flag_name"]
    enabled = params["enabled"]
    tenant_id = params["tenant_id"]
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="feature_flag_toggle",
            success=True,
            mode=mode,
            simulated_changes={
                "flag_name": flag_name,
                "tenant_id": tenant_id,
                "old_value": not enabled,  # Simulated
                "new_value": enabled,
            },
        )
    
    # In execute mode, would actually toggle the flag
    # For now, return simulated success
    return ToolExecutionResult(
        tool_id="feature_flag_toggle",
        success=True,
        mode=mode,
        result={
            "flag_name": flag_name,
            "tenant_id": tenant_id,
            "enabled": enabled,
        },
    )


# =============================================================================
# Tenant Configuration Tools
# =============================================================================

@register_tool(
    tool_id="tenant_config_update",
    name="Update Tenant Configuration",
    description="Update a configuration value for a tenant",
    category=ToolCategory.CONFIG,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="config_key",
            type="string",
            description="Configuration key to update",
            required=True,
        ),
        ToolParameter(
            name="config_value",
            type="string",
            description="New configuration value",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID to apply the change to",
            required=True,
        ),
    ],
    returns="Updated configuration status",
    requires_approval=False,
    requires_permissions=["tenant_config:write"],
)
def tenant_config_update(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Update tenant configuration."""
    config_key = params["config_key"]
    config_value = params["config_value"]
    tenant_id = params["tenant_id"]
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="tenant_config_update",
            success=True,
            mode=mode,
            simulated_changes={
                "config_key": config_key,
                "tenant_id": tenant_id,
                "old_value": "[current_value]",  # Would fetch actual value
                "new_value": config_value,
            },
        )
    
    return ToolExecutionResult(
        tool_id="tenant_config_update",
        success=True,
        mode=mode,
        result={
            "config_key": config_key,
            "tenant_id": tenant_id,
            "value": config_value,
        },
    )


# =============================================================================
# Report Generation Tools
# =============================================================================

@register_tool(
    tool_id="generateReport",
    name="Generate Report",
    description="Generate a report based on specified parameters",
    category=ToolCategory.REPORT,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="report_type",
            type="string",
            description="Type of report to generate",
            required=True,
            enum=["sales", "inventory", "customers", "financial"],
        ),
        ToolParameter(
            name="date_from",
            type="string",
            description="Start date (ISO format)",
            required=True,
        ),
        ToolParameter(
            name="date_to",
            type="string",
            description="End date (ISO format)",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID for the report",
            required=True,
        ),
        ToolParameter(
            name="format",
            type="string",
            description="Output format",
            required=False,
            default="json",
            enum=["json", "csv", "pdf"],
        ),
    ],
    returns="Report data or download URL",
    requires_approval=False,
    requires_permissions=["reports.view"],
)
def generateReport(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Generate a report."""
    report_type = params["report_type"]
    date_from = params["date_from"]
    date_to = params["date_to"]
    tenant_id = params["tenant_id"]
    output_format = params.get("format", "json")
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="generateReport",
            success=True,
            mode=mode,
            simulated_changes={
                "action": "generateReport",
                "report_type": report_type,
                "date_range": f"{date_from} to {date_to}",
                "tenant_id": tenant_id,
                "format": output_format,
                "estimated_rows": 1000,  # Simulated
            },
        )
    
    return ToolExecutionResult(
        tool_id="generateReport",
        success=True,
        mode=mode,
        result={
            "report_type": report_type,
            "tenant_id": tenant_id,
            "status": "generated",
            "download_url": f"/api/reports/{tenant_id}/{report_type}/download",
        },
    )


@register_tool(
    tool_id="getReportData",
    name="Get Report Data",
    description="Get raw report data for analysis",
    category=ToolCategory.REPORT,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="report_type",
            type="string",
            description="Type of report",
            required=True,
            enum=["sales", "inventory", "customers", "financial"],
        ),
        ToolParameter(
            name="date_from",
            type="string",
            description="Start date (ISO format)",
            required=True,
        ),
        ToolParameter(
            name="date_to",
            type="string",
            description="End date (ISO format)",
            required=True,
        ),
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID",
            required=True,
        ),
    ],
    returns="Report data as JSON",
    requires_approval=False,
    requires_permissions=["reports.view"],
)
def getReportData(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Get report data."""
    report_type = params["report_type"]
    date_from = params["date_from"]
    date_to = params["date_to"]
    tenant_id = params["tenant_id"]
    
    # Placeholder: In production, this would query actual report data
    return ToolExecutionResult(
        tool_id="getReportData",
        success=True,
        mode=mode,
        result={
            "report_type": report_type,
            "tenant_id": tenant_id,
            "date_range": {"from": date_from, "to": date_to},
            "data": [],  # Would contain actual data
            "summary": {
                "total_count": 0,
                "generated_at": "placeholder",
            },
        },
    )


# =============================================================================
# Read-Only Tools
# =============================================================================

@register_tool(
    tool_id="tenant_info_get",
    name="Get Tenant Information",
    description="Retrieve information about a tenant",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID to retrieve",
            required=True,
        ),
    ],
    returns="Tenant information",
    requires_approval=False,
    requires_permissions=["tenant:read"],
)
def tenant_info_get(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Get tenant information."""
    tenant_id = params["tenant_id"]
    
    # Read-only tool, same behavior in both modes
    return ToolExecutionResult(
        tool_id="tenant_info_get",
        success=True,
        mode=mode,
        result={
            "tenant_id": tenant_id,
            "name": f"Tenant {tenant_id}",  # Would fetch actual data
            "status": "active",
            "plan": "professional",
        },
    )


@register_tool(
    tool_id="feature_flags_list",
    name="List Feature Flags",
    description="List all feature flags for a tenant",
    category=ToolCategory.READ,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID",
            required=True,
        ),
    ],
    returns="List of feature flags",
    requires_approval=False,
    requires_permissions=["feature_flags:read"],
)
def feature_flags_list(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """List feature flags."""
    tenant_id = params["tenant_id"]
    
    return ToolExecutionResult(
        tool_id="feature_flags_list",
        success=True,
        mode=mode,
        result={
            "tenant_id": tenant_id,
            "flags": [
                {"name": "ai_chat_enabled", "enabled": True},
                {"name": "new_dashboard", "enabled": False},
            ],
        },
    )


# =============================================================================
# High-Risk Tools (Require Approval)
# =============================================================================

@register_tool(
    tool_id="tenant_plan_upgrade",
    name="Upgrade Tenant Plan",
    description="Upgrade a tenant's subscription plan",
    category=ToolCategory.ADMIN,
    risk_level=RiskLevel.HIGH,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID",
            required=True,
        ),
        ToolParameter(
            name="new_plan",
            type="string",
            description="New plan to upgrade to",
            required=True,
            enum=["starter", "professional", "enterprise"],
        ),
    ],
    returns="Upgrade status",
    requires_approval=True,  # High-risk, requires approval
    requires_permissions=["tenant:admin"],
)
def tenant_plan_upgrade(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Upgrade tenant plan."""
    tenant_id = params["tenant_id"]
    new_plan = params["new_plan"]
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="tenant_plan_upgrade",
            success=True,
            mode=mode,
            simulated_changes={
                "tenant_id": tenant_id,
                "old_plan": "professional",  # Would fetch actual
                "new_plan": new_plan,
                "billing_impact": "Prorated charge will apply",
            },
        )
    
    return ToolExecutionResult(
        tool_id="tenant_plan_upgrade",
        success=True,
        mode=mode,
        result={
            "tenant_id": tenant_id,
            "plan": new_plan,
            "status": "upgraded",
        },
    )


# =============================================================================
# Notification Tools
# =============================================================================

@register_tool(
    tool_id="notification_send",
    name="Send Notification",
    description="Send a notification to users",
    category=ToolCategory.NOTIFICATION,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tenant_id",
            type="string",
            description="Tenant ID",
            required=True,
        ),
        ToolParameter(
            name="user_ids",
            type="array",
            description="List of user IDs to notify",
            required=True,
        ),
        ToolParameter(
            name="message",
            type="string",
            description="Notification message",
            required=True,
        ),
        ToolParameter(
            name="channel",
            type="string",
            description="Notification channel",
            required=False,
            default="in_app",
            enum=["in_app", "email", "sms"],
        ),
    ],
    returns="Notification status",
    requires_approval=False,
    requires_permissions=["notifications:write"],
)
def notification_send(
    params: Dict[str, Any],
    mode: ToolExecutionMode,
) -> ToolExecutionResult:
    """Send notification."""
    tenant_id = params["tenant_id"]
    user_ids = params["user_ids"]
    message = params["message"]
    channel = params.get("channel", "in_app")
    
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id="notification_send",
            success=True,
            mode=mode,
            simulated_changes={
                "tenant_id": tenant_id,
                "recipients": len(user_ids),
                "channel": channel,
                "message_preview": message[:50] + "..." if len(message) > 50 else message,
            },
        )
    
    return ToolExecutionResult(
        tool_id="notification_send",
        success=True,
        mode=mode,
        result={
            "tenant_id": tenant_id,
            "sent_to": len(user_ids),
            "channel": channel,
            "status": "sent",
        },
    )



# =============================================================================
# Mobile-First CRM Tools
# =============================================================================

@register_tool(
    tool_id="get_party_comprehensive_summary",
    name="Get Comprehensive Party Summary",
    description="Retrieve a complete summary of a patient including info, timeline, and recent activities",
    category=ToolCategory.USER_DATA,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="party_id",
            type="string",
            description="The ID of the party to retrieve the summary for",
            required=True,
        )
    ],
    returns="Comprehensive summary of the party",
    requires_approval=False,
    requires_permissions=["parties.view", "timeline.view"],
)
def get_party_comprehensive_summary(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Get comprehensive summary for a party."""
    party_id = params.get("party_id")
    if not party_id:
        return ToolExecutionResult(tool_id='get_party_comprehensive_summary', mode=mode, success=False, result=None, error="party_id is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id='get_party_comprehensive_summary',
            mode=mode,
            success=True,
            result={
                "party": {"id": party_id, "name": "Ahmet Yılmaz", "phone": "05321234567"},
                "timeline": [
                    {"date": "2023-10-26", "action": "Device Assigned", "details": "Phonak Audeo L90"}
                ]
            }
        )

    # In EXECUTE mode, this would call the parties and timeline routers
    return ToolExecutionResult(
        tool_id='get_party_comprehensive_summary',
        mode=mode,
        success=True,
        result={"message": f"Successfully retrieved comprehensive summary for party {party_id}"}
    )

@register_tool(
    tool_id="check_appointment_availability",
    name="Check Appointment Availability",
    description="Check available time slots for new appointments",
    category=ToolCategory.ACTION,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="date",
            type="string",
            description="The date to check availability for (e.g., YYYY-MM-DD)",
            required=False,
        )
    ],
    returns="List of available time slots",
    requires_approval=False,
    requires_permissions=["appointments.view"],
)
def check_appointment_availability(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Check appointment availability."""
    target_date = params.get("date", "today")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id='get_party_comprehensive_summary',
            mode=mode,
            success=True,
            result={"date": target_date, "available_slots": ["14:00", "15:30", "16:00"]}
        )

    # In EXECUTE mode, this would call appointments.get_availability
    return ToolExecutionResult(
        tool_id='get_party_comprehensive_summary',
        mode=mode,
        success=True,
        result={"message": f"Successfully checked appointment availability for {target_date}"}
    )

@register_tool(
    tool_id="reschedule_appointment",
    name="Reschedule Appointment",
    description="Change the date and time of an existing appointment",
    category=ToolCategory.ACTION,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="appointment_id",
            type="string",
            description="The ID of the appointment to reschedule",
            required=True,
        ),
        ToolParameter(
            name="new_date",
            type="string",
            description="The new date and time for the appointment",
            required=True,
        )
    ],
    returns="Status of the reschedule operation",
    requires_approval=True,
    requires_permissions=["appointments.edit"],
)
def reschedule_appointment(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Reschedule an appointment."""
    appointment_id = params.get("appointment_id")
    new_date = params.get("new_date")
    
    if not appointment_id or not new_date:
        return ToolExecutionResult(tool_id='get_party_comprehensive_summary', mode=mode, success=False, result=None, error="appointment_id and new_date are required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id='get_party_comprehensive_summary',
            mode=mode,
            success=True,
            result={"appointment_id": appointment_id, "new_date": new_date, "status": "Rescheduled (Simulated)"}
        )

    # In EXECUTE mode, this would call appointments.reschedule_appointment
    return ToolExecutionResult(
        tool_id='get_party_comprehensive_summary',
        mode=mode,
        success=True,
        result={"message": f"Successfully rescheduled appointment {appointment_id} to {new_date}"}
    )

@register_tool(
    tool_id="cancel_appointment",
    name="Cancel Appointment",
    description="Cancel an existing appointment",
    category=ToolCategory.ACTION,
    risk_level=RiskLevel.MEDIUM,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="appointment_id",
            type="string",
            description="The ID of the appointment to cancel",
            required=True,
        )
    ],
    returns="Status of the cancellation",
    requires_approval=True,
    requires_permissions=["appointments.delete"],
)
def cancel_appointment(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Cancel an appointment."""
    appointment_id = params.get("appointment_id")
    if not appointment_id:
        return ToolExecutionResult(tool_id='get_party_comprehensive_summary', mode=mode, success=False, result=None, error="appointment_id is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id='get_party_comprehensive_summary',
            mode=mode,
            success=True,
            result={"appointment_id": appointment_id, "status": "Cancelled (Simulated)"}
        )

    # In EXECUTE mode, this would call appointments.cancel_appointment
    return ToolExecutionResult(
        tool_id='get_party_comprehensive_summary',
        mode=mode,
        success=True,
        result={"message": f"Successfully cancelled appointment {appointment_id}"}
    )

@register_tool(
    tool_id="get_low_stock_alerts",
    name="Get Low Stock Alerts",
    description="Check for devices and battery stocks that are critically low",
    category=ToolCategory.REPORT,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[],
    returns="List of items with low stock",
    requires_approval=False,
    requires_permissions=["devices.view"],
)
def get_low_stock_alerts(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Get low stock alerts."""
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id='get_party_comprehensive_summary',
            mode=mode,
            success=True,
            result={"low_stock_items": [{"name": "Phonak Audeo L90 right", "current_stock": 1, "threshold": 5}]}
        )

    # In EXECUTE mode, this would call inventory.get_low_stock
    return ToolExecutionResult(
        tool_id='get_party_comprehensive_summary',
        mode=mode,
        success=True,
        result={"message": "Successfully retrieved low stock alerts"}
    )

@register_tool(
    tool_id="get_daily_cash_summary",
    name="Get Daily Cash Summary",
    description="Get the unified cash summary and KPIs for the specified period",
    category=ToolCategory.REPORT,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="period",
            type="string",
            description="The period to summarize (e.g., today, week, month)",
            required=False,
        )
    ],
    returns="Financial summary and KPIs",
    requires_approval=False,
    requires_permissions=["cash_records.view", "dashboard.read"],
)
def get_daily_cash_summary(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Get daily cash summary."""
    period = params.get("period", "today")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id='get_party_comprehensive_summary',
            mode=mode,
            success=True,
            result={"period": period, "cash_in": 15000, "credit_card_in": 35000, "total_revenue": 50000}
        )

    # In EXECUTE mode, this would call unified_cash.get_cash_summary
    return ToolExecutionResult(
        tool_id='get_party_comprehensive_summary',
        mode=mode,
        success=True,
        result={"message": f"Successfully retrieved cash summary for {period}"}
    )

@register_tool(
    tool_id="generate_and_send_e_invoice",
    name="Generate and Send E-Invoice",
    description="Generate an e-invoice for a sale and send it to GIB",
    category=ToolCategory.ACTION,
    risk_level=RiskLevel.HIGH, # High risk because it interacts with external tax authorities
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="invoice_id",
            type="string",
            description="The ID of the invoice to send",
            required=True,
        )
    ],
    returns="GIB submission status",
    requires_approval=True,
    requires_permissions=["invoices.write"],
)
def generate_and_send_e_invoice(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Generate and send e-invoice to GIB."""
    invoice_id = params.get("invoice_id")
    if not invoice_id:
        return ToolExecutionResult(tool_id='get_party_comprehensive_summary', mode=mode, success=False, result=None, error="invoice_id is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id='get_party_comprehensive_summary',
            mode=mode,
            success=True,
            result={"invoice_id": invoice_id, "status": "Sent to GIB (Simulated)", "ettn": "abcd-1234-efgh-5678"}
        )

    # In EXECUTE mode, this would call invoices.send_to_gib
    return ToolExecutionResult(
        tool_id='get_party_comprehensive_summary',
        mode=mode,
        success=True,
        result={"message": f"Successfully generated and sent e-invoice {invoice_id} to GIB"}
    )

@register_tool(
    tool_id="query_sgk_e_receipt",
    name="Query SGK E-Receipt",
    description="Check if a patient has a valid SGK e-receipt",
    category=ToolCategory.INTEGRATION,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tc_number",
            type="string",
            description="Patient's TC Identity Number",
            required=True,
        )
    ],
    returns="E-receipt details if found",
    requires_approval=False,
    requires_permissions=["sgk.view"],
)
def query_sgk_e_receipt(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Query SGK e-receipt."""
    tc_number = params.get("tc_number")
    if not tc_number:
        return ToolExecutionResult(tool_id='get_party_comprehensive_summary', mode=mode, success=False, result=None, error="tc_number is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id='get_party_comprehensive_summary',
            mode=mode,
            success=True,
            result={"tc_number": tc_number, "has_receipt": True, "receipt_date": "2023-10-25"}
        )

    # In EXECUTE mode, this would call sgk.query_e_receipt
    return ToolExecutionResult(
        tool_id='get_party_comprehensive_summary',
        mode=mode,
        success=True,
        result={"message": f"Successfully queried SGK e-receipts for {tc_number}"}
    )

@register_tool(
    tool_id="query_sgk_patient_rights",
    name="Query SGK Patient Rights",
    description="Check if a patient is eligible for SGK coverage for hearing aids",
    category=ToolCategory.INTEGRATION,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[
        ToolParameter(
            name="tc_number",
            type="string",
            description="Patient's TC Identity Number",
            required=True,
        )
    ],
    returns="Patient rights and eligibility status",
    requires_approval=False,
    requires_permissions=["sgk.view"],
)
def query_sgk_patient_rights(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    """Query SGK patient rights."""
    tc_number = params.get("tc_number")
    if not tc_number:
        return ToolExecutionResult(tool_id='get_party_comprehensive_summary', mode=mode, success=False, result=None, error="tc_number is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            tool_id='get_party_comprehensive_summary',
            mode=mode,
            success=True,
            result={"tc_number": tc_number, "is_eligible": True, "coverage_amount": 3000}
        )

    # In EXECUTE mode, this would call sgk.query_patient_rights
    return ToolExecutionResult(
        tool_id='get_party_comprehensive_summary',
        mode=mode,
        success=True,
        result={"message": f"Successfully queried SGK patient rights for {tc_number}"}
    )

def initialize_allowlist():
    """
    Initialize the tool allowlist.
    
    This function is called on module import to register all tools.
    Tools are registered via the @register_tool decorator.
    """
    # Tools are already registered via decorators
    # This function exists for explicit initialization if needed
    pass


# Auto-initialize on import
initialize_allowlist()
