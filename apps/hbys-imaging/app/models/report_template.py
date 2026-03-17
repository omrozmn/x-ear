"""
Report Template Model
Pre-defined radiology report templates. NOT tenant-scoped (shared globally).
"""
from sqlalchemy import Column, String, Text, Boolean

from hbys_common.database import Base, BaseModel, gen_id


class ReportTemplate(Base, BaseModel):
    __tablename__ = "radiology_report_templates"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("rtm"))
    name_tr = Column(String(255), nullable=False)
    modality = Column(String(20), nullable=True)
    body_part = Column(String(200), nullable=True)
    template_content = Column(Text, nullable=False)
    is_active = Column(Boolean, nullable=False, default=True)
