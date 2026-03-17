"""
Clinical Note Model
Stores anamnesis, progress notes, discharge summaries, and consultation notes.
"""
from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id


class ClinicalNote(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "clinical_notes"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("cln"))
    encounter_id = Column(String(36), ForeignKey("clinical_encounters.id", ondelete="CASCADE"), nullable=False, index=True)

    # Note metadata
    note_type = Column(String(20), nullable=False, default="progress")
    content = Column(Text, nullable=False)
    author_id = Column(String(36), nullable=True, index=True)

    # Relationships
    encounter = relationship("Encounter", back_populates="notes")

    def to_dict(self):
        result = self.to_dict_base()
        result.update({
            "id": self.id,
            "encounterId": self.encounter_id,
            "noteType": self.note_type,
            "content": self.content,
            "authorId": self.author_id,
            "tenantId": self.tenant_id,
        })
        return result
