"""
Capability Registry

Defines all AI capabilities with their metadata, permissions, and limitations.
Capabilities are grouped by category for better organization.

Requirements:
- 5.5: Define capability definitions with name, description, category, example phrases, permissions, limitations
- 5.8: Map capabilities to Tool API operations
"""

from typing import List, Dict, Literal, Any, Optional
from pydantic import BaseModel, Field, ConfigDict
from schemas.base import to_camel


class SlotConfig(BaseModel):
    """Configuration for a required parameter slot."""
    name: str = Field(description="Parameter name matching the tool argument")
    prompt: str = Field(default="", description="Legacy prompt (Turkish)")
    prompt_tr: Optional[str] = Field(default=None, description="Turkish prompt")
    prompt_en: Optional[str] = Field(default=None, description="English prompt")
    ui_type: Literal["entity_search", "enum", "date", "number", "text", "file", "boolean", "time"] = Field(description="UI component to render")
    source_endpoint: Optional[str] = Field(default=None, description="API endpoint for search/options")
    enum_options: Optional[List[str]] = Field(default=None, description="Static options for enum type")
    validation_rules: Optional[Dict[str, Any]] = Field(default=None, description="Validation rules (min, max, required, etc.)")

    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True
    )

    def get_prompt(self, language: str = "tr") -> str:
        """Get prompt in specified language."""
        if language == "en" and self.prompt_en:
            return self.prompt_en
        return self.prompt_tr or self.prompt


class Capability(BaseModel):
    """AI capability definition."""
    
    name: str = Field(description="Internal unique capability identifier")
    display_name_tr: str = Field(default="", description="Turkish display name")
    display_name_en: str = Field(default="", description="English display name")
    description_tr: str = Field(default="", description="Turkish description")
    description_en: str = Field(default="", description="English description")
    description: str = Field(default="", description="Legacy description (English)")
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

    def get_display_name(self, language: str = "tr") -> str:
        """Get display name in specified language."""
        if language == "en" and self.display_name_en:
            return self.display_name_en
        return self.display_name_tr or self.name

    def get_description(self, language: str = "tr") -> str:
        """Get description in specified language."""
        if language == "en" and self.description_en:
            return self.description_en
        return self.description_tr or self.description


# =============================================================================
# Capability Definitions by Category
# =============================================================================

