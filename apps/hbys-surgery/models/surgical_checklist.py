"""
Surgical Checklist Model - WHO Surgical Safety Checklist (Sign In / Time Out / Sign Out).
"""
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Index

from hbys_common.database import Base, BaseModel, TenantScopedMixin, gen_id


class SurgicalChecklist(Base, TenantScopedMixin, BaseModel):
    __tablename__ = "hbys_surgical_checklists"

    id = Column(String(36), primary_key=True, default=lambda: gen_id("scl"))
    surgery_id = Column(
        String(36),
        ForeignKey("hbys_surgeries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # -- Sign In (Before Induction of Anesthesia) --
    sign_in_patient_identity_confirmed = Column(Boolean, nullable=False, default=False)
    sign_in_site_marked = Column(Boolean, nullable=False, default=False)
    sign_in_anesthesia_check_complete = Column(Boolean, nullable=False, default=False)
    sign_in_pulse_oximeter_on = Column(Boolean, nullable=False, default=False)
    sign_in_allergies_checked = Column(Boolean, nullable=False, default=False)
    sign_in_airway_risk_assessed = Column(Boolean, nullable=False, default=False)
    sign_in_completed_by = Column(String(36), nullable=True)
    sign_in_completed_at = Column(DateTime, nullable=True)

    # -- Time Out (Before Skin Incision) --
    time_out_team_introduction = Column(Boolean, nullable=False, default=False)
    time_out_patient_procedure_site_confirmed = Column(Boolean, nullable=False, default=False)
    time_out_antibiotic_prophylaxis_given = Column(Boolean, nullable=False, default=False)
    time_out_critical_events_reviewed = Column(Boolean, nullable=False, default=False)
    time_out_imaging_displayed = Column(Boolean, nullable=False, default=False)
    time_out_completed_by = Column(String(36), nullable=True)
    time_out_completed_at = Column(DateTime, nullable=True)

    # -- Sign Out (Before Patient Leaves OR) --
    sign_out_procedure_recorded = Column(Boolean, nullable=False, default=False)
    sign_out_instrument_count_correct = Column(Boolean, nullable=False, default=False)
    sign_out_specimens_labeled = Column(Boolean, nullable=False, default=False)
    sign_out_concerns_addressed = Column(Boolean, nullable=False, default=False)
    sign_out_completed_by = Column(String(36), nullable=True)
    sign_out_completed_at = Column(DateTime, nullable=True)

    # Optional notes
    notes = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_hbys_scl_tenant_surgery", "tenant_id", "surgery_id"),
    )
