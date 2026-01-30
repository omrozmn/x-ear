# Legacy Shim for models.enums
# Re-export from core.models.enums for backward compatibility
from core.models.enums import (  # noqa: F401
    AppointmentStatus,
    AppointmentType,
    PartyStatus,
    PatientStatus,
    Gender,
    DeviceSide,
    DeviceStatus,
    DeviceCategory,
    ProductCode,
    TenantType,
    AppErrorCode,
)

__all__ = [
    'AppointmentStatus',
    'AppointmentType',
    'PartyStatus',
    'PatientStatus',
    'Gender',
    'DeviceSide',
    'DeviceStatus',
    'DeviceCategory',
    'ProductCode',
    'TenantType',
    'AppErrorCode',
]