PARTY_MANAGEMENT_CAPABILITIES = [
    Capability(
        name="View Party Information",
        display_name_tr="Hasta/kişi bilgilerini görüntüleme",
        display_name_en="View patient/party information",
        description_tr="Bir kişi veya kuruluşun ayrıntılarına bakın",
        description_en="Look up details about a person or organization",
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
        display_name_tr="Hasta/kişi kaydı oluşturma",
        display_name_en="Create patient/party record",
        description_tr="Yeni bir kişi veya kuruluş kaydı oluşturun",
        description_en="Create a new person or organization record",
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
        slots=[
            SlotConfig(
                name="first_name",
                prompt_tr="Hastanın adını yazın:",
                prompt_en="Enter the patient's name:",
                ui_type="text",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="last_name",
                prompt_tr="Hastanın soyadını yazın:",
                prompt_en="Enter the patient's last name:",
                ui_type="text",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="phone",
                prompt_tr="Telefon numarasını girin:",
                prompt_en="Enter phone number:",
                ui_type="text",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="email",
                prompt_tr="E-posta adresi (İsteğe bağlı):",
                prompt_en="Email address (Optional):",
                ui_type="text",
                validation_rules={"required": False}
            ),
            SlotConfig(
                name="tc_number",
                prompt_tr="TC Kimlik numarası (İsteğe bağlı):",
                prompt_en="ID Number (Optional):",
                ui_type="text",
                validation_rules={"required": False}
            )
        ],
        limitations=[
            "Requires minimum information: name and contact method",
            "Cannot create duplicate records (phone/email must be unique)",
            "Requires explicit user confirmation before creation"
        ]
    ),
    Capability(
        name="Update Party Information",
        display_name_tr="Hasta/kişi bilgisi güncelleme",
        display_name_en="Update patient/party information",
        description_tr="Mevcut bir kayıt hakkındaki bilgileri değiştirin",
        description_en="Modify existing party details",
        description="Modify existing party details",
        category="Party Management",
        example_phrases=[
            "Update John's phone number",
            "Change the address for ABC Corp",
            "Hasta telefon numarasını güncelle"
        ],
        required_permissions=["parties.edit"],
        tool_operations=["updateParty"],
        slots=[
            SlotConfig(
                name="party_id",
                prompt_tr="Hangi hasta/kişi için güncelleme yapmak istiyorsunuz?",
                prompt_en="Which patient/person do you want to update?",
                ui_type="entity_search",
                source_endpoint="/api/ai/composer/autocomplete?context_entity_type=patient",
                validation_rules={"required": True}
            )
        ],
        limitations=[
            "Cannot modify party from other tenants",
            "Cannot change party type (person/organization)",
            "Requires explicit user confirmation for sensitive fields"
        ]
    ),
    Capability(
        name="Get Comprehensive Party Summary",
        display_name_tr="Hasta/kişi özet raporu",
        display_name_en="Patient/party summary report",
        description_tr="Tıbbi geçmiş, zaman çizelgesi ve son etkinlikler dahil tam bir özet alın",
        description_en="Get a complete summary of a patient including info, timeline, and recent activities",
        description="Get a complete summary of a patient including info, timeline, and recent activities",
        category="Party Management",
        example_phrases=[
            "Ahmet Yılmaz'ın geçmişini özetle",
            "Give me a full summary for Jane Smith",
            "Hasta özetini getir"
        ],
        required_permissions=["parties.view", "timeline.view"],
        tool_operations=["get_party_comprehensive_summary"],
        slots=[
            SlotConfig(
                name="party_id",
                prompt_tr="Hangi hastanın geçmişini istersiniz?",
                prompt_en="Whose history would you like summarized?",
                ui_type="entity_search",
                source_endpoint="/parties/search",
                validation_rules={"required": True}
            )
        ],
        limitations=[
            "Cannot access parties from other tenants"
        ]
    ),
]

SALES_OPERATIONS_CAPABILITIES = [
    Capability(
        name="View Sales Information",
        display_name_tr="Satış bilgilerini görüntüleme",
        display_name_en="View sales information",
        description_tr="Satış kayıtlarına ve faturalara göz atın",
        description_en="Look up sales records and invoices",
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
        display_name_tr="Satış kaydı oluşturma",
        display_name_en="Create sales record",
        description_tr="Bir kişi için yeni bir satış fırsatı başlatın",
        description_en="Start a new sales opportunity for a party",
        description="Start a new sales opportunity for a party",
        category="Sales Operations",
        example_phrases=[
            "Create a sales opportunity for Jane Smith",
            "Start a new deal",
            "Satış fırsatı oluştur"
        ],
        required_permissions=["sales.create"],
        tool_operations=["createSale"],
        slots=[
            SlotConfig(
                name="party_id",
                prompt_tr="Hangi hasta/kişi için satış oluşturmak istiyorsunuz?",
                prompt_en="For which patient/person do you want to create a sale?",
                ui_type="entity_search",
                source_endpoint="/parties/search",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="total_amount",
                prompt_tr="Satışın toplam tutarı nedir?",
                prompt_en="What is the total amount of the sale?",
                ui_type="number",
                validation_rules={"required": True, "min": 0}
            ),
            SlotConfig(
                name="notes",
                prompt_tr="Eklemek istediğiniz notlar var mı?",
                prompt_en="Do you have any notes to add?",
                ui_type="text",
                validation_rules={"required": False}
            )
        ],
        limitations=[
            "Cannot modify financial records in Phase A (read-only)",
            "Requires explicit user confirmation",
            "Requires valid party ID",
            "Cannot create sales for parties from other tenants"
        ]
    ),
    Capability(
        name="Generate and Send E-Invoice",
        display_name_tr="E-fatura gönderme",
        display_name_en="Generate & send e-invoice",
        description_tr="Bir satış için e-fatura oluşturun ve GİB'e gönderin",
        description_en="Generate an e-invoice for a sale and send it to GIB",
        description="Generate an e-invoice for a sale and send it to GIB",
        category="Sales Operations",
        example_phrases=[
            "Ahmet Beyin satışının e-faturasını kes",
            "Faturayı GİB'e yolla"
        ],
        required_permissions=["invoices.write"],
        tool_operations=["generate_and_send_e_invoice"],
        limitations=[
            "Cannot modify financial records in Phase A (read-only)",
            "Requires explicit user confirmation",
            "Requires valid invoice ID"
        ],
        slots=[
            SlotConfig(
                name="invoice_id",
                prompt_tr="Hangi faturayı göndermek istiyorsunuz? (Fatura No)",
                prompt_en="Which invoice do you want to send? (Invoice No)",
                ui_type="text",
                validation_rules={"required": True}
            )
        ]
    ),
]

