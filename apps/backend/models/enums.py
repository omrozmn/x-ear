# Enum Definitions for X-Ear CRM Models
# Centralized enum definitions for consistent data types

from enum import Enum

class DeviceSide(Enum):
    """Device ear/side placement"""
    LEFT = 'LEFT'
    RIGHT = 'RIGHT'
    BILATERAL = 'BILATERAL'  # Both ears
    
    @classmethod
    def from_legacy(cls, value):
        """Convert legacy values to new enum"""
        if not value:
            return cls.LEFT  # Default
        
        value_lower = str(value).lower().strip()
        
        # Legacy mappings
        if value_lower in ['left', 'l', 'sol']:
            return cls.LEFT
        elif value_lower in ['right', 'r', 'sağ']:
            return cls.RIGHT
        elif value_lower in ['both', 'bilateral', 'her iki', 'ikisi']:
            return cls.BILATERAL
        else:
            return cls.LEFT  # Default fallback

class DeviceStatus(Enum):
    """Device status in system"""
    IN_STOCK = 'IN_STOCK'          # Available in inventory
    ASSIGNED = 'ASSIGNED'          # Assigned to patient permanently
    TRIAL = 'TRIAL'                # On trial with patient
    DEFECTIVE = 'DEFECTIVE'        # Needs repair
    LOST = 'LOST'                  # Lost or stolen
    RETURNED = 'RETURNED'          # Returned from patient
    
    @classmethod
    def from_legacy(cls, value):
        """Convert legacy values to new enum"""
        if not value:
            return cls.IN_STOCK  # Default
        
        value_lower = str(value).lower().strip()
        
        # Legacy mappings
        if value_lower in ['in_stock', 'stokta', 'available', 'mevcut']:
            return cls.IN_STOCK
        elif value_lower in ['assigned', 'atanmış', 'assigned_permanent']:
            return cls.ASSIGNED
        elif value_lower in ['trial', 'deneme', 'trial_period']:
            return cls.TRIAL
        elif value_lower in ['defective', 'bozuk', 'repair', 'tamir']:
            return cls.DEFECTIVE
        elif value_lower in ['lost', 'kayıp', 'stolen', 'çalındı']:
            return cls.LOST
        elif value_lower in ['returned', 'iade', 'geri_döndü']:
            return cls.RETURNED
        else:
            return cls.IN_STOCK  # Default fallback

class DeviceCategory(Enum):
    """Device category types"""
    HEARING_AID = 'HEARING_AID'    # İşitme cihazı
    BATTERY = 'BATTERY'            # Pil
    ACCESSORY = 'ACCESSORY'        # Aksesuar
    MAINTENANCE = 'MAINTENANCE'    # Bakım malzemesi
    
    @classmethod
    def from_legacy(cls, value):
        """Convert legacy values to new enum"""
        if not value:
            return cls.HEARING_AID  # Default
        
        value_lower = str(value).lower().strip()
        
        # Legacy mappings
        if value_lower in ['hearing_aid', 'işitme_cihazı', 'cihaz']:
            return cls.HEARING_AID
        elif value_lower in ['battery', 'pil', 'batarya']:
            return cls.BATTERY
        elif value_lower in ['accessory', 'aksesuar', 'aksesuarlar']:
            return cls.ACCESSORY
        elif value_lower in ['maintenance', 'bakım', 'bakim']:
            return cls.MAINTENANCE
        else:
            return cls.HEARING_AID  # Default fallback

class AppointmentStatus(Enum):
    """Appointment status types"""
    SCHEDULED = 'SCHEDULED'        # Planlandı
    CONFIRMED = 'CONFIRMED'        # Onaylandı
    IN_PROGRESS = 'IN_PROGRESS'    # Devam ediyor
    COMPLETED = 'COMPLETED'        # Tamamlandı
    CANCELLED = 'CANCELLED'        # İptal edildi
    NO_SHOW = 'NO_SHOW'          # Gelmedi
    RESCHEDULED = 'RESCHEDULED'   # Ertelendi
    
    @classmethod
    def from_legacy(cls, value):
        """Convert legacy values to new enum"""
        if not value:
            return cls.SCHEDULED  # Default
        
        value_lower = str(value).lower().strip()
        
        if value_lower in ['scheduled', 'planlandı', 'planned']:
            return cls.SCHEDULED
        elif value_lower in ['confirmed', 'onaylandı', 'confirmed']:
            return cls.CONFIRMED
        elif value_lower in ['in_progress', 'devam_ediyor', 'ongoing']:
            return cls.IN_PROGRESS
        elif value_lower in ['completed', 'tamamlandı', 'finished']:
            return cls.COMPLETED
        elif value_lower in ['cancelled', 'iptal', 'canceled']:
            return cls.CANCELLED
        elif value_lower in ['no_show', 'gelmedi', 'absent']:
            return cls.NO_SHOW
        elif value_lower in ['rescheduled', 'ertelendi', 'postponed']:
            return cls.RESCHEDULED
        else:
            return cls.SCHEDULED  # Default fallback

class PatientStatus(Enum):
    """Patient status in CRM"""
    ACTIVE = 'ACTIVE'              # Aktif hasta
    INACTIVE = 'INACTIVE'          # Pasif hasta
    LEAD = 'LEAD'                  # Potansiyel hasta
    TRIAL = 'TRIAL'                # Deneme aşamasında
    CUSTOMER = 'CUSTOMER'          # Müşteri oldu
    
    @classmethod
    def from_legacy(cls, value):
        """Convert legacy values to new enum"""
        if not value:
            return cls.ACTIVE  # Default
        
        value_lower = str(value).lower().strip()
        
        if value_lower in ['active', 'aktif']:
            return cls.ACTIVE
        elif value_lower in ['inactive', 'pasif']:
            return cls.INACTIVE
        elif value_lower in ['lead', 'potansiyel']:
            return cls.LEAD
        elif value_lower in ['trial', 'deneme']:
            return cls.TRIAL
        elif value_lower in ['customer', 'müşteri']:
            return cls.CUSTOMER
        else:
            return cls.ACTIVE  # Default fallback