"""
Surgery Team Model - Tracks team members assigned to a surgical procedure.
"""
import enum
from sqlalchemy import Column, String, Text, ForeignKey, Enum, Index

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id


class TeamRole(str, enum.Enum):
    primary_surgeon = "primary_surgeon"
    assistant_surgeon = "assistant_surgeon"
    anesthesiologist = "anesthesiologist"
    scrub_nurse = "scrub_nurse"
    circulating_nurse = "circulating_nurse"
    technician = "technician"


class SurgeryTeam(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "hbys_surgery_teams"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("stm"))
    surgery_id = Column(
        String(36),
        ForeignKey("hbys_surgeries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(String(36), nullable=False, index=True)
    role = Column(
        Enum(TeamRole, values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        default=TeamRole.primary_surgeon,
    )
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_hbys_steam_tenant_surgery", "tenant_id", "surgery_id"),
        Index("ix_hbys_steam_tenant_user", "tenant_id", "user_id"),
    )
