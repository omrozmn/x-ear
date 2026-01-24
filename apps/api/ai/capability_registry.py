"""
Capability Registry

Defines all AI capabilities with their metadata, permissions, and limitations.
Capabilities are grouped by category for better organization.

Requirements:
- 5.5: Define capability definitions with name, description, category, example phrases, permissions, limitations
- 5.8: Map capabilities to Tool API operations
"""

from typing import List, Dict
from pydantic import BaseModel, Field, ConfigDict
from schemas.base import to_camel


class Capability(BaseModel):
    """AI capability definition."""
    
    name: str = Field(description="Human-readable capability name")
    description: str = Field(description="What this capability does")
    category: str = Field(description="Category grouping (e.g., 'Party Management')")
    example_phrases: List[str] = Field(description="Example user phrases that trigger this capability")
    required_permissions: List[str] = Field(description="Permissions needed to use this capability")
    tool_operations: List[str] = Field(description="Tool API operations used by this capability")
    limitations: List[str] = Field(description="Known limitations or unsupported scenarios")
    
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )


# =============================================================================
# Capability Definitions by Category
# =============================================================================

PARTY_MANAGEMENT_CAPABILITIES = [
    Capability(
        name="View Party Information",
        description="Look up details about a person or organization",
        category="Party Management",
        example_phrases=[
            "Show me John Doe's information",
            "What's the contact info for ABC Corp?",
            "Find patient details for Ahmet Yılmaz",
            "Hasta bilgilerini göster"
        ],
        required_permissions=["parties.view"],
        tool_operations=["getPartyById", "listParties", "searchParties"],
        limitations=[
            "Cannot access parties from other tenants",
            "Requires active party record",
            "Cannot view deleted or archived parties"
        ]
    ),
    Capability(
        name="Create Party Record",
        description="Create a new person or organization record",
        category="Party Management",
        example_phrases=[
            "Create a new patient named Jane Smith",
            "Add a new customer",
            "Yeni hasta kaydı oluştur",
            "Müşteri ekle"
        ],
        required_permissions=["parties.create"],
        tool_operations=["createParty"],
        limitations=[
            "Requires minimum information: name and contact method",
            "Cannot create duplicate records (phone/email must be unique)",
            "Requires explicit user confirmation before creation"
        ]
    ),
    Capability(
        name="Update Party Information",
        description="Modify existing party details",
        category="Party Management",
        example_phrases=[
            "Update John's phone number",
            "Change the address for ABC Corp",
            "Hasta telefon numarasını güncelle"
        ],
        required_permissions=["parties.edit"],
        tool_operations=["updateParty"],
        limitations=[
            "Cannot modify party from other tenants",
            "Cannot change party type (person/organization)",
            "Requires explicit user confirmation for sensitive fields"
        ]
    ),
]

SALES_OPERATIONS_CAPABILITIES = [
    Capability(
        name="View Sales Information",
        description="Look up sales records and invoices",
        category="Sales Operations",
        example_phrases=[
            "Show me recent sales",
            "What are today's invoices?",
            "Bugünkü satışları göster",
            "Fatura listesi"
        ],
        required_permissions=["sales.view"],
        tool_operations=["listSales", "getSaleById", "listInvoices"],
        limitations=[
            "Cannot access sales from other tenants",
            "Limited to last 90 days by default",
            "Cannot view cancelled or voided transactions"
        ]
    ),
    Capability(
        name="Create Sales Opportunity",
        description="Start a new sales opportunity for a party",
        category="Sales Operations",
        example_phrases=[
            "Create a sales opportunity for Jane Smith",
            "Start a new deal",
            "Satış fırsatı oluştur"
        ],
        required_permissions=["sales.create"],
        tool_operations=["createSale"],
        limitations=[
            "Cannot modify financial records in Phase A (read-only)",
            "Requires explicit user confirmation",
            "Requires valid party ID",
            "Cannot create sales for parties from other tenants"
        ]
    ),
]

DEVICE_MANAGEMENT_CAPABILITIES = [
    Capability(
        name="View Device Inventory",
        description="Look up hearing aid devices and stock levels",
        category="Device Management",
        example_phrases=[
            "Show me available hearing aids",
            "What devices do we have in stock?",
            "Cihaz stokları",
            "İşitme cihazı listesi"
        ],
        required_permissions=["devices.view"],
        tool_operations=["listDevices", "getDeviceById", "checkDeviceStock"],
        limitations=[
            "Cannot access devices from other tenants",
            "Stock levels may be cached (up to 5 minutes delay)",
            "Cannot view devices marked as discontinued"
        ]
    ),
    Capability(
        name="Assign Device to Party",
        description="Assign a hearing aid device to a patient",
        category="Device Management",
        example_phrases=[
            "Assign device to John Doe",
            "Give hearing aid to patient",
            "Hastaya cihaz ata"
        ],
        required_permissions=["devices.assign"],
        tool_operations=["assignDevice", "updateDeviceAssignment"],
        limitations=[
            "Requires valid party ID and device ID",
            "Device must be in stock and available",
            "Cannot assign devices across tenants",
            "Requires explicit user confirmation"
        ]
    ),
]

