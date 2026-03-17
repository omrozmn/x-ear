"""
Pharmacy Dispensing Model
Tracks medication dispensing to patients, including returns and cancellations.
"""
from sqlalchemy import Column, String, Integer, DateTime, Text

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class PharmacyDispensing(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "pharmacy_dispensings"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("phd"))
    prescription_id = Column(String(36), nullable=False, index=True)
    prescription_item_id = Column(String(36), nullable=True, index=True)
    patient_id = Column(String(36), nullable=False, index=True)
    medication_id = Column(String(36), nullable=False, index=True)
    quantity_dispensed = Column(Integer, nullable=False, default=0)
    lot_number = Column(String(100), nullable=True)
    dispensed_by = Column(String(36), nullable=False, index=True)
    dispensed_at = Column(DateTime, nullable=False, default=now_utc)
    status = Column(
        String(20), nullable=False, default="pending"
    )  # pending / dispensed / returned / cancelled
    notes = Column(Text, nullable=True)
    return_reason = Column(String(500), nullable=True)

    def to_dict(self):
        result = self.to_dict_base()
        result.update(
            {
                "id": self.id,
                "prescriptionId": self.prescription_id,
                "prescriptionItemId": self.prescription_item_id,
                "patientId": self.patient_id,
                "medicationId": self.medication_id,
                "quantityDispensed": self.quantity_dispensed,
                "lotNumber": self.lot_number,
                "dispensedBy": self.dispensed_by,
                "dispensedAt": self._format_datetime_utc(self.dispensed_at),
                "status": self.status,
                "notes": self.notes,
                "returnReason": self.return_reason,
                "tenantId": self.tenant_id,
            }
        )
        return result