DEVICE_MANAGEMENT_CAPABILITIES = [
    Capability(
        name="View Device Inventory",
        display_name_tr="Cihaz envanterini görüntüleme",
        display_name_en="View device inventory",
        description_tr="İşitme cihazlarına ve stok seviyelerine göz atın",
        description_en="Look up hearing aid devices and stock levels",
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
                prompt_tr="Hangi cihazı arıyorsunuz?",
                prompt_en="Which device are you looking for?",
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
        display_name_tr="Cihaz atama",
        display_name_en="Assign device to party",
        description_tr="Bir hastaya belirli bir işitme cihazı atayın",
        description_en="Assign a hearing aid device to a patient",
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
                prompt_tr="Hangi hasta için cihaz ataması yapılacak?",
                prompt_en="For which patient will the device be assigned?",
                ui_type="entity_search",
                source_endpoint="/parties/search",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="device_id",
                prompt_tr="Hangi cihaz atanacak?",
                prompt_en="Which device will be assigned?",
                ui_type="entity_search",
                source_endpoint="/inventory/search",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="ear_side",
                prompt_tr="Hangi kulak?",
                prompt_en="Which ear?",
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
        display_name_tr="Randevuları görüntüleme",
        display_name_en="View appointments",
        description_tr="Planlanmış randevulara göz atın",
        description_en="Look up scheduled appointments",
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
                prompt_tr="Hangi tarihten itibaren?",
                prompt_en="From which date?",
                ui_type="date",
                validation_rules={"required": False}
            ),
            SlotConfig(
                name="party_id",
                prompt_tr="Belirli bir hasta için mi?",
                prompt_en="For a specific patient?",
                ui_type="entity_search",
                source_endpoint="/parties/search",
                validation_rules={"required": False}
            )
        ]
    ),
    Capability(
        name="Check Appointment Availability",
        display_name_tr="Randevu müsaitliği kontrolü",
        display_name_en="Check appointment availability",
        description_tr="Yeni randevular için boş zaman dilimlerini kontrol edin",
        description_en="Check available time slots for new appointments",
        description="Check available time slots for new appointments",
        category="Appointments",
        example_phrases=[
            "Yarın öğleden sonra boş yer var mı?",
            "When is the next available slot?",
            "Boş saatleri göster"
        ],
        required_permissions=["appointments.view"],
        tool_operations=["check_appointment_availability"],
        slots=[
            SlotConfig(
                name="date",
                prompt_tr="Hangi tarih için boş saatlere bakalım?",
                prompt_en="For which date should we check availability?",
                ui_type="date",
                validation_rules={"required": False}
            )
        ],
        limitations=[]
    ),
    Capability(
        name="Schedule Appointment",
        display_name_tr="Randevu oluşturma",
        display_name_en="Schedule appointment",
        description_tr="Bir hasta için yeni bir randevu oluşturun",
        description_en="Create a new appointment for a party",
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
                prompt_tr="Randevu kimin için?",
                prompt_en="Who is the appointment for?",
                ui_type="entity_search",
                source_endpoint="/parties/search",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="appointment_date",
                prompt_tr="Ne zaman?",
                prompt_en="When?",
                ui_type="date",
                validation_rules={"required": True, "future_only": True}
            ),
             SlotConfig(
                name="notes",
                prompt_tr="Not eklemek ister misiniz?",
                prompt_en="Would you like to add a note?",
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
    Capability(
        name="Reschedule Appointment",
        display_name_tr="Randevu tarihini değiştirme",
        display_name_en="Reschedule appointment",
        description_tr="Mevcut bir randevunun tarihini ve saatini değiştirin",
        description_en="Change the date and time of an existing appointment",
        description="Change the date and time of an existing appointment",
        category="Appointments",
        example_phrases=[
            "Randevuyu yarına erteleyelim",
            "Reschedule this appointment",
            "Randevuyu kaydır"
        ],
        required_permissions=["appointments.edit"],
        tool_operations=["reschedule_appointment"],
        slots=[
            SlotConfig(
                name="appointment_id",
                prompt_tr="Hangi randevuyu değiştirmek istiyorsunuz?",
                prompt_en="Which appointment would you like to reschedule?",
                ui_type="text",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="new_date",
                prompt_tr="Yeni tarih ne olsun?",
                prompt_en="What should the new date be?",
                ui_type="date",
                validation_rules={"required": True, "future_only": True}
            )
        ],
        limitations=[
            "Requires explicit user confirmation"
        ]
    ),
    Capability(
        name="Cancel Appointment",
        display_name_tr="Randevu iptal etme",
        display_name_en="Cancel appointment",
        description_tr="Mevcut bir randevuyu iptal edin",
        description_en="Cancel an existing appointment",
        description="Cancel an existing appointment",
        category="Appointments",
        example_phrases=[
            "Randevuyu iptal et",
            "Cancel my appointment"
        ],
        required_permissions=["appointments.delete"],
        tool_operations=["cancel_appointment"],
        slots=[
            SlotConfig(
                name="appointment_id",
                prompt_tr="Hangi randevuyu iptal etmek istiyorsunuz?",
                prompt_en="Which appointment would you like to cancel?",
                ui_type="text",
                validation_rules={"required": True}
            )
        ],
        limitations=[
            "Requires explicit user confirmation"
        ]
    ),
]

