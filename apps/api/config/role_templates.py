"""
Default Role Templates per Sector.

When a new tenant is created, these roles (and their associated permissions)
are seeded automatically based on the tenant's sector.

Usage:
    from config.role_templates import get_default_roles

    roles = get_default_roles("pharmacy")
    # [
    #   {"name": "Admin", "description": "Tam yetki", "is_admin": True},
    #   {"name": "Eczacı", "description": "Eczacı rolü", "is_admin": False},
    #   ...
    # ]
"""
from __future__ import annotations


_ROLE_TEMPLATES: dict[str, list[dict[str, object]]] = {
    "hearing": [
        {"name": "Admin", "description": "Tam yetkili yönetici", "is_admin": True},
        {"name": "Odyolog", "description": "Odyolog / uzman", "is_admin": False},
        {"name": "Resepsiyonist", "description": "Resepsiyon ve randevu", "is_admin": False},
        {"name": "Muhasebeci", "description": "Finans ve faturalama", "is_admin": False},
    ],
    "pharmacy": [
        {"name": "Admin", "description": "Tam yetkili yönetici", "is_admin": True},
        {"name": "Eczacı", "description": "Eczacı rolü", "is_admin": False},
        {"name": "Teknisyen", "description": "Eczane teknisyeni", "is_admin": False},
        {"name": "Kasiyer", "description": "Satış ve kasa", "is_admin": False},
    ],
    "hospital": [
        {"name": "Admin", "description": "Tam yetkili yönetici", "is_admin": True},
        {"name": "Doktor", "description": "Doktor rolü", "is_admin": False},
        {"name": "Hemşire", "description": "Hemşire rolü", "is_admin": False},
        {"name": "Resepsiyonist", "description": "Resepsiyon ve randevu", "is_admin": False},
    ],
    "hotel": [
        {"name": "Admin", "description": "Tam yetkili yönetici", "is_admin": True},
        {"name": "Resepsiyonist", "description": "Ön büro ve check-in", "is_admin": False},
        {"name": "Housekeeping", "description": "Kat hizmetleri", "is_admin": False},
    ],
    "beauty": [
        {"name": "Admin", "description": "Tam yetkili yönetici", "is_admin": True},
        {"name": "Uzman", "description": "Güzellik uzmanı", "is_admin": False},
        {"name": "Resepsiyonist", "description": "Resepsiyon ve randevu", "is_admin": False},
    ],
    "general": [
        {"name": "Admin", "description": "Tam yetkili yönetici", "is_admin": True},
        {"name": "Yönetici", "description": "Bölüm yöneticisi", "is_admin": False},
        {"name": "Personel", "description": "Standart personel", "is_admin": False},
        {"name": "Muhasebeci", "description": "Finans ve faturalama", "is_admin": False},
    ],
}


def get_default_roles(sector: str) -> list[dict[str, object]]:
    """Get default role templates for a sector."""
    return list(_ROLE_TEMPLATES.get(sector, _ROLE_TEMPLATES["general"]))


def get_all_sector_roles() -> dict[str, list[dict[str, object]]]:
    """Get all role templates grouped by sector."""
    return dict(_ROLE_TEMPLATES)
