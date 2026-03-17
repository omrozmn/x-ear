"""
Sector & Country Context for AI Layer

Makes the AI fully sector-aware and country-aware:
- Sector: hearing, pharmacy, hospital, hotel, beauty, optic, medical, general
- Country: TR, US, DE, etc. → currency, language, insurance system

This context is injected into:
1. Intent Refiner prompts (so AI speaks the right terminology)
2. Capability registry (filters irrelevant capabilities)
3. Response formatter (correct currency/terminology)
4. Insight analyzers (skip irrelevant insights per sector)
"""

import logging
from typing import Dict, Any, Optional, Set
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Currency mapping by country code
COUNTRY_CURRENCY: Dict[str, Dict[str, str]] = {
    "TR": {"code": "TRY", "symbol": "₺", "name": "Türk Lirası", "locale": "tr"},
    "US": {"code": "USD", "symbol": "$", "name": "US Dollar", "locale": "en"},
    "GB": {"code": "GBP", "symbol": "£", "name": "British Pound", "locale": "en"},
    "DE": {"code": "EUR", "symbol": "€", "name": "Euro", "locale": "de"},
    "FR": {"code": "EUR", "symbol": "€", "name": "Euro", "locale": "fr"},
    "SA": {"code": "SAR", "symbol": "﷼", "name": "Saudi Riyal", "locale": "ar"},
    "AE": {"code": "AED", "symbol": "د.إ", "name": "UAE Dirham", "locale": "ar"},
}

# Sector-specific capability filters
# Only these capabilities are relevant per sector
SECTOR_CAPABILITIES: Dict[str, Set[str]] = {
    "hearing": {
        "getHearingTests", "getHearingProfile", "getDeviceRecommendations",
        "assignDevice", "query_sgk_patient_rights", "query_sgk_e_receipt",
        "createSgkMonthlyInvoiceDraft", "checkDeviceStock",
    },
    "pharmacy": {
        "checkDeviceStock", "get_low_stock_alerts",
    },
    "hospital": {
        "getHearingTests", "getHearingProfile", "query_sgk_patient_rights",
    },
    "optic": {
        "checkDeviceStock", "get_low_stock_alerts", "assignDevice",
    },
}

# Universal capabilities available to ALL sectors
UNIVERSAL_CAPABILITIES = {
    "createParty", "getPartyById", "listParties", "searchParties", "updateParty",
    "listAppointments", "createAppointment", "reschedule_appointment", "cancel_appointment",
    "check_appointment_availability", "get_party_comprehensive_summary",
    "listSales", "getSaleById", "createSale",
    "listInvoices", "generate_and_send_e_invoice",
    "get_daily_cash_summary", "create_cash_record",
    "generateReport", "getReportData", "dynamic_query",
    "recordPayment", "listPayments", "getPatientBalance",
    "listProformas", "createCampaign", "listCampaigns",
    "listDocuments", "notification_send",
    "feature_flag_toggle", "feature_flags_list",
    "tenant_info_get", "tenant_config_update",
}

# Sector-specific insight categories to skip
SECTOR_SKIP_INSIGHTS: Dict[str, Set[str]] = {
    "pharmacy": {"PC-004", "PC-006", "PC-010", "PC-011", "PC-012"},  # Hearing-specific
    "hotel": {"PC-004", "PC-006", "PC-010", "PC-011", "FN-002"},
    "beauty": {"PC-004", "PC-006", "PC-010", "FN-002"},
    "general": {"PC-004", "PC-006", "PC-010", "FN-002"},
}