APPOINTMENT_CAPABILITIES = [
    Capability(
        name="View Appointments",
        description="Look up scheduled appointments",
        category="Appointments",
        example_phrases=[
            "Show me today's appointments",
            "What's on the schedule?",
            "Bugünkü randevular",
            "Randevu listesi"
        ],
        required_permissions=["appointments.view"],
        tool_operations=["listAppointments", "getAppointmentById"],
        limitations=[
            "Cannot access appointments from other tenants",
            "Limited to future appointments by default",
            "Cannot view cancelled appointments"
        ]
    ),
    Capability(
        name="Schedule Appointment",
        description="Create a new appointment for a party",
        category="Appointments",
        example_phrases=[
            "Schedule an appointment for Jane Smith",
            "Book a time slot",
            "Randevu oluştur"
        ],
        required_permissions=["appointments.create"],
        tool_operations=["createAppointment"],
        limitations=[
            "Requires valid party ID and time slot",
            "Cannot schedule in the past",
            "Cannot double-book time slots",
            "Requires explicit user confirmation"
        ]
    ),
]

REPORTING_CAPABILITIES = [
    Capability(
        name="Generate Reports",
        description="Create summary reports and analytics",
        category="Reporting",
        example_phrases=[
            "Generate a sales report",
            "Show me monthly statistics",
            "Aylık rapor oluştur"
        ],
        required_permissions=["reports.view"],
        tool_operations=["generateReport", "getReportData"],
        limitations=[
            "Cannot access data from other tenants",
            "Report generation may take several seconds",
            "Limited to predefined report templates",
            "Cannot export sensitive data without additional permissions"
        ]
    ),
]


# =============================================================================
# Registry Functions
# =============================================================================

def get_all_capabilities() -> List[Capability]:
    """
    Get all defined capabilities.
    
    Returns:
        List of all capability definitions
    """
    return (
        PARTY_MANAGEMENT_CAPABILITIES +
        SALES_OPERATIONS_CAPABILITIES +
        DEVICE_MANAGEMENT_CAPABILITIES +
        APPOINTMENT_CAPABILITIES +
        REPORTING_CAPABILITIES
    )


def get_capabilities_by_category() -> Dict[str, List[Capability]]:
    """
    Get capabilities grouped by category.
    
    Returns:
        Dictionary mapping category names to capability lists
    """
    all_caps = get_all_capabilities()
    categories: Dict[str, List[Capability]] = {}
    
    for cap in all_caps:
        if cap.category not in categories:
            categories[cap.category] = []
        categories[cap.category].append(cap)
    
    return categories


def filter_capabilities_by_permissions(
    capabilities: List[Capability],
    user_permissions: List[str]
) -> List[Capability]:
    """
    Filter capabilities based on user permissions.
    
    A user can access a capability only if they have ALL required permissions.
    
    Args:
        capabilities: List of capabilities to filter
        user_permissions: List of permissions the user has
        
    Returns:
        Filtered list of capabilities the user can access
    """
    filtered = []
    
    for cap in capabilities:
        # Check if user has all required permissions
        has_all_permissions = all(
            perm in user_permissions
            for perm in cap.required_permissions
        )
        
        if has_all_permissions:
            filtered.append(cap)
    
    return filtered


def filter_capabilities_by_phase(
    capabilities: List[Capability],
    ai_phase: str
) -> List[Capability]:
    """
    Filter capabilities based on AI_PHASE configuration.
    
    Phase A (read-only): Only show read operations
    Phase B (proposal): Show all operations
    Phase C (execution): Show all operations
    
    Args:
        capabilities: List of capabilities to filter
        ai_phase: Current AI phase ("A", "B", or "C")
        
    Returns:
        Filtered list of capabilities allowed in the current phase
    """
    if ai_phase.upper() != "A":
        # Phases B and C allow all capabilities
        return capabilities
    
    # Phase A: Only show read operations
    read_only_capabilities = []
    
    for cap in capabilities:
        # Check if all required permissions are read-only
        is_read_only = all(
            perm.endswith(".view") or perm.endswith(".read")
            for perm in cap.required_permissions
        )
        
        if is_read_only:
            read_only_capabilities.append(cap)
    
    return read_only_capabilities


def get_allowed_tool_names(
    user_permissions: List[str],
    ai_phase: str
) -> List[str]:
    """
    Get list of tool names allowed for the user in the current phase.
    
    Combines permission filtering and phase filtering.
    
    Args:
        user_permissions: List of permissions the user has
        ai_phase: Current AI phase ("A", "B", or "C")
        
    Returns:
        List of unique tool names allowed
    """
    all_caps = get_all_capabilities()
    
    # 1. Filter by permissions
    perm_filtered = filter_capabilities_by_permissions(all_caps, user_permissions)
    
    # 2. Filter by phase
    phase_filtered = filter_capabilities_by_phase(perm_filtered, ai_phase)
    
    # 3. Collect unique tool operations
    allowed_tools = set()
    for cap in phase_filtered:
        allowed_tools.update(cap.tool_operations)
        
    return list(allowed_tools)
