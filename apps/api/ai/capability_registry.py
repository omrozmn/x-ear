"""
Capability Registry

Defines all AI capabilities with their metadata, permissions, and limitations.
Capabilities are grouped by category for better organization.

Requirements:
- 5.5: Define capability definitions with name, description, category, example phrases, permissions, limitations
- 5.8: Map capabilities to Tool API operations
"""

from typing import List, Dict, Optional, Literal, Any, Literal, Any, Optional
from pydantic import BaseModel, Field, ConfigDict
from schemas.base import to_camel


class SlotConfig(BaseModel):
    """Configuration for a required parameter slot."""
    name: str = Field(description="Parameter name matching the tool argument")
    prompt: str = Field(description="Question to ask the user")
    ui_type: Literal["entity_search", "enum", "date", "number", "text", "file"] = Field(description="UI component to render")
    source_endpoint: Optional[str] = Field(default=None, description="API endpoint for search/options")
    enum_options: Optional[List[str]] = Field(default=None, description="Static options for enum type")
    validation_rules: Optional[Dict[str, Any]] = Field(default=None, description="Validation rules (min, max, required, etc.)")

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )


class Capability(BaseModel):
    """AI capability definition."""
    
    name: str = Field(description="Human-readable capability name")
    description: str = Field(description="What this capability does")
    category: str = Field(description="Category grouping (e.g., 'Party Management')")
    example_phrases: List[str] = Field(description="Example user phrases that trigger this capability")
    required_permissions: List[str] = Field(description="Permissions needed to use this capability")
    tool_operations: List[str] = Field(description="Tool API operations used by this capability")
    slots: List[SlotConfig] = Field(default_factory=list, description="Required slots for this capability")
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
        slots=[
            SlotConfig(
                name="search_query",
                prompt="Hangi cihazı arıyorsunuz?",
                ui_type="text"
            )
        ],
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
        slots=[
            SlotConfig(
                name="party_id",
                prompt="Hangi hasta için cihaz ataması yapılacak?",
                ui_type="entity_search",
                source_endpoint="/parties/search",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="device_id",
                prompt="Hangi cihaz atanacak?",
                ui_type="entity_search",
                source_endpoint="/inventory/search",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="ear_side",
                prompt="Hangi kulak?",
                ui_type="enum",
                enum_options=["Left", "Right", "Binaural"],
                validation_rules={"required": True}
            )
        ],
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
        ],
        slots=[
            SlotConfig(
                name="date_from",
                prompt="Hangi tarihten itibaren?",
                ui_type="date",
                validation_rules={"required": False}
            ),
            SlotConfig(
                name="party_id",
                prompt="Belirli bir hasta için mi?",
                ui_type="entity_search",
                source_endpoint="/parties/search",
                validation_rules={"required": False}
            )
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
        slots=[
             SlotConfig(
                name="party_id",
                prompt="Randevu kimin için?",
                ui_type="entity_search",
                source_endpoint="/parties/search",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="appointment_date",
                prompt="Ne zaman?",
                ui_type="date",
                validation_rules={"required": True, "future_only": True}
            ),
             SlotConfig(
                name="notes",
                prompt="Not eklemek ister misiniz?",
                ui_type="text",
                validation_rules={"required": False}
            )
        ],
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

CONFIG_AND_ADMIN_CAPABILITIES = [
    Capability(
        name="Manage Feature Flags",
        description="Enable or disable features for a tenant",
        category="Configuration",
        example_phrases=[
            "Enable AI chat for tenant",
            "List feature flags",
            "Özellik bayraklarını göster",
            "Yeni özelliği aktifleştir"
        ],
        required_permissions=["feature_flags:write", "feature_flags:read"],
        tool_operations=["feature_flag_toggle", "feature_flags_list"],
        limitations=["Requires admin permissions", "Tenant specific settings"]
    ),
    Capability(
        name="Update Tenant Settings",
        description="Modify tenant-level configuration",
        category="Configuration",
        example_phrases=[
            "Change the company name in settings",
            "Update tenant config",
            "Ayarları güncelle"
        ],
        required_permissions=["tenant_config:write"],
        tool_operations=["tenant_config_update", "tenant_info_get"],
        limitations=["Affects all users in the tenant"]
    ),
    Capability(
        name="Manage Subscriptions",
        description="View or upgrade subscription plans",
        category="Administration",
        example_phrases=[
            "Upgrade our plan to enterprise",
            "Show subscription details",
            "Paketi yükselt"
        ],
        required_permissions=["tenant:admin", "tenant:read"],
        tool_operations=["tenant_plan_upgrade", "tenant_info_get"],
        limitations=["Requires explicit approval", "Financial impact"]
    ),
    Capability(
        name="Send Internal Notifications",
        description="Send notifications to team members",
        category="Communication",
        example_phrases=[
            "Notify the team about the update",
            "Send a message to user ID 123",
            "Bildirim gönder"
        ],
        required_permissions=["notifications:write"],
        tool_operations=["notification_send"],
        slots=[
             SlotConfig(
                name="user_id",
                prompt="Kime gönderilecek? (User ID)",
                ui_type="text", # Ideally entity_search for users
                validation_rules={"required": True}
            ),
             SlotConfig(
                name="message",
                prompt="Mesajınız nedir?",
                ui_type="text",
                validation_rules={"required": True}
            )
        ],
        limitations=["Limited to internal recipients", "Rate limited"]
    ),
]

DOCUMENT_MANAGEMENT_CAPABILITIES = [
    Capability(
        name="Upload Document",
        description="Upload a file to the system",
        category="Document Management",
        example_phrases=[
            "Upload a new document",
            "Add a file",
            "Dosya yükle",
            "Belge ekle"
        ],
        required_permissions=["documents.create"],
        tool_operations=["createUploadPresigned"], # Using existing router op
        slots=[
            SlotConfig(
                name="filename",
                prompt="Dosya adı ne olsun?",
                ui_type="text",
                validation_rules={"required": True}
            ),
             SlotConfig(
                name="file_content",
                prompt="Dosyayı seçin",
                ui_type="file",
                validation_rules={"required": True, "accept": ".pdf,.jpg,.png"}
            )
        ],
        limitations=["Max 10MB", "Allowed types: PDF, JPG, PNG"]
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
        REPORTING_CAPABILITIES +
        CONFIG_AND_ADMIN_CAPABILITIES +
        DOCUMENT_MANAGEMENT_CAPABILITIES
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