# Sector prompt context
SECTOR_AI_CONTEXT: Dict[str, Dict[str, str]] = {
    "hearing": {
        "system_description_tr": "İşitme cihazı merkezi CRM sistemi",
        "system_description_en": "Hearing aid center CRM system",
        "party_term": "hasta",
        "device_term": "işitme cihazı",
        "specialty": "İşitme sağlığı ve cihaz yönetimi",
    },
    "pharmacy": {
        "system_description_tr": "Eczane yönetim sistemi",
        "system_description_en": "Pharmacy management system",
        "party_term": "müşteri",
        "device_term": "ilaç/ürün",
        "specialty": "İlaç ve sağlık ürünleri yönetimi",
    },
    "hospital": {
        "system_description_tr": "Hastane yönetim sistemi",
        "system_description_en": "Hospital management system",
        "party_term": "hasta",
        "device_term": "tıbbi cihaz",
        "specialty": "Sağlık hizmetleri ve tıbbi cihaz yönetimi",
    },
    "hotel": {
        "system_description_tr": "Otel yönetim sistemi",
        "system_description_en": "Hotel management system",
        "party_term": "misafir",
        "device_term": "ekipman",
        "specialty": "Konaklama ve misafir hizmetleri yönetimi",
    },
    "beauty": {
        "system_description_tr": "Güzellik salonu yönetim sistemi",
        "system_description_en": "Beauty salon management system",
        "party_term": "müşteri",
        "device_term": "ürün",
        "specialty": "Güzellik hizmetleri ve ürün yönetimi",
    },
    "optic": {
        "system_description_tr": "Optik mağaza yönetim sistemi",
        "system_description_en": "Optical store management system",
        "party_term": "müşteri",
        "device_term": "gözlük/lens",
        "specialty": "Optik ürün ve göz sağlığı yönetimi",
    },
    "general": {
        "system_description_tr": "İş yönetim sistemi",
        "system_description_en": "Business management system",
        "party_term": "müşteri",
        "device_term": "ürün",
        "specialty": "Genel iş operasyonları yönetimi",
    },
}


def get_sector_context(db: Session, tenant_id: str) -> Dict[str, Any]:
    """
    Get sector and country context for a tenant.
    Cached in tenant_context alongside stats.
    """
    try:
        from models.tenant import Tenant
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            return _default_context()

        sector = getattr(tenant, 'sector', 'hearing') or 'hearing'
        country = getattr(tenant, 'country_code', 'TR') or 'TR'

        currency = COUNTRY_CURRENCY.get(country, COUNTRY_CURRENCY["TR"])
        ai_ctx = SECTOR_AI_CONTEXT.get(sector, SECTOR_AI_CONTEXT["general"])

        return {
            "sector": sector,
            "country_code": country,
            "currency": currency,
            "ai_context": ai_ctx,
            "party_term": ai_ctx["party_term"],
            "device_term": ai_ctx["device_term"],
        }
    except Exception as e:
        logger.warning(f"Failed to get sector context: {e}")
        return _default_context()


def is_capability_available_for_sector(tool_id: str, sector: str) -> bool:
    """Check if a capability/tool is available for a given sector."""
    if tool_id in UNIVERSAL_CAPABILITIES:
        return True
    sector_caps = SECTOR_CAPABILITIES.get(sector)
    if sector_caps is None:
        return True  # Unknown sector → allow all
    return tool_id in sector_caps


def should_skip_insight(insight_id: str, sector: str) -> bool:
    """Check if an insight should be skipped for a sector."""
    skip_set = SECTOR_SKIP_INSIGHTS.get(sector)
    if not skip_set:
        return False
    return insight_id in skip_set


def get_currency_symbol(country_code: str) -> str:
    """Get currency symbol for a country."""
    return COUNTRY_CURRENCY.get(country_code, COUNTRY_CURRENCY["TR"])["symbol"]


def format_currency(amount: float, country_code: str) -> str:
    """Format an amount with correct currency symbol."""
    info = COUNTRY_CURRENCY.get(country_code, COUNTRY_CURRENCY["TR"])
    return f"{amount:,.0f} {info['symbol']}"


def _default_context() -> Dict[str, Any]:
    return {
        "sector": "hearing",
        "country_code": "TR",
        "currency": COUNTRY_CURRENCY["TR"],
        "ai_context": SECTOR_AI_CONTEXT["hearing"],
        "party_term": "hasta",
        "device_term": "cihaz",
    }
