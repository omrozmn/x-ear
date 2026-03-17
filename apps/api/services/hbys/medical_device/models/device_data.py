"""
Device Data Model
Stores raw and parsed data received from medical devices.
"""
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class DeviceData(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "medical_device_data"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("ddt"))
    device_id = Column(
        String(36),
        ForeignKey("medical_device_registry.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    patient_id = Column(String(36), nullable=True, index=True)

    # Data classification
    data_type = Column(String(20), nullable=False, default="lab_result")
    # data_type: lab_result / vital_sign / waveform / image / ecg / report

    # Raw and parsed content
    raw_message = Column(Text, nullable=False)
    parsed_data = Column(Text, nullable=True)  # JSON string

    # Processing metadata
    received_at = Column(DateTime, nullable=False, default=now_utc)
    processed = Column(Boolean, nullable=False, default=False)
    processing_error = Column(Text, nullable=True)

    # Order linking
    linked_order_id = Column(String(36), nullable=True, index=True)

    # Relationships
    device = relationship("DeviceRegistry", back_populates="data_records")

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "deviceId": self.device_id,
            "patientId": self.patient_id,
            "dataType": self.data_type,
            "rawMessage": self.raw_message,
            "parsedData": self.parsed_data,
            "receivedAt": self._format_datetime_utc(self.received_at),
            "processed": self.processed,
            "processingError": self.processing_error,
            "linkedOrderId": self.linked_order_id,
            "tenantId": self.tenant_id,
        })
        return result
