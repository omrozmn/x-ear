"""
Device Registry Model
Represents a registered medical device (analyzer, monitor, ventilator, etc.)
with its connection parameters and calibration/warranty metadata.
"""
from sqlalchemy import Column, String, Text, DateTime, Integer
from sqlalchemy.orm import relationship

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class DeviceRegistry(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "medical_device_registry"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("mdd"))

    # Device identification
    device_name = Column(String(200), nullable=False, index=True)
    device_type = Column(String(30), nullable=False, default="other")
    # device_type: analyzer / monitor / ventilator / infusion_pump / ecg / defibrillator / xray / ultrasound / other
    manufacturer = Column(String(200), nullable=True)
    model_number = Column(String(100), nullable=True)
    serial_number = Column(String(100), unique=True, nullable=False, index=True)

    # Location
    location = Column(String(200), nullable=True)

    # Network / connection settings
    ip_address = Column(String(45), nullable=True)
    port = Column(Integer, nullable=True)
    connection_type = Column(String(20), nullable=False, default="tcp")
    # connection_type: serial / tcp / hl7_mllp / dicom / http / usb
    communication_protocol = Column(String(20), nullable=False, default="hl7v2")
    # communication_protocol: hl7v2 / astm / dicom / proprietary / fhir

    # Serial-specific settings
    baud_rate = Column(Integer, nullable=True)
    data_bits = Column(Integer, nullable=True)

    # Status tracking
    status = Column(String(20), nullable=False, default="offline")
    # status: online / offline / error / maintenance / decommissioned
    last_seen_at = Column(DateTime, nullable=True)

    # Calibration & warranty
    calibration_date = Column(DateTime, nullable=True)
    next_calibration_date = Column(DateTime, nullable=True)
    warranty_expiry = Column(DateTime, nullable=True)

    # Notes
    notes = Column(Text, nullable=True)

    # Relationships
    data_records = relationship(
        "DeviceData", back_populates="device", cascade="all, delete-orphan", lazy="select"
    )
    alerts = relationship(
        "DeviceAlert", back_populates="device", cascade="all, delete-orphan", lazy="select"
    )

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "deviceName": self.device_name,
            "deviceType": self.device_type,
            "manufacturer": self.manufacturer,
            "modelNumber": self.model_number,
            "serialNumber": self.serial_number,
            "location": self.location,
            "ipAddress": self.ip_address,
            "port": self.port,
            "connectionType": self.connection_type,
            "communicationProtocol": self.communication_protocol,
            "baudRate": self.baud_rate,
            "dataBits": self.data_bits,
            "status": self.status,
            "lastSeenAt": self._format_datetime_utc(self.last_seen_at),
            "calibrationDate": self._format_datetime_utc(self.calibration_date),
            "nextCalibrationDate": self._format_datetime_utc(self.next_calibration_date),
            "warrantyExpiry": self._format_datetime_utc(self.warranty_expiry),
            "notes": self.notes,
            "tenantId": self.tenant_id,
        })
        return result
