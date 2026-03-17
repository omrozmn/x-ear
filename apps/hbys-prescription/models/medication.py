"""
Medication Catalog Model
========================
Reference / master data for medications.  NOT tenant-scoped -- shared across
the entire platform (drug database is universal).
"""
from sqlalchemy import Column, String, Boolean, Float, Index

from hbys_common.database import BaseModel, gen_id


class Medication(BaseModel):
    """
    Central medication catalog.  Populated from SGK / TITCK drug lists
    or manual entry.  All tenants share the same catalog.
    """

    __tablename__ = "hbys_medications"

    # Primary key
    id = Column(String(50), primary_key=True, default=lambda: gen_id("med"))

    # Identification
    name = Column(String(300), nullable=False, index=True)
    generic_name = Column(String(300), nullable=True, index=True)
    barcode = Column(String(50), nullable=True, unique=True)
    atc_code = Column(String(20), nullable=True, index=True)

    # Classification
    form = Column(
        String(30),
        nullable=True,
        comment="tablet | capsule | syrup | injection | cream | drop | inhaler | patch | suppository",
    )
    manufacturer = Column(String(200), nullable=True)

    # Regulatory
    is_prescription_required = Column(Boolean, default=True, nullable=False)
    is_controlled = Column(Boolean, default=False, nullable=False)
    controlled_type = Column(
        String(30),
        nullable=True,
        comment="red | green | orange | purple (nullable if not controlled)",
    )

    # Pricing
    unit_price = Column(Float, nullable=True, comment="Reference unit price in TRY")

    def to_dict(self):
        d = {
            "id": self.id,
            "name": self.name,
            "genericName": self.generic_name,
            "barcode": self.barcode,
            "atcCode": self.atc_code,
            "form": self.form,
            "manufacturer": self.manufacturer,
            "isPrescriptionRequired": self.is_prescription_required,
            "isControlled": self.is_controlled,
            "controlledType": self.controlled_type,
            "unitPrice": self.unit_price,
            "createdAt": self._format_datetime_utc(self.created_at),
            "updatedAt": self._format_datetime_utc(self.updated_at),
        }
        return d

    __table_args__ = (
        Index("ix_hbys_med_name", "name"),
        Index("ix_hbys_med_generic", "generic_name"),
        Index("ix_hbys_med_barcode", "barcode"),
        Index("ix_hbys_med_atc", "atc_code"),
    )
