"""
Emergency Service (MS-7) - Business Logic Layer
Handles triage algorithm, bed management, and dashboard statistics.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.emergency_visit import EmergencyVisit
from models.triage_assessment import TriageAssessment
from schemas import (
    EmergencyVisitCreate,
    EmergencyVisitUpdate,
    TriageAssessmentCreate,
    DashboardStats,
)

logger = logging.getLogger(__name__)

# Active statuses (not yet finalized)
ACTIVE_STATUSES = ("waiting", "triage", "treatment", "observation")
TERMINAL_STATUSES = ("admitted", "discharged", "transferred", "deceased", "left_ama")


class EmergencyService:
    """Core business logic for the Emergency Department."""

    # --- Triage Algorithm -----------------------------------------------------

    @staticmethod
    def compute_triage(assessment: TriageAssessmentCreate) -> Tuple[int, str]:
        """
        Compute triage level (1-5) and colour based on vitals and consciousness.

        Level 1 (Red)   - Immediate / life-threatening
        Level 2 (Orange) - Very urgent
        Level 3 (Yellow) - Urgent
        Level 4 (Green)  - Less urgent
        Level 5 (Blue)   - Non-urgent

        This is a simplified rules engine inspired by the Manchester Triage System.
        """
        level = 5  # default non-urgent

        # Consciousness check
        consciousness = assessment.consciousness
        if consciousness == "unresponsive":
            level = min(level, 1)
        elif consciousness == "pain":
            level = min(level, 2)
        elif consciousness == "verbal":
            level = min(level, 3)

        # Glasgow Coma Scale
        gcs_parts = [assessment.glasgow_eye, assessment.glasgow_verbal, assessment.glasgow_motor]
        if all(p is not None for p in gcs_parts):
            gcs = sum(gcs_parts)
            if gcs <= 8:
                level = min(level, 1)
            elif gcs <= 12:
                level = min(level, 2)
            elif gcs <= 14:
                level = min(level, 3)

        # Oxygen saturation
        spo2 = assessment.oxygen_saturation
        if spo2 is not None:
            if spo2 < 85:
                level = min(level, 1)
            elif spo2 < 90:
                level = min(level, 2)
            elif spo2 < 94:
                level = min(level, 3)

        # Heart rate
        hr = assessment.heart_rate
        if hr is not None:
            if hr > 150 or hr < 40:
                level = min(level, 1)
            elif hr > 130 or hr < 50:
                level = min(level, 2)
            elif hr > 110 or hr < 55:
                level = min(level, 3)

        # Blood pressure (systolic)
        sbp = assessment.blood_pressure_systolic
        if sbp is not None:
            if sbp < 70 or sbp > 220:
                level = min(level, 1)
            elif sbp < 80 or sbp > 200:
                level = min(level, 2)
            elif sbp < 90 or sbp > 180:
                level = min(level, 3)

        # Respiratory rate
        rr = assessment.respiratory_rate
        if rr is not None:
            if rr > 35 or rr < 8:
                level = min(level, 1)
            elif rr > 30 or rr < 10:
                level = min(level, 2)
            elif rr > 25 or rr < 12:
                level = min(level, 3)

        # Temperature
        temp = assessment.temperature
        if temp is not None:
            if temp >= 41.0 or temp <= 32.0:
                level = min(level, 1)
            elif temp >= 40.0 or temp <= 33.0:
                level = min(level, 2)
            elif temp >= 39.0 or temp <= 35.0:
                level = min(level, 3)
            elif temp >= 38.0:
                level = min(level, 4)

        # Pain score
        pain = assessment.pain_score
        if pain is not None:
            if pain >= 9:
                level = min(level, 2)
            elif pain >= 7:
                level = min(level, 3)
            elif pain >= 4:
                level = min(level, 4)

        # Blood glucose
        bg = assessment.blood_glucose
        if bg is not None:
            if bg < 40 or bg > 500:
                level = min(level, 1)
            elif bg < 60 or bg > 400:
                level = min(level, 2)
            elif bg < 70 or bg > 300:
                level = min(level, 3)

        color_map = {1: "red", 2: "orange", 3: "yellow", 4: "green", 5: "blue"}
        return level, color_map[level]

    # --- Visit CRUD -----------------------------------------------------------

    @staticmethod
    def create_visit(
        db: Session,
        data: EmergencyVisitCreate,
        tenant_id: str,
    ) -> EmergencyVisit:
        visit = EmergencyVisit(
            tenant_id=tenant_id,
            patient_id=data.patient_id,
            arrival_mode=data.arrival_mode,
            arrival_date=data.arrival_date or datetime.now(timezone.utc),
            unidentified_patient_info=data.unidentified_patient_info,
            chief_complaint=data.chief_complaint,
            status="waiting",
            is_forensic_case=data.is_forensic_case,
            is_workplace_accident=data.is_workplace_accident,
            is_traffic_accident=data.is_traffic_accident,
        )
        db.add(visit)
        db.flush()
        logger.info("Emergency visit created: %s (tenant=%s)", visit.id, tenant_id)
        return visit

    @staticmethod
    def get_visit(db: Session, visit_id: str, tenant_id: str) -> Optional[EmergencyVisit]:
        return (
            db.query(EmergencyVisit)
            .filter(EmergencyVisit.id == visit_id, EmergencyVisit.tenant_id == tenant_id)
            .first()
        )

    @staticmethod
    def update_visit(
        db: Session,
        visit: EmergencyVisit,
        data: EmergencyVisitUpdate,
    ) -> EmergencyVisit:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(visit, key, value)
        db.flush()
        return visit

    @staticmethod
    def list_active_visits(
        db: Session,
        tenant_id: str,
        status_filter: Optional[str] = None,
        triage_color: Optional[str] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> Tuple[List[EmergencyVisit], int]:
        query = db.query(EmergencyVisit).filter(
            EmergencyVisit.tenant_id == tenant_id,
            EmergencyVisit.status.in_(ACTIVE_STATUSES),
        )
        if status_filter:
            query = query.filter(EmergencyVisit.status == status_filter)
        if triage_color:
            query = query.filter(EmergencyVisit.triage_color == triage_color)

        total = query.count()
        # Order by triage level (most urgent first), then arrival date
        items = (
            query.order_by(
                EmergencyVisit.triage_level.asc().nullsfirst(),
                EmergencyVisit.arrival_date.asc(),
            )
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    # --- Triage ---------------------------------------------------------------

    @staticmethod
    def perform_triage(
        db: Session,
        visit: EmergencyVisit,
        data: TriageAssessmentCreate,
        tenant_id: str,
    ) -> Tuple[EmergencyVisit, TriageAssessment]:
        """Create a triage assessment, compute level, and update the visit."""
        level, color = EmergencyService.compute_triage(data)

        # Compute GCS total
        gcs_parts = [data.glasgow_eye, data.glasgow_verbal, data.glasgow_motor]
        glasgow_total = sum(gcs_parts) if all(p is not None for p in gcs_parts) else None

        assessment = TriageAssessment(
            tenant_id=tenant_id,
            emergency_visit_id=visit.id,
            pain_score=data.pain_score,
            consciousness=data.consciousness,
            glasgow_score=glasgow_total,
            glasgow_eye=data.glasgow_eye,
            glasgow_verbal=data.glasgow_verbal,
            glasgow_motor=data.glasgow_motor,
            blood_pressure_systolic=data.blood_pressure_systolic,
            blood_pressure_diastolic=data.blood_pressure_diastolic,
            heart_rate=data.heart_rate,
            respiratory_rate=data.respiratory_rate,
            temperature=data.temperature,
            oxygen_saturation=data.oxygen_saturation,
            blood_glucose=data.blood_glucose,
            allergies=data.allergies,
            current_medications=data.current_medications,
            assessed_by=data.assessed_by,
            assessed_at=datetime.now(timezone.utc),
        )
        db.add(assessment)

        # Update visit triage fields
        visit.triage_level = level
        visit.triage_color = color
        visit.triage_nurse_id = data.assessed_by
        visit.triage_date = datetime.now(timezone.utc)
        if visit.status == "waiting":
            visit.status = "triage"

        db.flush()
        logger.info(
            "Triage completed for visit %s: level=%d color=%s", visit.id, level, color
        )
        return visit, assessment

    # --- Doctor / Bed Assignment ----------------------------------------------

    @staticmethod
    def assign_doctor(
        db: Session, visit: EmergencyVisit, doctor_id: str
    ) -> EmergencyVisit:
        visit.attending_doctor_id = doctor_id
        if visit.status in ("waiting", "triage"):
            visit.status = "treatment"
        db.flush()
        return visit

    @staticmethod
    def assign_bed(
        db: Session,
        visit: EmergencyVisit,
        bed_number: str,
        tenant_id: str,
    ) -> EmergencyVisit:
        # Check if bed is already occupied
        existing = (
            db.query(EmergencyVisit)
            .filter(
                EmergencyVisit.tenant_id == tenant_id,
                EmergencyVisit.bed_number == bed_number,
                EmergencyVisit.status.in_(ACTIVE_STATUSES),
                EmergencyVisit.id != visit.id,
            )
            .first()
        )
        if existing:
            raise ValueError(f"Bed {bed_number} is already occupied by visit {existing.id}")

        visit.bed_number = bed_number
        db.flush()
        return visit

    # --- Disposition Actions --------------------------------------------------

    @staticmethod
    def discharge_visit(
        db: Session,
        visit: EmergencyVisit,
        disposition: str,
        notes: Optional[str] = None,
    ) -> EmergencyVisit:
        visit.status = "discharged"
        visit.disposition = disposition
        visit.discharge_date = datetime.now(timezone.utc)
        visit.discharge_notes = notes
        db.flush()
        logger.info("Visit %s discharged: %s", visit.id, disposition)
        return visit

    @staticmethod
    def admit_visit(
        db: Session,
        visit: EmergencyVisit,
        disposition: str = "admitted",
        notes: Optional[str] = None,
    ) -> EmergencyVisit:
        visit.status = "admitted"
        visit.disposition = disposition
        visit.discharge_notes = notes
        visit.discharge_date = datetime.now(timezone.utc)
        db.flush()
        logger.info("Visit %s admitted to inpatient", visit.id)
        return visit

    @staticmethod
    def transfer_visit(
        db: Session,
        visit: EmergencyVisit,
        destination: str,
        reason: Optional[str] = None,
    ) -> EmergencyVisit:
        visit.status = "transferred"
        visit.disposition = f"transferred:{destination}"
        visit.discharge_notes = reason
        visit.discharge_date = datetime.now(timezone.utc)
        db.flush()
        logger.info("Visit %s transferred to %s", visit.id, destination)
        return visit

    @staticmethod
    def start_observation(db: Session, visit: EmergencyVisit) -> EmergencyVisit:
        visit.status = "observation"
        visit.observation_start = datetime.now(timezone.utc)
        db.flush()
        return visit

    # --- Forensic Report ------------------------------------------------------

    @staticmethod
    def file_forensic_report(
        db: Session,
        visit: EmergencyVisit,
        report_notes: Optional[str] = None,
    ) -> EmergencyVisit:
        visit.is_forensic_case = True
        visit.forensic_report_filed = True
        if report_notes:
            existing = visit.discharge_notes or ""
            visit.discharge_notes = (
                f"{existing}\n[FORENSIC] {report_notes}".strip()
            )
        db.flush()
        logger.info("Forensic report filed for visit %s", visit.id)
        return visit

    # --- Dashboard Statistics -------------------------------------------------

    @staticmethod
    def get_dashboard_stats(db: Session, tenant_id: str) -> DashboardStats:
        """Compute real-time emergency department statistics."""
        base = db.query(EmergencyVisit).filter(
            EmergencyVisit.tenant_id == tenant_id,
            EmergencyVisit.status.in_(ACTIVE_STATUSES),
        )

        total_active = base.count()

        # Status counts
        status_counts = dict(
            db.query(EmergencyVisit.status, func.count(EmergencyVisit.id))
            .filter(
                EmergencyVisit.tenant_id == tenant_id,
                EmergencyVisit.status.in_(ACTIVE_STATUSES),
            )
            .group_by(EmergencyVisit.status)
            .all()
        )

        # Triage colour counts
        color_counts = dict(
            db.query(EmergencyVisit.triage_color, func.count(EmergencyVisit.id))
            .filter(
                EmergencyVisit.tenant_id == tenant_id,
                EmergencyVisit.status.in_(ACTIVE_STATUSES),
                EmergencyVisit.triage_color.isnot(None),
            )
            .group_by(EmergencyVisit.triage_color)
            .all()
        )

        # Forensic count
        forensic_count = base.filter(EmergencyVisit.is_forensic_case.is_(True)).count()

        # Beds occupied
        beds_occupied = base.filter(EmergencyVisit.bed_number.isnot(None)).count()

        # Average wait time for patients still waiting
        now = datetime.now(timezone.utc)
        waiting_visits = (
            base.filter(EmergencyVisit.status == "waiting")
            .with_entities(EmergencyVisit.arrival_date)
            .all()
        )
        avg_wait = None
        if waiting_visits:
            total_minutes = sum(
                (now - v.arrival_date).total_seconds() / 60.0
                for v in waiting_visits
                if v.arrival_date
            )
            avg_wait = round(total_minutes / len(waiting_visits), 1)

        return DashboardStats(
            total_active=total_active,
            waiting=status_counts.get("waiting", 0),
            in_triage=status_counts.get("triage", 0),
            in_treatment=status_counts.get("treatment", 0),
            in_observation=status_counts.get("observation", 0),
            red_triage=color_counts.get("red", 0),
            orange_triage=color_counts.get("orange", 0),
            yellow_triage=color_counts.get("yellow", 0),
            green_triage=color_counts.get("green", 0),
            blue_triage=color_counts.get("blue", 0),
            forensic_cases=forensic_count,
            beds_occupied=beds_occupied,
            avg_wait_minutes=avg_wait,
        )
