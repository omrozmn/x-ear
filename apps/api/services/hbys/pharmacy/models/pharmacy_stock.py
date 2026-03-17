"""
Pharmacy Stock Model
Tracks medication inventory including lot numbers, barcodes, ITS tracking,
storage conditions, and narcotic status.
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, Date, Text, ForeignKey
from sqlalchemy.orm import relationship

from core.models.base import BaseModel
from core.models.mixins import TenantScopedMixin
from database import Base, gen_id, now_utc


class PharmacyStock(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "pharmacy_stocks"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("phs"))
    medication_id = Column(String(36), nullable=False, index=True)
    lot_number = Column(String(100), nullable=False)
    barcode = Column(String(100), nullable=True, index=True)
    quantity_on_hand = Column(Integer, nullable=False, default=0)
    quantity_reserved = Column(Integer, nullable=False, default=0)
    unit_cost = Column(Float, nullable=False, default=0.0)
    expiry_date = Column(Date, nullable=False)
    storage_location = Column(String(200), nullable=True)
    storage_conditions = Column(
        String(20), nullable=False, default="room_temp"
    )  # room_temp / refrigerated / frozen
    its_tracking_number = Column(String(200), nullable=True, index=True)  # ITS karekod
    is_narcotic = Column(Boolean, nullable=False, default=False)
    supplier_id = Column(
        String(36),
        ForeignKey("parties.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    movements = relationship(
        "StockMovement",
        back_populates="stock",
        cascade="all, delete-orphan",
        lazy="select",
    )

    def to_dict(self):
        result = self.to_dict_base()
        result.update(
            {
                "id": self.id,
                "medicationId": self.medication_id,
                "lotNumber": self.lot_number,
                "barcode": self.barcode,
                "quantityOnHand": self.quantity_on_hand,
                "quantityReserved": self.quantity_reserved,
                "quantityAvailable": self.quantity_on_hand - self.quantity_reserved,
                "unitCost": self.unit_cost,
                "expiryDate": str(self.expiry_date) if self.expiry_date else None,
                "storageLocation": self.storage_location,
                "storageConditions": self.storage_conditions,
                "itsTrackingNumber": self.its_tracking_number,
                "isNarcotic": self.is_narcotic,
                "supplierId": self.supplier_id,
                "tenantId": self.tenant_id,
            }
        )
        return result
