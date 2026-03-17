"""
FastAPI Admin Countries Router - Country management for admin panel
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from datetime import datetime
import logging

from sqlalchemy.orm import Session

from schemas.base import ResponseEnvelope
from core.models.country import Country
from schemas.countries import CountryRead, CountryUpdate
from middleware.unified_access import UnifiedAccess, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/countries", tags=["Admin Countries"])

SEED_COUNTRIES = [
    {'code': 'TR', 'name': 'Turkey', 'native_name': 'Türkiye', 'enabled': True, 'creatable': True, 'currency_code': 'TRY', 'locale': 'tr-TR', 'timezone': 'Europe/Istanbul', 'phone_prefix': '+90', 'flag_emoji': '🇹🇷', 'date_format': 'DD.MM.YYYY', 'sort_order': 0, 'config': {"tax_id_label": "TC Kimlik No", "tax_id_length": 11, "phone_regex": "^\\+90[0-9]{10}$", "address_fields": ["city", "district"], "available_integrations": ["sgk", "birfatura", "uts"], "available_features": ["sgk", "uts"], "invoice_provider": "birfatura", "tax_system": "kdv"}},
    {'code': 'US', 'name': 'United States', 'native_name': 'United States', 'enabled': False, 'creatable': False, 'currency_code': 'USD', 'locale': 'en-US', 'timezone': 'America/New_York', 'phone_prefix': '+1', 'flag_emoji': '🇺🇸', 'date_format': 'MM/DD/YYYY', 'sort_order': 1, 'config': {}},
    {'code': 'CA', 'name': 'Canada', 'native_name': 'Canada', 'enabled': False, 'creatable': False, 'currency_code': 'CAD', 'locale': 'en-CA', 'timezone': 'America/Toronto', 'phone_prefix': '+1', 'flag_emoji': '🇨🇦', 'date_format': 'YYYY-MM-DD', 'sort_order': 2, 'config': {}},
    {'code': 'DE', 'name': 'Germany', 'native_name': 'Deutschland', 'enabled': False, 'creatable': False, 'currency_code': 'EUR', 'locale': 'de-DE', 'timezone': 'Europe/Berlin', 'phone_prefix': '+49', 'flag_emoji': '🇩🇪', 'date_format': 'DD.MM.YYYY', 'sort_order': 3, 'config': {}},
    {'code': 'FR', 'name': 'France', 'native_name': 'France', 'enabled': False, 'creatable': False, 'currency_code': 'EUR', 'locale': 'fr-FR', 'timezone': 'Europe/Paris', 'phone_prefix': '+33', 'flag_emoji': '🇫🇷', 'date_format': 'DD/MM/YYYY', 'sort_order': 4, 'config': {}},
    {'code': 'NL', 'name': 'Netherlands', 'native_name': 'Nederland', 'enabled': False, 'creatable': False, 'currency_code': 'EUR', 'locale': 'nl-NL', 'timezone': 'Europe/Amsterdam', 'phone_prefix': '+31', 'flag_emoji': '🇳🇱', 'date_format': 'DD-MM-YYYY', 'sort_order': 5, 'config': {}},
    {'code': 'SA', 'name': 'Saudi Arabia', 'native_name': 'المملكة العربية السعودية', 'enabled': False, 'creatable': False, 'currency_code': 'SAR', 'locale': 'ar-SA', 'timezone': 'Asia/Riyadh', 'phone_prefix': '+966', 'flag_emoji': '🇸🇦', 'date_format': 'DD/MM/YYYY', 'sort_order': 6, 'config': {}},
    {'code': 'AE', 'name': 'United Arab Emirates', 'native_name': 'الإمارات العربية المتحدة', 'enabled': False, 'creatable': False, 'currency_code': 'AED', 'locale': 'ar-AE', 'timezone': 'Asia/Dubai', 'phone_prefix': '+971', 'flag_emoji': '🇦🇪', 'date_format': 'DD/MM/YYYY', 'sort_order': 7, 'config': {}},
    {'code': 'QA', 'name': 'Qatar', 'native_name': 'قطر', 'enabled': False, 'creatable': False, 'currency_code': 'QAR', 'locale': 'ar-QA', 'timezone': 'Asia/Qatar', 'phone_prefix': '+974', 'flag_emoji': '🇶🇦', 'date_format': 'DD/MM/YYYY', 'sort_order': 8, 'config': {}},
    {'code': 'IQ', 'name': 'Iraq', 'native_name': 'العراق', 'enabled': False, 'creatable': False, 'currency_code': 'IQD', 'locale': 'ar-IQ', 'timezone': 'Asia/Baghdad', 'phone_prefix': '+964', 'flag_emoji': '🇮🇶', 'date_format': 'DD/MM/YYYY', 'sort_order': 9, 'config': {}},
]


@router.get("", operation_id="listAdminCountries")
def list_countries(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """List all countries"""
    countries = db_session.query(Country).order_by(Country.sort_order, Country.code).all()
    countries_data = [CountryRead.model_validate(c).model_dump(by_alias=True) for c in countries]
    return ResponseEnvelope(data={"countries": countries_data, "total": len(countries_data)})


@router.get("/{code}", operation_id="getAdminCountry")
def get_country(
    code: str,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get country details"""
    country = db_session.get(Country, code.upper())
    if not country:
        raise HTTPException(status_code=404, detail={"message": "Country not found", "code": "NOT_FOUND"})
    return ResponseEnvelope(data=CountryRead.model_validate(country).model_dump(by_alias=True))


@router.put("/{code}", operation_id="updateAdminCountry")
def update_country(
    code: str,
    request_data: CountryUpdate,
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update country settings (enable/disable, config, etc.)"""
    try:
        country = db_session.get(Country, code.upper())
        if not country:
            raise HTTPException(status_code=404, detail={"message": "Country not found", "code": "NOT_FOUND"})

        update_data = request_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if value is not None:
                setattr(country, key, value)

        country.updated_at = datetime.utcnow()
        db_session.commit()
        db_session.refresh(country)
        return ResponseEnvelope(data=CountryRead.model_validate(country).model_dump(by_alias=True))
    except HTTPException:
        raise
    except Exception as e:
        db_session.rollback()
        logger.error(f"Update country error: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/seed", operation_id="seedAdminCountries")
def seed_countries(
    db_session: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Seed default countries (idempotent - skips existing)"""
    try:
        created = 0
        for country_data in SEED_COUNTRIES:
            existing = db_session.get(Country, country_data['code'])
            if not existing:
                country = Country(**country_data)
                db_session.add(country)
                created += 1

        db_session.commit()
        return ResponseEnvelope(message=f"Seeded {created} new countries", data={"created": created})
    except Exception as e:
        db_session.rollback()
        logger.error(f"Seed countries error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
