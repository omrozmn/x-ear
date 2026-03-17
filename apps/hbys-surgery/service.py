"""
Surgery Service - Business logic for surgical procedures, teams, checklists, and anesthesia.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy.orm import Session

from models.surgery import Surgery, SurgeryStatus
from models.surgery_team import SurgeryTeam
from models.surgical_checklist import SurgicalChecklist
from models.anesthesia_record import AnesthesiaRecord
from schemas import (
    SurgeryCreate,
    SurgeryUpdate,
    SurgeryTeamCreate,
    SurgeryTeamUpdate,
    ChecklistSignInUpdate,
    ChecklistTimeOutUpdate,
    ChecklistSignOutUpdate,
    AnesthesiaRecordCreate,
    AnesthesiaRecordUpdate,
)

logger = logging.getLogger(__name__)


class SurgeryService:
    """Service layer for surgery-related operations."""

    # -- Surgery CRUD ------------------------------------------------------

    @staticmethod
    def create_surgery(
        db: Session, data: SurgeryCreate, tenant_id: str
    ) -> Surgery:
        surgery = Surgery(
            tenant_id=tenant_id,
            encounter_id=data.encounter_id,
            patient_id=data.patient_id,
            surgery_type=data.surgery_type,
            procedure_name=data.procedure_name,
            procedure_code=data.procedure_code,
            body_site=data.body_site,
            laterality=data.laterality,
            status=data.status,
            scheduled_date=data.scheduled_date,
            operating_room=data.operating_room,
            estimated_duration_minutes=data.estimated_duration_minutes,
            anesthesia_type=data.anesthesia_type,
            pre_op_diagnosis=data.pre_op_diagnosis,
            post_op_diagnosis=data.post_op_diagnosis,
            surgical_notes=data.surgical_notes,
        )
        db.add(surgery)
        db.commit()
        db.refresh(surgery)
        logger.info("Surgery created: %s for patient %s", surgery.id, surgery.patient_id)
        return surgery

    @staticmethod
    def get_surgery(db: Session, surgery_id: str, tenant_id: str) -> Optional[Surgery]:
        return (
            db.query(Surgery)
            .filter(Surgery.id == surgery_id, Surgery.tenant_id == tenant_id)
            .first()
        )

    @staticmethod
    def list_surgeries(
        db: Session,
        tenant_id: str,
        patient_id: Optional[str] = None,
        encounter_id: Optional[str] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Tuple[List[Surgery], int]:
        query = db.query(Surgery).filter(Surgery.tenant_id == tenant_id)
        if patient_id:
            query = query.filter(Surgery.patient_id == patient_id)
        if encounter_id:
            query = query.filter(Surgery.encounter_id == encounter_id)
        if status:
            query = query.filter(Surgery.status == status)

        total = query.count()
        items = (
            query.order_by(Surgery.scheduled_date.desc().nullslast(), Surgery.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        return items, total

    @staticmethod
    def update_surgery(
        db: Session, surgery_id: str, data: SurgeryUpdate, tenant_id: str
    ) -> Optional[Surgery]:
        surgery = (
            db.query(Surgery)
            .filter(Surgery.id == surgery_id, Surgery.tenant_id == tenant_id)
            .first()
        )
        if not surgery:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(surgery, field, value)

        surgery.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(surgery)
        return surgery

    @staticmethod
    def delete_surgery(db: Session, surgery_id: str, tenant_id: str) -> bool:
        surgery = (
            db.query(Surgery)
            .filter(Surgery.id == surgery_id, Surgery.tenant_id == tenant_id)
            .first()
        )
        if not surgery:
            return False
        db.delete(surgery)
        db.commit()
        return True

    # -- Start / Complete Surgery ------------------------------------------

    @staticmethod
    def start_surgery(db: Session, surgery_id: str, tenant_id: str) -> Optional[Surgery]:
        surgery = (
            db.query(Surgery)
            .filter(Surgery.id == surgery_id, Surgery.tenant_id == tenant_id)
            .first()
        )
        if not surgery:
            return None
        if surgery.status not in (
            SurgeryStatus.planned,
            SurgeryStatus.scheduled,
            SurgeryStatus.pre_op,
        ):
            raise ValueError(
                f"Cannot start surgery in status '{surgery.status.value}'. "
                "Must be planned, scheduled, or pre_op."
            )

        # WHO Safety: sign-in checklist must be completed before surgery starts
        checklist = (
            db.query(SurgicalChecklist)
            .filter(
                SurgicalChecklist.surgery_id == surgery_id,
                SurgicalChecklist.tenant_id == tenant_id,
            )
            .first()
        )
        if not checklist or checklist.sign_in_completed_at is None:
            raise ValueError(
                "Cannot start surgery: WHO Sign-In checklist must be completed first."
            )

        surgery.status = SurgeryStatus.in_progress
        surgery.actual_start = datetime.now(timezone.utc)
        surgery.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(surgery)
        logger.info("Surgery started: %s", surgery.id)
        return surgery

    @staticmethod
    def complete_surgery(
        db: Session,
        surgery_id: str,
        tenant_id: str,
        post_op_diagnosis: Optional[str] = None,
        complications: Optional[str] = None,
        blood_loss_ml: Optional[int] = None,
        specimens_sent: Optional[bool] = None,
        surgical_notes: Optional[str] = None,
    ) -> Optional[Surgery]:
        surgery = (
            db.query(Surgery)
            .filter(Surgery.id == surgery_id, Surgery.tenant_id == tenant_id)
            .first()
        )
        if not surgery:
            return None
        if surgery.status != SurgeryStatus.in_progress:
            raise ValueError(
                f"Cannot complete surgery in status '{surgery.status.value}'. "
                "Must be in_progress."
            )

        surgery.status = SurgeryStatus.completed
        surgery.actual_end = datetime.now(timezone.utc)
        if post_op_diagnosis is not None:
            surgery.post_op_diagnosis = post_op_diagnosis
        if complications is not None:
            surgery.complications = complications
        if blood_loss_ml is not None:
            surgery.blood_loss_ml = blood_loss_ml
        if specimens_sent is not None:
            surgery.specimens_sent = specimens_sent
        if surgical_notes is not None:
            surgery.surgical_notes = surgical_notes
        surgery.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(surgery)
        logger.info("Surgery completed: %s", surgery.id)
        return surgery

    # -- Surgery Team ------------------------------------------------------

    @staticmethod
    def add_team_member(
        db: Session, surgery_id: str, data: SurgeryTeamCreate, tenant_id: str
    ) -> Optional[SurgeryTeam]:
        # Verify surgery exists
        surgery = (
            db.query(Surgery)
            .filter(Surgery.id == surgery_id, Surgery.tenant_id == tenant_id)
            .first()
        )
        if not surgery:
            return None

        member = SurgeryTeam(
            tenant_id=tenant_id,
            surgery_id=surgery_id,
            user_id=data.user_id,
            role=data.role,
            notes=data.notes,
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def list_team_members(
        db: Session, surgery_id: str, tenant_id: str
    ) -> List[SurgeryTeam]:
        return (
            db.query(SurgeryTeam)
            .filter(
                SurgeryTeam.surgery_id == surgery_id,
                SurgeryTeam.tenant_id == tenant_id,
            )
            .order_by(SurgeryTeam.created_at)
            .all()
        )

    @staticmethod
    def update_team_member(
        db: Session, member_id: str, data: SurgeryTeamUpdate, tenant_id: str
    ) -> Optional[SurgeryTeam]:
        member = (
            db.query(SurgeryTeam)
            .filter(SurgeryTeam.id == member_id, SurgeryTeam.tenant_id == tenant_id)
            .first()
        )
        if not member:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(member, field, value)

        member.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(member)
        return member

    @staticmethod
    def remove_team_member(db: Session, member_id: str, tenant_id: str) -> bool:
        member = (
            db.query(SurgeryTeam)
            .filter(SurgeryTeam.id == member_id, SurgeryTeam.tenant_id == tenant_id)
            .first()
        )
        if not member:
            return False
        db.delete(member)
        db.commit()
        return True

    # -- WHO Surgical Checklist --------------------------------------------

    @staticmethod
    def get_or_create_checklist(
        db: Session, surgery_id: str, tenant_id: str
    ) -> Optional[SurgicalChecklist]:
        # Verify surgery exists
        surgery = (
            db.query(Surgery)
            .filter(Surgery.id == surgery_id, Surgery.tenant_id == tenant_id)
            .first()
        )
        if not surgery:
            return None

        checklist = (
            db.query(SurgicalChecklist)
            .filter(
                SurgicalChecklist.surgery_id == surgery_id,
                SurgicalChecklist.tenant_id == tenant_id,
            )
            .first()
        )
        if not checklist:
            checklist = SurgicalChecklist(
                tenant_id=tenant_id,
                surgery_id=surgery_id,
            )
            db.add(checklist)
            db.commit()
            db.refresh(checklist)
        return checklist

    @staticmethod
    def complete_sign_in(
        db: Session,
        surgery_id: str,
        data: ChecklistSignInUpdate,
        completed_by: str,
        tenant_id: str,
    ) -> Optional[SurgicalChecklist]:
        checklist = SurgeryService.get_or_create_checklist(db, surgery_id, tenant_id)
        if not checklist:
            return None

        checklist.sign_in_patient_identity_confirmed = data.patient_identity_confirmed
        checklist.sign_in_site_marked = data.site_marked
        checklist.sign_in_anesthesia_check_complete = data.anesthesia_check_complete
        checklist.sign_in_pulse_oximeter_on = data.pulse_oximeter_on
        checklist.sign_in_allergies_checked = data.allergies_checked
        checklist.sign_in_airway_risk_assessed = data.airway_risk_assessed
        checklist.sign_in_completed_by = completed_by
        checklist.sign_in_completed_at = datetime.now(timezone.utc)
        checklist.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(checklist)
        return checklist

    @staticmethod
    def complete_time_out(
        db: Session,
        surgery_id: str,
        data: ChecklistTimeOutUpdate,
        completed_by: str,
        tenant_id: str,
    ) -> Optional[SurgicalChecklist]:
        checklist = SurgeryService.get_or_create_checklist(db, surgery_id, tenant_id)
        if not checklist:
            return None

        checklist.time_out_team_introduction = data.team_introduction
        checklist.time_out_patient_procedure_site_confirmed = data.patient_procedure_site_confirmed
        checklist.time_out_antibiotic_prophylaxis_given = data.antibiotic_prophylaxis_given
        checklist.time_out_critical_events_reviewed = data.critical_events_reviewed
        checklist.time_out_imaging_displayed = data.imaging_displayed
        checklist.time_out_completed_by = completed_by
        checklist.time_out_completed_at = datetime.now(timezone.utc)
        checklist.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(checklist)
        return checklist

    @staticmethod
    def complete_sign_out(
        db: Session,
        surgery_id: str,
        data: ChecklistSignOutUpdate,
        completed_by: str,
        tenant_id: str,
    ) -> Optional[SurgicalChecklist]:
        checklist = SurgeryService.get_or_create_checklist(db, surgery_id, tenant_id)
        if not checklist:
            return None

        checklist.sign_out_procedure_recorded = data.procedure_recorded
        checklist.sign_out_instrument_count_correct = data.instrument_count_correct
        checklist.sign_out_specimens_labeled = data.specimens_labeled
        checklist.sign_out_concerns_addressed = data.concerns_addressed
        checklist.sign_out_completed_by = completed_by
        checklist.sign_out_completed_at = datetime.now(timezone.utc)
        checklist.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(checklist)
        return checklist

    # -- Anesthesia Record -------------------------------------------------

    @staticmethod
    def create_anesthesia_record(
        db: Session, surgery_id: str, data: AnesthesiaRecordCreate, tenant_id: str
    ) -> Optional[AnesthesiaRecord]:
        # Verify surgery exists
        surgery = (
            db.query(Surgery)
            .filter(Surgery.id == surgery_id, Surgery.tenant_id == tenant_id)
            .first()
        )
        if not surgery:
            return None

        # Serialize JSON fields
        medications_json = None
        if data.medications_given is not None:
            medications_json = (
                json.dumps(data.medications_given)
                if not isinstance(data.medications_given, str)
                else data.medications_given
            )

        record = AnesthesiaRecord(
            tenant_id=tenant_id,
            surgery_id=surgery_id,
            anesthesiologist_id=data.anesthesiologist_id,
            asa_score=data.asa_score,
            anesthesia_type=data.anesthesia_type,
            pre_op_assessment=data.pre_op_assessment,
            medications_given=medications_json,
            post_op_instructions=data.post_op_instructions,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    @staticmethod
    def get_anesthesia_record(
        db: Session, surgery_id: str, tenant_id: str
    ) -> Optional[AnesthesiaRecord]:
        return (
            db.query(AnesthesiaRecord)
            .filter(
                AnesthesiaRecord.surgery_id == surgery_id,
                AnesthesiaRecord.tenant_id == tenant_id,
            )
            .first()
        )

    @staticmethod
    def update_anesthesia_record(
        db: Session, record_id: str, data: AnesthesiaRecordUpdate, tenant_id: str
    ) -> Optional[AnesthesiaRecord]:
        record = (
            db.query(AnesthesiaRecord)
            .filter(
                AnesthesiaRecord.id == record_id,
                AnesthesiaRecord.tenant_id == tenant_id,
            )
            .first()
        )
        if not record:
            return None

        update_data = data.model_dump(exclude_unset=True)

        # Handle JSON serialization for list/dict fields
        for json_field in ("medications_given", "vital_signs_log"):
            if json_field in update_data and update_data[json_field] is not None:
                val = update_data[json_field]
                if not isinstance(val, str):
                    update_data[json_field] = json.dumps(val)

        for field, value in update_data.items():
            setattr(record, field, value)

        record.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(record)
        return record

    # -- OR Schedule -------------------------------------------------------

    @staticmethod
    def get_or_schedule(
        db: Session,
        tenant_id: str,
        operating_room: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        status: Optional[str] = None,
    ) -> List[Surgery]:
        query = db.query(Surgery).filter(
            Surgery.tenant_id == tenant_id,
            Surgery.status.notin_(
                [SurgeryStatus.cancelled, SurgeryStatus.completed]
            )
            if not status
            else True,
        )

        if status:
            query = query.filter(Surgery.status == status)
        if operating_room:
            query = query.filter(Surgery.operating_room == operating_room)
        if date_from:
            query = query.filter(Surgery.scheduled_date >= date_from)
        if date_to:
            query = query.filter(Surgery.scheduled_date <= date_to)

        return (
            query.order_by(Surgery.scheduled_date.asc().nullslast())
            .all()
        )
