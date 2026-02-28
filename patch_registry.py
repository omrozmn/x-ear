import os
import re

file_path = "apps/api/ai/capability_registry.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Party Management
party_new = """        required_permissions=["parties.edit"],
        tool_operations=["updateParty"],
        limitations=[
            "Cannot modify party from other tenants",
            "Cannot change party type (person/organization)",
            "Requires explicit user confirmation for sensitive fields"
        ]
    ),
    Capability(
        name="Get Comprehensive Party Summary",
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
                prompt="Hangi hastanın geçmişini istersiniz?",
                ui_type="entity_search",
                source_endpoint="/parties/search",
                validation_rules={"required": True}
            )
        ],
        limitations=[
            "Cannot access parties from other tenants"
        ]
    ),
]"""
content = re.sub(
    r'        required_permissions=\["parties\.edit"\],\s+tool_operations=\["updateParty"\],\s+limitations=\[\s+"Cannot modify party from other tenants",\s+"Cannot change party type \(person/organization\)",\s+"Requires explicit user confirmation for sensitive fields"\s+\]\s+\),\s+\]',
    party_new,
    content
)

# 2. Sales Operations
sales_new = """        required_permissions=["sales.create"],
        tool_operations=["createSale"],
        limitations=[
            "Cannot modify financial records in Phase A (read-only)",
            "Requires explicit user confirmation",
            "Requires valid party ID",
            "Cannot create sales for parties from other tenants"
        ]
    ),
    Capability(
        name="Generate and Send E-Invoice",
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
                prompt="Hangi faturayı göndermek istiyorsunuz? (Fatura No)",
                ui_type="text",
                validation_rules={"required": True}
            )
        ]
    ),
]"""
content = re.sub(
    r'        required_permissions=\["sales\.create"\],\s+tool_operations=\["createSale"\],\s+limitations=\[\s+"Cannot modify financial records in Phase A \(read-only\)",\s+"Requires explicit user confirmation",\s+"Requires valid party ID",\s+"Cannot create sales for parties from other tenants"\s+\]\s+\),\s+\]',
    sales_new,
    content
)

# 3. Device Management
devices_new = """        required_permissions=["devices.view"],
        tool_operations=["listDevices", "getDeviceById", "checkDeviceStock"],
        slots=[
            SlotConfig(
                name="search_query",
                prompt="Hangi cihazı arıyorsunuz?",
                ui_type="text",
                validation_rules={"required": False}
            )
        ],
        limitations=[
            "Cannot access devices from other tenants",
            "Stock levels may be cached (up to 5 minutes delay)",
            "Cannot view devices marked as discontinued"
        ]
    ),
    Capability(
        name="Check Low Stock Alerts",
        description="Check for devices and battery stocks that are critically low",
        category="Device Management",
        example_phrases=[
            "Eksik olan cihaz var mı?",
            "Hangi ürünlerin stoğu bitmek üzere?",
            "Kritik stok uyarısı"
        ],
        required_permissions=["devices.view"],
        tool_operations=["get_low_stock_alerts"],
        limitations=[
            "Stock levels may be cached (up to 5 minutes delay)"
        ]
    ),"""
content = re.sub(
    r'        required_permissions=\["devices\.view"\],\s+tool_operations=\["listDevices", "getDeviceById", "checkDeviceStock"\],\s+slots=\[\s+SlotConfig\(\s+name="search_query",\s+prompt="Hangi cihazı arıyorsunuz\?",\s+ui_type="text",\s+validation_rules=\{"required": False\}\s+\)\s+\],\s+limitations=\[\s+"Cannot access devices from other tenants",\s+"Stock levels may be cached \(up to 5 minutes delay\)",\s+"Cannot view devices marked as discontinued"\s+\]\s+\),',
    devices_new,
    content
)

# 4. Appointments
appointments_new = """        required_permissions=["appointments.view"],
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
        name="Check Appointment Availability",
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
                prompt="Hangi tarih için boş saatlere bakalım?",
                ui_type="date",
                validation_rules={"required": False}
            )
        ],
        limitations=[]
    ),"""
