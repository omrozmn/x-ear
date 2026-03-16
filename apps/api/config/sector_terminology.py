"""
Sector Terminology Map for backend use.

Used by: CSV exports, PDF reports, email templates, notification texts.

Usage:
    from config.sector_terminology import get_term

    label = get_term("hearing", "party")      # "Hasta"
    label = get_term("pharmacy", "party")     # "Müşteri"
    label = get_term("hotel", "party")        # "Misafir"
"""
from __future__ import annotations

from typing import Optional


# Terminology map: sector -> key -> Turkish label
_TERMINOLOGY: dict[str, dict[str, str]] = {
    "hearing": {
        "party": "Hasta",
        "parties": "Hastalar",
        "device": "Cihaz",
        "devices": "Cihazlar",
        "app_title": "Hasta Yönetim Sistemi",
        "party_settings": "Hasta Ayarları",
    },
    "pharmacy": {
        "party": "Müşteri",
        "parties": "Müşteriler",
        "device": "Ürün",
        "devices": "Ürünler",
        "app_title": "Eczane Yönetim Sistemi",
        "party_settings": "Müşteri Ayarları",
    },
    "hospital": {
        "party": "Hasta",
        "parties": "Hastalar",
        "device": "Tıbbi Cihaz",
        "devices": "Tıbbi Cihazlar",
        "app_title": "Hastane Yönetim Sistemi",
        "party_settings": "Hasta Ayarları",
    },
    "hotel": {
        "party": "Misafir",
        "parties": "Misafirler",
        "device": "Ekipman",
        "devices": "Ekipmanlar",
        "app_title": "Otel Yönetim Sistemi",
        "party_settings": "Misafir Ayarları",
    },
    "medical": {
        "party": "Müşteri",
        "parties": "Müşteriler",
        "device": "Tıbbi Cihaz",
        "devices": "Tıbbi Cihazlar",
        "app_title": "Medikal Firma Yönetim Sistemi",
        "party_settings": "Müşteri Ayarları",
    },
    "optic": {
        "party": "Müşteri",
        "parties": "Müşteriler",
        "device": "Ürün",
        "devices": "Ürünler",
        "app_title": "Optik Mağaza Yönetim Sistemi",
        "party_settings": "Müşteri Ayarları",
    },
    "beauty": {
        "party": "Müşteri",
        "parties": "Müşteriler",
        "device": "Ürün",
        "devices": "Ürünler",
        "app_title": "Güzellik Salonu Yönetim Sistemi",
        "party_settings": "Müşteri Ayarları",
    },
    "general": {
        "party": "Müşteri",
        "parties": "Müşteriler",
        "device": "Ürün",
        "devices": "Ürünler",
        "app_title": "İş Yönetim Sistemi",
        "party_settings": "Müşteri Ayarları",
    },
}


def get_term(sector: str, key: str, fallback: Optional[str] = None) -> str:
    """
    Get a sector-specific term.

    Args:
        sector: Sector code (e.g., "hearing", "pharmacy")
        key: Term key (e.g., "party", "device", "app_title")
        fallback: Fallback value if key not found

    Returns:
        Localized term string
    """
    sector_terms = _TERMINOLOGY.get(sector, _TERMINOLOGY["hearing"])
    return sector_terms.get(key, fallback or _TERMINOLOGY["hearing"].get(key, key))


def get_all_terms(sector: str) -> dict[str, str]:
    """Get all terminology for a sector."""
    return dict(_TERMINOLOGY.get(sector, _TERMINOLOGY["hearing"]))
