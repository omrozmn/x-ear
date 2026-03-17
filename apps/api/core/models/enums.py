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
    SectorCode,
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
    'SectorCode',
]