content = re.sub(
    r'        required_permissions=\["appointments\.view"\],\s+tool_operations=\["listAppointments", "getAppointmentById"\],\s+limitations=\[\s+"Cannot access appointments from other tenants",\s+"Limited to future appointments by default",\s+"Cannot view cancelled appointments"\s+\]\s*,\s*slots=\[\s*SlotConfig\(\s*name="date_from",\s*prompt="Hangi tarihten itibaren\?",\s*ui_type="date",\s*validation_rules=\{"required": False\}\s*\),\s*SlotConfig\(\s*name="party_id",\s*prompt="Belirli bir hasta için mi\?",\s*ui_type="entity_search",\s*source_endpoint="/parties/search",\s*validation_rules=\{"required": False\}\s*\)\s*\]\s*\),',
    appointments_new,
    content
)

appointments_new_2 = """        required_permissions=["appointments.create"],
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
    Capability(
        name="Reschedule Appointment",
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
                prompt="Hangi randevuyu değiştirmek istiyorsunuz?",
                ui_type="text",
                validation_rules={"required": True}
            ),
            SlotConfig(
                name="new_date",
                prompt="Yeni tarih ne olsun?",
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
                prompt="Hangi randevuyu iptal etmek istiyorsunuz?",
                ui_type="text",
                validation_rules={"required": True}
            )
        ],
        limitations=[
            "Requires explicit user confirmation"
        ]
    ),
]"""
content = re.sub(
    r'        required_permissions=\["appointments\.create"\],\s+tool_operations=\["createAppointment"\],\s+slots=\[\s+SlotConfig\(\s+name="party_id",\s+prompt="Randevu kimin için\?",\s+ui_type="entity_search",\s+source_endpoint="/parties/search",\s+validation_rules=\{"required": True\}\s+\),\s+SlotConfig\(\s+name="appointment_date",\s+prompt="Ne zaman\?",\s+ui_type="date",\s+validation_rules=\{"required": True, "future_only": True\}\s+\),\s+SlotConfig\(\s+name="notes",\s+prompt="Not eklemek ister misiniz\?",\s+ui_type="text",\s+validation_rules=\{"required": False\}\s+\)\s+\],\s+limitations=\[\s+"Requires valid party ID and time slot",\s+"Cannot schedule in the past",\s+"Cannot double-book time slots",\s+"Requires explicit user confirmation"\s+\]\s+\),\s+\]',
    appointments_new_2,
    content
)

# 5. Finance and SGK
finance_sgk = """        limitations=["Max 10MB", "Allowed types: PDF, JPG, PNG"]
    ),
]

FINANCE_AND_CASH_CAPABILITIES = [
    Capability(
        name="View Daily Cash Summary",
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
                prompt="Hangi dönemin özetini istersiniz? (today, week, month)",
                ui_type="enum",
                enum_options=["today", "week", "month", "year"],
                validation_rules={"required": False}
            )
        ]
    ),
]

SGK_CAPABILITIES = [
    Capability(
        name="Query SGK E-Receipt",
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
                prompt="Hastanın TC Kimlik Numarası nedir?",
                ui_type="text",
                validation_rules={"required": True}
            )
        ]
    ),
    Capability(
        name="Query SGK Patient Rights",
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
                prompt="Hastanın TC Kimlik Numarası nedir?",
                ui_type="text",
                validation_rules={"required": True}
            )
        ]
    ),
]"""
content = re.sub(
    r'        limitations=\["Max 10MB", "Allowed types: PDF, JPG, PNG"\]\s+\),\s+\]',
    finance_sgk,
    content
)

# 6. Returns
returns_new = """    return (
        PARTY_MANAGEMENT_CAPABILITIES +
        SALES_OPERATIONS_CAPABILITIES +
        DEVICE_MANAGEMENT_CAPABILITIES +
        APPOINTMENT_CAPABILITIES +
        REPORTING_CAPABILITIES +
        CONFIG_AND_ADMIN_CAPABILITIES +
        DOCUMENT_MANAGEMENT_CAPABILITIES +
        FINANCE_AND_CASH_CAPABILITIES +
        SGK_CAPABILITIES
    )"""
content = re.sub(
    r'    return \(\s+PARTY_MANAGEMENT_CAPABILITIES \+\s+SALES_OPERATIONS_CAPABILITIES \+\s+DEVICE_MANAGEMENT_CAPABILITIES \+\s+APPOINTMENT_CAPABILITIES \+\s+REPORTING_CAPABILITIES \+\s+CONFIG_AND_ADMIN_CAPABILITIES \+\s+DOCUMENT_MANAGEMENT_CAPABILITIES\s+\)',
    returns_new,
    content
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Patched capability_registry.py cleanly")
