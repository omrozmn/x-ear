# Enum Definitions for X-Ear CRM Models
# DEPRECATED: Import from schemas.enums instead
# This file is kept for backward compatibility only

import warnings
from enum import Enum

# Import all enums from schemas
from schemas.enums import (
    AppointmentStatus,
    AppointmentType,
    PartyStatus,
    Gender,
    DeviceSide,
    DeviceStatus,
    DeviceCategory,
    ProductCode,
    TenantType,
    AppErrorCode,
)

# Backward compatibility aliases
PatientStatus = PartyStatus

warnings.warn(
    "Importing from core.models.enums is deprecated. "
    "Import from schemas.enums instead.",
    DeprecationWarning,
    stacklevel=2
)

__all__ = [
    'AppointmentStatus',
    'AppointmentType',
    'PartyStatus',
    'PatientStatus',  # Alias
    'Gender',
    'DeviceSide',
    'DeviceStatus',
    'DeviceCategory',
    'ProductCode',
    'TenantType',
    'AppErrorCode',
]




# ============================================================================
# Multi-Product Architecture Enums (Contract #18)
# ============================================================================

class ProductCode(str, Enum):
    """
    Product codes for the multi-product monorepo.
    All product references MUST use this enum (Contract #18).
    
    Note: Database stores string value, application layer uses typed enum.
    """
    XEAR_HEARING = "xear_hearing"
    XEAR_PHARMACY = "xear_pharmacy"
    XEAR_HOSPITAL = "xear_hospital"
    XEAR_GENERAL = "xear_general"
    XEAR_HOTEL = "xear_hotel"
    XCALP = "xcalp"
    
    @classmethod
    def default(cls) -> "ProductCode":
        """Return the default product code for new tenants."""
        return cls.XEAR_HEARING
    
    @classmethod
    def all_xear(cls) -> list["ProductCode"]:
        """Return all X-Ear product codes."""
        return [
            cls.XEAR_HEARING,
            cls.XEAR_PHARMACY,
            cls.XEAR_HOSPITAL,
            cls.XEAR_GENERAL,
            cls.XEAR_HOTEL,
        ]
    
    @classmethod
    def is_xear(cls, code: str) -> bool:
        """Check if a product code is part of X-Ear family."""
        return code.startswith("xear_")


class TenantType(str, Enum):
    """
    Tenant type for B2B vs Consumer segmentation.
    Used by XCALP and future consumer products.
    """
    B2B = "B2B"
    CONSUMER = "CONSUMER"


class AppErrorCode(str, Enum):
    """
    Standardized application error codes for determinstic frontend handling.
    """
    PRODUCT_NOT_ALLOWED = "PRODUCT_NOT_ALLOWED"
    FEATURE_LIMIT_EXCEEDED = "FEATURE_LIMIT_EXCEEDED"
    TENANT_SUSPENDED = "TENANT_SUSPENDED"