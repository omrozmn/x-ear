"""
FastAPI Config Router - Migrated from Flask routes/config.py
Handles public configuration endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import os
import logging

from schemas.base import ResponseEnvelope
from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_access

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Config"])

@router.get("/config", operation_id="listConfig")
def get_config():
    """Get public configuration"""
    admin_url = os.getenv('ADMIN_PANEL_URL', '/admin-panel/')
    return ResponseEnvelope(data={'adminPanelUrl': admin_url})


@router.get("/country-config", operation_id="getCountryConfig", tags=["Config"])
def get_country_config(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    """Return country-specific configuration for the current tenant."""
    from country_modules import get_module
    from core.models.country import Country

    # Get tenant's country code from context or default to TR
    country_code = 'TR'
    if access.tenant_id:
        from core.models.tenant import Tenant
        tenant = db_session.get(Tenant, access.tenant_id)
        if tenant:
            country_code = getattr(tenant, 'country_code', 'TR') or 'TR'

    module = get_module(country_code)

    # Also get country record for additional config
    country = db_session.get(Country, country_code)

    return ResponseEnvelope(data={
        "countryCode": country_code,
        "currency": module.get_default_currency(),
        "taxCodes": module.get_tax_codes(),
        "taxIdLabel": module.get_tax_id_label(),
        "taxIdLength": module.get_tax_id_length(),
        "addressFields": module.get_address_fields(),
        "availableIntegrations": module.get_available_integrations(),
        "invoiceTypeMap": module.get_invoice_type_map(),
        "locale": country.locale if country else "tr-TR",
        "dateFormat": country.date_format if country else "DD.MM.YYYY",
        "timezone": country.timezone if country else "Europe/Istanbul",
        "config": country.config if country else {},
    })
