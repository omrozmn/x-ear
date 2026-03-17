"""
Stock Movement Model
Tracks all pharmacy stock movements: purchases, dispensing, returns, adjustments,
expirations, and inter-pharmacy transfers.
"""
from sqlalchemy import Column, String, Integer, Text, ForeignKey
from sqlalchemy.orm import relationship

from hbys_common.database import BaseModel, TenantScopedMixin, gen_id


class StockMovement(TenantScopedMixin, BaseModel):
    __tablename__ = "pharmacy_stock_movements"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("psm"))
    pharmacy_stock_id = Column(
        String(36),
        ForeignKey("pharmacy_stocks.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    movement_type = Column(
        String(20), nullable=False
    )  # purchase / dispensing / return / adjustment / expired / transfer
    quantity = Column(Integer, nullable=False, default=0)
    reference_id = Column(String(36), nullable=True, index=True)
    performed_by = Column(String(36), nullable=False, index=True)
    notes = Column(Text, nullable=True)

    # Relationships
    stock = relationship("PharmacyStock", back_populates="movements")

    def to_dict(self):
        return {
            "id": self.id,
            "pharmacyStockId": self.pharmacy_stock_id,
            "movementType": self.movement_type,
            "quantity": self.quantity,
            "referenceId": self.reference_id,
            "performedBy": self.performed_by,
            "notes": self.notes,
            "tenantId": self.tenant_id,
            "createdAt": self._format_datetime_utc(self.created_at),
            "updatedAt": self._format_datetime_utc(self.updated_at),
        }
