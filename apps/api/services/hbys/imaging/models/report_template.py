"""
Report Template Model
Pre-defined radiology report templates. NOT tenant-scoped (shared globally).
"""
from sqlalchemy import Column, String, Text, Boolean

from core.models.base import BaseModel
from database import Base, gen_id


class ReportTemplate(Base, BaseModel):
    __tablename__ = "radiology_report_templates"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("rtm"))
    name_tr = Column(String(255), nullable=False)
    modality = Column(String(20), nullable=True)  # Optional filter by modality
    body_part = Column(String(200), nullable=True)  # Optional filter by body part
    template_content = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)

    def to_dict(self):
        result = self.to_dict_base()
        result.update(
            {
                "id": self.id,
                "nameTr": self.name_tr,
                "modality": self.modality,
                "bodyPart": self.body_part,
                "templateContent": self.template_content,
                "isActive": self.is_active,
            }
        )
        return result