REPORTING_CAPABILITIES = [
    Capability(
        name="Generate Reports",
        display_name_tr="Rapor oluşturma",
        display_name_en="Generate reports",
        description_tr="Özet raporlar ve analizler oluşturun",
        description_en="Create summary reports and analytics",
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
        display_name_tr="Özellik bayraklarını yönetme",
        display_name_en="Manage feature flags",
        description_tr="Bir kiracı için özellikleri etkinleştirin veya devre dışı bırakın",
        description_en="Enable or disable features for a tenant",
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
        display_name_tr="Tenant ayarlarını güncelleme",
        display_name_en="Update tenant settings",
        description_tr="Tenant düzeyindeki yapılandırmayı değiştirin",
        description_en="Modify tenant-level configuration",
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
        display_name_tr="Abonelikleri yönetme",
        display_name_en="Manage subscriptions",
        description_tr="Abonelik planlarını görüntüleyin veya yükseltin",
        description_en="View or upgrade subscription plans",
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
        display_name_tr="İç bildirim gönderme",
        display_name_en="Send internal notifications",
        description_tr="Ekip üyelerine bildirim gönderin",
        description_en="Send notifications to team members",
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
                prompt_tr="Kime gönderilecek? (User ID)",
                prompt_en="Who should it be sent to? (User ID)",
                ui_type="text", # Ideally entity_search for users
                validation_rules={"required": True}
            ),
             SlotConfig(
                name="message",
                prompt_tr="Mesajınız nedir?",
                prompt_en="What is your message?",
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
        display_name_tr="Belge yükleme",
        display_name_en="Upload document",
        description_tr="Sisteme bir dosya yükleyin",
        description_en="Upload a file to the system",
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
                prompt_tr="Dosya adı ne olsun?",
                prompt_en="What should be the filename?",
                ui_type="text",
                validation_rules={"required": True}
            ),
             SlotConfig(
                name="file_content",
                prompt_tr="Dosyayı seçin",
                prompt_en="Select the file",
                ui_type="file",
                validation_rules={"required": True, "accept": ".pdf,.jpg,.png"}
            )
        ],
        limitations=["Max 10MB", "Allowed types: PDF, JPG, PNG"]
    ),
]

