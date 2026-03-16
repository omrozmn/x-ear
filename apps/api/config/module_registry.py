"""
Module Registry for Multi-Sector Platform.

Defines which modules are available for each sector.
Used by FeatureGate, require_module dependency, and frontend sector config.

Usage:
    from config.module_registry import get_enabled_modules, is_module_enabled

    modules = get_enabled_modules("hearing")
    if is_module_enabled("sgk", "pharmacy"):
        ...  # False - SGK is hearing-only
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional


# Sentinel for "all sectors"
ALL = "__ALL__"


@dataclass(frozen=True)
class SectorModule:
    """Definition of a platform module."""
    module_id: str
    label: str
    applicable_sectors: tuple[str, ...]  # sector codes, or (ALL,) for universal
    feature_flag: Optional[str] = None   # env-var override key (FEATURE_<key>)
    permission_prefixes: tuple[str, ...] = ()

    def applies_to(self, sector: str) -> bool:
        """Check if this module is applicable to a given sector."""
        return ALL in self.applicable_sectors or sector in self.applicable_sectors


# ============================================================================
# Module Definitions
# ============================================================================

MODULES: tuple[SectorModule, ...] = (
    SectorModule(
        module_id="hearing_tests",
        label="İşitme Testleri",
        applicable_sectors=("hearing",),
        feature_flag="hearing_tests",
        permission_prefixes=("parties.detail.hearing_tests",),
    ),
    SectorModule(
        module_id="devices",
        label="Cihazlar",
        applicable_sectors=("hearing",),
        feature_flag="devices",
        permission_prefixes=("devices",),
    ),
    SectorModule(
        module_id="noah",
        label="NOAH Import",
        applicable_sectors=("hearing",),
        feature_flag="noah",
        permission_prefixes=(),
    ),
    SectorModule(
        module_id="sgk",
        label="SGK",
        applicable_sectors=("hearing",),
        feature_flag="sgk",
        permission_prefixes=("sgk",),
    ),
    SectorModule(
        module_id="uts",
        label="UTS",
        applicable_sectors=("hearing",),
        feature_flag="uts",
        permission_prefixes=(),
    ),
    SectorModule(
        module_id="appointments",
        label="Randevular",
        applicable_sectors=(ALL,),
        feature_flag="appointments",
        permission_prefixes=("appointments",),
    ),
    SectorModule(
        module_id="inventory",
        label="Envanter",
        applicable_sectors=(ALL,),
        feature_flag="inventory",
        permission_prefixes=("inventory",),
    ),
    SectorModule(
        module_id="invoices",
        label="Faturalar",
        applicable_sectors=(ALL,),
        feature_flag="invoices",
        permission_prefixes=("invoices",),
    ),
    SectorModule(
        module_id="sales",
        label="Satışlar",
        applicable_sectors=(ALL,),
        feature_flag="sales",
        permission_prefixes=("sales",),
    ),
    SectorModule(
        module_id="campaigns",
        label="Kampanyalar",
        applicable_sectors=(ALL,),
        feature_flag="campaigns",
        permission_prefixes=("campaigns",),
    ),
    SectorModule(
        module_id="personnel",
        label="Personel",
        applicable_sectors=(ALL,),
        feature_flag="personnel",
        permission_prefixes=("team",),
    ),
    SectorModule(
        module_id="reports",
        label="Raporlar",
        applicable_sectors=(ALL,),
        feature_flag="reports",
        permission_prefixes=("reports",),
    ),
)

# Pre-computed lookup: module_id -> SectorModule
_MODULE_MAP: dict[str, SectorModule] = {m.module_id: m for m in MODULES}


# ============================================================================
# Public API
# ============================================================================

def get_module(module_id: str) -> SectorModule | None:
    """Get a module definition by ID."""
    return _MODULE_MAP.get(module_id)


def get_enabled_modules(sector: str) -> list[SectorModule]:
    """Return all modules enabled for a given sector."""
    return [m for m in MODULES if m.applies_to(sector)]


def get_enabled_module_ids(sector: str) -> set[str]:
    """Return set of module IDs enabled for a given sector."""
    return {m.module_id for m in MODULES if m.applies_to(sector)}


def is_module_enabled(module_id: str, sector: str) -> bool:
    """Check if a specific module is enabled for a sector."""
    module = _MODULE_MAP.get(module_id)
    if module is None:
        return False
    return module.applies_to(sector)


def get_all_modules() -> list[SectorModule]:
    """Return all registered modules."""
    return list(MODULES)


def get_sector_permission_prefixes(sector: str) -> set[str]:
    """Get all permission prefixes relevant to a sector."""
    prefixes: set[str] = set()
    for m in get_enabled_modules(sector):
        prefixes.update(m.permission_prefixes)
    return prefixes
