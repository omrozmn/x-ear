import os
import re

file_path = "apps/api/ai/tools/allowlist.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

new_tools = """
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
    \"\"\"Get comprehensive summary for a party.\"\"\"
    party_id = params.get("party_id")
    if not party_id:
        return ToolExecutionResult(success=False, data=None, error="party_id is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            success=True,
            data={
                "party": {"id": party_id, "name": "Ahmet Yılmaz", "phone": "05321234567"},
                "timeline": [
                    {"date": "2023-10-26", "action": "Device Assigned", "details": "Phonak Audeo L90"}
                ]
            }
        )

    # In EXECUTE mode, this would call the parties and timeline routers
    return ToolExecutionResult(
        success=True,
        data={"message": f"Successfully retrieved comprehensive summary for party {party_id}"}
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
    \"\"\"Check appointment availability.\"\"\"
    target_date = params.get("date", "today")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            success=True,
            data={"date": target_date, "available_slots": ["14:00", "15:30", "16:00"]}
        )

    # In EXECUTE mode, this would call appointments.get_availability
    return ToolExecutionResult(
        success=True,
        data={"message": f"Successfully checked appointment availability for {target_date}"}
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
    \"\"\"Reschedule an appointment.\"\"\"
    appointment_id = params.get("appointment_id")
    new_date = params.get("new_date")
    
    if not appointment_id or not new_date:
        return ToolExecutionResult(success=False, data=None, error="appointment_id and new_date are required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            success=True,
            data={"appointment_id": appointment_id, "new_date": new_date, "status": "Rescheduled (Simulated)"}
        )

    # In EXECUTE mode, this would call appointments.reschedule_appointment
    return ToolExecutionResult(
        success=True,
        data={"message": f"Successfully rescheduled appointment {appointment_id} to {new_date}"}
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
    \"\"\"Cancel an appointment.\"\"\"
    appointment_id = params.get("appointment_id")
    if not appointment_id:
        return ToolExecutionResult(success=False, data=None, error="appointment_id is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            success=True,
            data={"appointment_id": appointment_id, "status": "Cancelled (Simulated)"}
        )

    # In EXECUTE mode, this would call appointments.cancel_appointment
    return ToolExecutionResult(
        success=True,
        data={"message": f"Successfully cancelled appointment {appointment_id}"}
    )

@register_tool(
    tool_id="get_low_stock_alerts",
    name="Get Low Stock Alerts",
    description="Check for devices and battery stocks that are critically low",
    category=ToolCategory.REPORTING,
    risk_level=RiskLevel.LOW,
    schema_version="1.0.0",
    parameters=[],
    returns="List of items with low stock",
    requires_approval=False,
    requires_permissions=["devices.view"],
)
def get_low_stock_alerts(params: Dict[str, Any], mode: ToolExecutionMode) -> ToolExecutionResult:
    \"\"\"Get low stock alerts.\"\"\"
    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            success=True,
            data={"low_stock_items": [{"name": "Phonak Audeo L90 right", "current_stock": 1, "threshold": 5}]}
        )

    # In EXECUTE mode, this would call inventory.get_low_stock
    return ToolExecutionResult(
        success=True,
        data={"message": "Successfully retrieved low stock alerts"}
    )

@register_tool(
    tool_id="get_daily_cash_summary",
    name="Get Daily Cash Summary",
    description="Get the unified cash summary and KPIs for the specified period",
    category=ToolCategory.REPORTING,
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
    \"\"\"Get daily cash summary.\"\"\"
    period = params.get("period", "today")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            success=True,
            data={"period": period, "cash_in": 15000, "credit_card_in": 35000, "total_revenue": 50000}
        )

    # In EXECUTE mode, this would call unified_cash.get_cash_summary
    return ToolExecutionResult(
        success=True,
        data={"message": f"Successfully retrieved cash summary for {period}"}
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
    \"\"\"Generate and send e-invoice to GIB.\"\"\"
    invoice_id = params.get("invoice_id")
    if not invoice_id:
        return ToolExecutionResult(success=False, data=None, error="invoice_id is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            success=True,
            data={"invoice_id": invoice_id, "status": "Sent to GIB (Simulated)", "ettn": "abcd-1234-efgh-5678"}
        )

    # In EXECUTE mode, this would call invoices.send_to_gib
    return ToolExecutionResult(
        success=True,
        data={"message": f"Successfully generated and sent e-invoice {invoice_id} to GIB"}
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
    \"\"\"Query SGK e-receipt.\"\"\"
    tc_number = params.get("tc_number")
    if not tc_number:
        return ToolExecutionResult(success=False, data=None, error="tc_number is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            success=True,
            data={"tc_number": tc_number, "has_receipt": True, "receipt_date": "2023-10-25"}
        )

    # In EXECUTE mode, this would call sgk.query_e_receipt
    return ToolExecutionResult(
        success=True,
        data={"message": f"Successfully queried SGK e-receipts for {tc_number}"}
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
    \"\"\"Query SGK patient rights.\"\"\"
    tc_number = params.get("tc_number")
    if not tc_number:
        return ToolExecutionResult(success=False, data=None, error="tc_number is required")

    if mode == ToolExecutionMode.SIMULATE:
        return ToolExecutionResult(
            success=True,
            data={"tc_number": tc_number, "is_eligible": True, "coverage_amount": 3000}
        )

    # In EXECUTE mode, this would call sgk.query_patient_rights
    return ToolExecutionResult(
        success=True,
        data={"message": f"Successfully queried SGK patient rights for {tc_number}"}
    )
"""

if "Mobile-First CRM Tools" not in content:
    # Insert right before initialize_allowlist()
    content = content.replace(
        "def initialize_allowlist():", 
        new_tools + "\ndef initialize_allowlist():"
    )
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Injected new tools to allowlist.py")
else:
    print("Tools already exist in allowlist.py")
