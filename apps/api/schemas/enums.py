"""
Centralized Enum Definitions for X-Ear CRM
==========================================

CRITICAL: This is the SINGLE SOURCE OF TRUTH for all enums.
- All API schemas import from here
- All database models import from here
- All enum values are lowercase for API consistency
- OpenAPI generation uses these definitions

DO NOT create duplicate enum definitions elsewhere.
"""

from enum import Enum


class AppointmentStatus(str, Enum):
    """Appointment status - lowercase for API consistency"""
    SCHEDULED = 'scheduled'
    CONFIRMED = 'confirmed'
    IN_PROGRESS = 'in_progress'
    COMPLETED = 'completed'
    CANCELLED = 'cancelled'
    NO_SHOW = 'no_show'
    RESCHEDULED = 'rescheduled'

    @classmethod
    def from_legacy(cls, value: str):
        """Map legacy UPPERCASE values to lowercase enum"""
        if not value:
            return cls.SCHEDULED
        
        value_lower = str(value).lower().strip()
        
        mapping = {
            'scheduled': cls.SCHEDULED,
            'confirmed': cls.CONFIRMED,
            'in_progress': cls.IN_PROGRESS,
            'completed': cls.COMPLETED,
            'cancelled': cls.CANCELLED,
            'canceled': cls.CANCELLED,  # US spelling
            'no_show': cls.NO_SHOW,
            'rescheduled': cls.RESCHEDULED,
        }
        
        return mapping.get(value_lower, cls.SCHEDULED)


class AppointmentType(str, Enum):
    """Appointment type"""
    CONSULTATION = 'consultation'
    HEARING_TEST = 'hearing_test'
    DEVICE_TRIAL = 'device_trial'
    DEVICE_FITTING = 'device_fitting'
    CONTROL = 'control'
    REPAIR = 'repair'
    OTHER = 'other'


class PartyStatus(str, Enum):
    """Party/Patient status in CRM - lowercase for API consistency"""
    ACTIVE = 'active'
    INACTIVE = 'inactive'
    LEAD = 'lead'
    TRIAL = 'trial'
    CUSTOMER = 'customer'
    NEW = 'new'
    DECEASED = 'deceased'
    ARCHIVED = 'archived'

    @classmethod
    def from_legacy(cls, value: str):
        """Map legacy values to enum"""
        if not value:
            return cls.ACTIVE
        
        value_lower = str(value).lower().strip()
        
        for member in cls:
            if member.value == value_lower:
                return member
        
        return cls.ACTIVE


class Gender(str, Enum):
    """Gender options"""
    MALE = 'M'
    FEMALE = 'F'
    OTHER = 'O'


class DeviceSide(str, Enum):
    """Device ear/side placement"""
    LEFT = 'left'
    RIGHT = 'right'
    BILATERAL = 'bilateral'

    @classmethod
    def from_legacy(cls, value: str):
        """Convert legacy UPPERCASE values to lowercase"""
        if not value:
            return cls.LEFT
        
        value_lower = str(value).lower().strip()
        
        mapping = {
            'left': cls.LEFT,
            'l': cls.LEFT,
            'sol': cls.LEFT,
            'right': cls.RIGHT,
            'r': cls.RIGHT,
            'sağ': cls.RIGHT,
            'both': cls.BILATERAL,
            'bilateral': cls.BILATERAL,
            'her iki': cls.BILATERAL,
            'ikisi': cls.BILATERAL,
        }
        
        return mapping.get(value_lower, cls.LEFT)


class DeviceStatus(str, Enum):
    """Device status in system"""
    IN_STOCK = 'in_stock'
    ASSIGNED = 'assigned'
    TRIAL = 'trial'
    DEFECTIVE = 'defective'
    LOST = 'lost'
    RETURNED = 'returned'

    @classmethod
    def from_legacy(cls, value: str):
        """Convert legacy UPPERCASE values to lowercase"""
        if not value:
            return cls.IN_STOCK
        
        value_lower = str(value).lower().strip()
        
        mapping = {
            'in_stock': cls.IN_STOCK,
            'stokta': cls.IN_STOCK,
            'available': cls.IN_STOCK,
            'mevcut': cls.IN_STOCK,
            'assigned': cls.ASSIGNED,
            'atanmış': cls.ASSIGNED,
            'trial': cls.TRIAL,
            'deneme': cls.TRIAL,
            'defective': cls.DEFECTIVE,
            'bozuk': cls.DEFECTIVE,
            'lost': cls.LOST,
            'kayıp': cls.LOST,
            'returned': cls.RETURNED,
            'iade': cls.RETURNED,
        }
        
        return mapping.get(value_lower, cls.IN_STOCK)


class DeviceCategory(str, Enum):
    """Device category types"""
    HEARING_AID = 'hearing_aid'
    BATTERY = 'battery'
    ACCESSORY = 'accessory'
    MAINTENANCE = 'maintenance'

    @classmethod
    def from_legacy(cls, value: str):
        """Convert legacy UPPERCASE values to lowercase"""
        if not value:
            return cls.HEARING_AID
        
        value_lower = str(value).lower().strip()
        
        mapping = {
            'hearing_aid': cls.HEARING_AID,
            'işitme_cihazı': cls.HEARING_AID,
            'cihaz': cls.HEARING_AID,
            'battery': cls.BATTERY,
            'pil': cls.BATTERY,
            'accessory': cls.ACCESSORY,
            'aksesuar': cls.ACCESSORY,
            'maintenance': cls.MAINTENANCE,
            'bakım': cls.MAINTENANCE,
        }
        
        return mapping.get(value_lower, cls.HEARING_AID)


# Multi-Product Architecture Enums (Contract #18)
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
