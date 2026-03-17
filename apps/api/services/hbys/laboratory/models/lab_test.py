"""
Lab Test Model
Represents an individual test within a lab order, including result values and verification.
"""
from sqlalchemy import Column, String, Text, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class LabTest(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "lab_tests"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("ltst"))
    lab_order_id = Column(String(36), ForeignKey("lab_orders.id", ondelete="CASCADE"), nullable=False, index=True)
    test_definition_id = Column(String(36), ForeignKey("lab_test_definitions.id", ondelete="SET NULL"), nullable=True, index=True)

    # Test status
    status = Column(String(20), nullable=False, default="pending")  # pending / in_progress / completed / verified / cancelled

    # Result data
    result_value = Column(String(200), nullable=True)
    result_unit = Column(String(50), nullable=True)
    reference_range_low = Column(Float, nullable=True)
    reference_range_high = Column(Float, nullable=True)
    is_abnormal = Column(Boolean, nullable=False, default=False)
    is_critical = Column(Boolean, nullable=False, default=False)
    result_text = Column(Text, nullable=True)
    result_date = Column(DateTime, nullable=True)

    # Performed / verified tracking
    performed_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_by = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    verified_at = Column(DateTime, nullable=True)

    # Additional info
    notes = Column(Text, nullable=True)
    loinc_code = Column(String(20), nullable=True)

    # Relationships
    lab_order = relationship("LabOrder", back_populates="tests")
    test_definition = relationship("TestDefinition", lazy="select")

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "labOrderId": self.lab_order_id,
            "testDefinitionId": self.test_definition_id,
            "status": self.status,
            "resultValue": self.result_value,
            "resultUnit": self.result_unit,
            "referenceRangeLow": self.reference_range_low,
            "referenceRangeHigh": self.reference_range_high,
            "isAbnormal": self.is_abnormal,
            "isCritical": self.is_critical,
            "resultText": self.result_text,
            "resultDate": self._format_datetime_utc(self.result_date),
            "performedBy": self.performed_by,
            "verifiedBy": self.verified_by,
            "verifiedAt": self._format_datetime_utc(self.verified_at),
            "notes": self.notes,
            "loincCode": self.loinc_code,
            "tenantId": self.tenant_id,
        })
        return result