INVOICE_CAPABILITIES = [
    Capability(
        name="Generate & Send E-Invoice",
        display_name_tr="E-fatura gönder",
        display_name_en="Generate & send e-invoice",
        description_tr="GİB'e (Gelir İdaresi Başkanlığı) bir e-fatura oluşturun ve gönderin",
        description_en="Generate and send an e-invoice to GIB (Revenue Administration)",
        description="Generate and send an e-invoice to GIB (Revenue Administration)",
        category="Finance",
        example_phrases=[
            "E-fatura gönder",
            "Faturayı GIB'e gönder",
            "Send e-invoice"
        ],
        required_permissions=["invoices.write"],
        tool_operations=["generate_and_send_e_invoice"],
        slots=[
            SlotConfig(
                name="invoice_id",
                prompt_tr="Hangi faturayı göndermek istiyorsunuz?",
                prompt_en="Which invoice would you like to send?",
                ui_type="text",
                validation_rules={"required": True}
            )
        ],
        limitations=[
            "Requires valid invoice ID",
            "Requires explicit user confirmation"
        ]
    ),
]

INVENTORY_ALERT_CAPABILITIES = [
    Capability(
        name="Low Stock Alerts",
        display_name_tr="Düşük stok uyarıları",
        display_name_en="Low stock alerts",
        description_tr="Kritik derecede düşük stok seviyelerine sahip cihazları ve envanter kalemlerini kontrol edin",
        description_en="Check for devices and inventory items with critically low stock levels",
        description="Check for devices and inventory items with critically low stock levels",
        category="Device Management",
        example_phrases=[
            "Stok uyarısı var mı?",
            "Azalan ürünleri göster",
            "Low stock alerts"
        ],
        required_permissions=["inventory.view"],
        tool_operations=["get_low_stock_alerts"],
        slots=[],
        limitations=[]
    ),
]

FINANCE_AND_CASH_CAPABILITIES = [
    Capability(
        name="View Daily Cash Summary",
        display_name_tr="Günlük kasa özeti",
        display_name_en="View daily cash summary",
        description_tr="Gün/ay için birleşik kasa özetini ve KPI'ları alın",
        description_en="Get the unified cash summary and KPIs for the day/month",
        description="Get the unified cash summary and KPIs for the day/month",
        category="Finance",
        example_phrases=[
            "Bugünkü kasa durumu nedir?",
            "Nakit ve kredi kartı özetini söyle",
            "Şu an kasada ne kadar var?"
        ],
        required_permissions=["cash_records.view", "dashboard.read"],
        tool_operations=["get_daily_cash_summary"],
        limitations=[
            "Only available for users with finance/dashboard permissions"
        ],
        slots=[
            SlotConfig(
                name="period",
                prompt_tr="Hangi dönemin özetini istersiniz? (today, week, month)",
                prompt_en="Which period's summary would you like? (today, week, month)",
                ui_type="enum",
                enum_options=["today", "week", "month", "year"],
                validation_rules={"required": False}
            )
        ]
    ),
    Capability(
        name="Record Expense",
        display_name_tr="Masraf kaydet",
        display_name_en="Record expense",
        description_tr="Belge veya fatura yükleyerek masraf/gider kaydı oluşturun",
        description_en="Record an expense entry from uploaded document or invoice",
        description="Record an expense entry from uploaded document or invoice",
        category="Finance",
        example_phrases=[
            "Bu faturayı masraf olarak kaydet",
            "Masraf kaydet",
            "Bu belgeyi gider olarak ekle",
            "Harcama kaydet",
            "Bu fişi masrafa ekle",
        ],
        required_permissions=["cash_records.create"],
        tool_operations=["create_cash_record"],
        limitations=[
            "Requires cash_records.create permission",
            "Amount must be manually confirmed if OCR extraction uncertain",
        ],
        slots=[
            SlotConfig(
                name="amount",
                prompt_tr="Tutar ne kadar?",
                prompt_en="What is the amount?",
                ui_type="number",
                validation_rules={"required": True, "min": 0.01}
            ),
            SlotConfig(
                name="description",
                prompt_tr="Açıklama nedir?",
                prompt_en="What is the description?",
                ui_type="text",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="category",
                prompt_tr="Masraf kategorisi nedir?",
                prompt_en="What is the expense category?",
                ui_type="enum",
                enum_options=["Genel Gider", "Kira", "Fatura", "Malzeme", "Ulaşım", "Yemek", "Diğer"],
                validation_rules={"required": False}
            ),
            SlotConfig(
                name="date",
                prompt_tr="Masraf tarihi?",
                prompt_en="Expense date?",
                ui_type="date",
                validation_rules={"required": False}
            ),
        ]
    ),
]

