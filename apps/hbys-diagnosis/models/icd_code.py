"""
ICD Code Catalog Model - Reference table for ICD-10 codes.
NOT tenant-scoped: shared across all tenants.
"""
from sqlalchemy import Column, String, Boolean, Index

from hbys_common.database import BaseModel


class ICDCode(BaseModel):
    __tablename__ = "hbys_icd_codes"

    code = Column(String(20), primary_key=True)
    version = Column(String(5), nullable=False, default="10")
    name_tr = Column(String(500), nullable=False)
    name_en = Column(String(500), nullable=True)
    category = Column(String(200), nullable=True)
    chapter = Column(String(10), nullable=True)
    parent_code = Column(String(20), nullable=True, index=True)
    is_billable = Column(Boolean, nullable=False, default=True)

    __table_args__ = (
        Index("ix_hbys_icd_name_tr", "name_tr"),
        Index("ix_hbys_icd_chapter", "chapter"),
    )

    def to_dict(self):
        return {
            "code": self.code,
            "version": self.version,
            "nameTr": self.name_tr,
            "nameEn": self.name_en,
            "category": self.category,
            "chapter": self.chapter,
            "parentCode": self.parent_code,
            "isBillable": self.is_billable,
            "createdAt": self._format_datetime_utc(self.created_at),
            "updatedAt": self._format_datetime_utc(self.updated_at),
        }
