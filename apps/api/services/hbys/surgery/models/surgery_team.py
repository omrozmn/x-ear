"""
Surgery Team Model - Tracks team members assigned to a surgical procedure.
"""
import enum
from sqlalchemy import Column, String, Text, ForeignKey, Index
from core.models.base import BaseModel, LowercaseEnum
from core.models.mixins import TenantScopedMixin
from database import gen_id


class TeamRole(str, enum.Enum):
    primary_surgeon = "primary_surgeon"
    assistant_surgeon = "assistant_surgeon"
    anesthesiologist = "anesthesiologist"
    scrub_nurse = "scrub_nurse"
    circulating_nurse = "circulating_nurse"
    technician = "technician"


class SurgeryTeam(BaseModel, TenantScopedMixin):
    __tablename__ = "hbys_surgery_teams"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("stm"))
    surgery_id = Column(
        String(36),
        ForeignKey("hbys_surgeries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        String(36),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(
        LowercaseEnum(TeamRole), nullable=False, default=TeamRole.primary_surgeon
    )
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_hbys_steam_tenant_surgery", "tenant_id", "surgery_id"),
        Index("ix_hbys_steam_tenant_user", "tenant_id", "user_id"),
    )

    def to_dict(self):
        d = self.to_dict_base()
        d.update(
            {
                "id": self.id,
                "surgeryId": self.surgery_id,
                "userId": self.user_id,
                "role": self.role.value if self.role else None,
                "notes": self.notes,
            }
        )
        return d