SGK_CAPABILITIES = [
    Capability(
        name="Query SGK E-Receipt",
        display_name_tr="SGK e-reçete sorgulama",
        display_name_en="Query SGK e-receipt",
        description_tr="Hastanın geçerli bir SGK e-reçetesi olup olmadığını kontrol edin",
        description_en="Check if a patient has a valid SGK e-receipt",
        description="Check if a patient has a valid SGK e-receipt",
        category="SGK Transactions",
        example_phrases=[
            "Bu hastanın e-reçetesi var mı?",
            "Check e-receipt from SGK",
            "TC ile reçete sorgula"
        ],
        required_permissions=["sgk.view"],
        tool_operations=["query_sgk_e_receipt"],
        limitations=[
            "Requires valid TC Identity Number"
        ],
        slots=[
            SlotConfig(
                name="tc_number",
                prompt_tr="Hastanın TC Kimlik Numarası nedir?",
                prompt_en="What is the patient's ID number?",
                ui_type="text",
                validation_rules={"required": True}
            )
        ]
    ),
    Capability(
        name="Query SGK Patient Rights",
        display_name_tr="SGK hasta hakları sorgulama",
        display_name_en="Query SGK patient rights",
        description_tr="Hastanın işitme cihazları için SGK kapsamına uygun olup olmadığını kontrol edin",
        description_en="Check if a patient is eligible for SGK coverage for hearing aids",
        description="Check if a patient is eligible for SGK coverage for hearing aids",
        category="SGK Transactions",
        example_phrases=[
            "SGK müstahaklık sorgusu yap",
            "Cihaz alma hakkı var mı?"
        ],
        required_permissions=["sgk.view"],
        tool_operations=["query_sgk_patient_rights"],
        limitations=[
            "Requires valid TC Identity Number"
        ],
        slots=[
            SlotConfig(
                name="tc_number",
                prompt_tr="Hastanın TC Kimlik Numarası nedir?",
                prompt_en="What is the patient's ID number?",
                ui_type="text",
                validation_rules={"required": True}
            )
        ]
    ),
    Capability(
        name="Create SGK Monthly Invoice Draft",
        display_name_tr="Aylık SGK fatura taslağı oluştur",
        display_name_en="Create monthly SGK invoice draft",
        description_tr="Belirli bir tutar ve referans numarası ile aylık SGK fatura taslağı hazırlar",
        description_en="Prepares a monthly SGK invoice draft with a specific amount and reference number",
        description="Prepares a monthly SGK invoice draft with a specific amount and reference number",
        category="SGK Transactions",
        example_phrases=[
            "Bu ayın SGK faturasını kes",
            "Aylık SGK faturası oluştur",
            "Prepare monthly SGK invoice"
        ],
        required_permissions=["invoices.write"],
        tool_operations=["createSgkMonthlyInvoiceDraft"],
        slots=[
            SlotConfig(
                name="total_amount",
                prompt_tr="Toplam fatura tutarı nedir? (KDV dahil)",
                prompt_en="What is the total invoice amount? (VAT included)",
                ui_type="number",
                validation_rules={"required": True, "min": 0}
            ),
            SlotConfig(
                name="dosya_referans_no",
                prompt_tr="Dosya referans numarası nedir?",
                prompt_en="What is the file reference number?",
                ui_type="text",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="mukellef_kodu",
                prompt_tr="Mükellef kodu nedir? (Boş bırakılırsa ayarlardaki varsayılan kullanılır)",
                prompt_en="What is the taxpayer code? (If left blank, usage default from settings)",
                ui_type="text",
                validation_rules={"required": False}
            )
        ],
        limitations=[
            "Requires explicit user confirmation before creation",
            "Period is determined automatically based on current date"
        ]
    ),
]

DATA_MANAGEMENT_CAPABILITIES = [
    Capability(
        name="Universal Bulk Import",
        display_name_tr="Evrensel toplu içe aktarma",
        display_name_en="Universal bulk import",
        description_tr="Herhangi bir sistem (Hastalar, Satışlar, vb.) için Excel şablonları oluşturur ve toplu veri içe aktarımlarını yürütür",
        description_en="Generates Excel templates and executes bulk data imports for any system (Patients, Sales, etc.)",
        description="Generates Excel templates and executes bulk data imports for any system (Patients, Sales, etc.)",
        category="Data Management",
        example_phrases=[
            "Toplu veri yükleme şablonu oluştur",
            "Excel'den hasta yükle",
            "Bulk import for sales",
            "Şablon üret"
        ],
        required_permissions=["bulk_import.execute"],
        tool_operations=["generate_import_template", "execute_smart_bulk_import"],
        slots=[
             SlotConfig(
                name="target_tool_id",
                prompt_tr="Hangi işlem için toplu yükleme yapmak istiyorsunuz? (Örn: createParty, createSale)",
                prompt_en="For which operation would you like to perform a bulk import? (e.g., createParty, createSale)",
                ui_type="text",
                validation_rules={"required": True}
            )
        ],
        limitations=[
            "Requires valid Excel format",
            "Column mapping must be accurate",
            "Recommended max 1000 rows per batch"
        ]
    ),
    Capability(
        name="Undo Bulk Import",
        display_name_tr="Toplu içe aktarmayı geri alma",
        display_name_en="Undo bulk import",
        description_tr="Daha önce yürütülen bir toplu içe aktarma partisini geri alır",
        description_en="Reverses a previously executed bulk import batch",
        description="Reverses a previously executed bulk import batch",
        category="Data Management",
        example_phrases=[
            "Son yüklemeyi geri al",
            "Rollback import batch",
            "Toplu yüklemeyi iptal et"
        ],
        required_permissions=["bulk_import.rollback"],
        tool_operations=["rollback_bulk_import"],
        slots=[
            SlotConfig(
                name="batch_id",
                prompt_tr="Geri almak istediğiniz yükleme paketinin (Batch) ID'si nedir?",
                prompt_en="What is the ID of the import batch you want to undo?",
                ui_type="text",
                validation_rules={"required": True}
            )
        ],
        limitations=[
            "Performs hard delete",
            "Cannot rollback if records have been further modified in some cases"
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
        REPORTING_CAPABILITIES +
        CONFIG_AND_ADMIN_CAPABILITIES +
        DOCUMENT_MANAGEMENT_CAPABILITIES +
        INVOICE_CAPABILITIES +
        INVENTORY_ALERT_CAPABILITIES +
        FINANCE_AND_CASH_CAPABILITIES +
        SGK_CAPABILITIES +
        DATA_MANAGEMENT_CAPABILITIES
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
