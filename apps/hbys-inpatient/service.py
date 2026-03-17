"""
Inpatient Service - Business logic for admissions, wards, beds,
nursing observations, and nurse orders.
"""
import logging
from datetime import datetime, timezone
from typing import Optional, List

from sqlalchemy import func
from sqlalchemy.orm import Session

from hbys_common.database import gen_id, now_utc, json_dump, json_load

from models.admission import Admission
from models.ward import Ward
from models.bed import Bed
from models.nursing_observation import NursingObservation
from models.nurse_order import NurseOrder
from schemas import (
    # Ward
    WardCreate, WardUpdate, WardRead, WardListResponse,
    # Bed
    BedCreate, BedUpdate, BedRead, BedListResponse,
    # Admission
    AdmissionCreate, AdmissionUpdate, AdmissionDischarge, AdmissionTransfer,
    AdmissionRead, AdmissionListResponse,
    # Nursing Observation
    NursingObservationCreate, NursingObservationUpdate, NursingObservationRead,
    NursingObservationListResponse,
    # Nurse Order
    NurseOrderCreate, NurseOrderUpdate, NurseOrderExecute, NurseOrderRead,
    NurseOrderListResponse,
    # Dashboard
    IOBalanceResponse, WardOccupancySummary, InpatientDashboard,
)

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# Ward CRUD
# ═══════════════════════════════════════════════════════════════════════════

def create_ward(db: Session, data: WardCreate, tenant_id: str) -> Ward:
    ward = Ward(
        id=gen_id("wrd"),
        name=data.name,
        code=data.code,
        ward_type=data.ward_type,
        floor=data.floor,
        total_beds=data.total_beds,
        active_beds=data.active_beds,
        head_nurse_id=data.head_nurse_id,
        phone_extension=data.phone_extension,
        is_active=data.is_active,
        tenant_id=tenant_id,
    )
    db.add(ward)
    db.commit()
    db.refresh(ward)
    logger.info("Ward created: id=%s, name=%s", ward.id, ward.name)
    return ward


def list_wards(
    db: Session, tenant_id: str, is_active: Optional[bool] = None,
    skip: int = 0, limit: int = 50,
) -> WardListResponse:
    q = db.query(Ward).filter(Ward.tenant_id == tenant_id)
    if is_active is not None:
        q = q.filter(Ward.is_active == is_active)
    total = q.count()
    items = q.order_by(Ward.name).offset(skip).limit(limit).all()
    return WardListResponse(
        items=[WardRead.model_validate(w) for w in items],
        total=total,
    )


def get_ward(db: Session, ward_id: str, tenant_id: str) -> Optional[Ward]:
    return (
        db.query(Ward)
        .filter(Ward.id == ward_id, Ward.tenant_id == tenant_id)
        .first()
    )


def update_ward(
    db: Session, ward_id: str, data: WardUpdate, tenant_id: str,
) -> Optional[Ward]:
    ward = get_ward(db, ward_id, tenant_id)
    if not ward:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(ward, field, value)
    db.commit()
    db.refresh(ward)
    logger.info("Ward updated: id=%s", ward_id)
    return ward


def delete_ward(db: Session, ward_id: str, tenant_id: str) -> bool:
    ward = get_ward(db, ward_id, tenant_id)
    if not ward:
        return False
    db.delete(ward)
    db.commit()
    logger.info("Ward deleted: id=%s", ward_id)
    return True


# ═══════════════════════════════════════════════════════════════════════════
# Bed CRUD
# ═══════════════════════════════════════════════════════════════════════════

def create_bed(db: Session, data: BedCreate, tenant_id: str) -> Bed:
    bed = Bed(
        id=gen_id("bed"),
        ward_id=data.ward_id,
        bed_number=data.bed_number,
        room_number=data.room_number,
        bed_type=data.bed_type,
        status=data.status,
        current_patient_id=data.current_patient_id,
        features=json_dump(data.features) if data.features else None,
        tenant_id=tenant_id,
    )
    db.add(bed)
    db.commit()
    db.refresh(bed)
    logger.info("Bed created: id=%s, ward=%s, bed_number=%s", bed.id, bed.ward_id, bed.bed_number)
    return bed


def list_beds(
    db: Session, tenant_id: str, ward_id: Optional[str] = None,
    status: Optional[str] = None, skip: int = 0, limit: int = 100,
) -> BedListResponse:
    q = db.query(Bed).filter(Bed.tenant_id == tenant_id)
    if ward_id:
        q = q.filter(Bed.ward_id == ward_id)
    if status:
        q = q.filter(Bed.status == status)
    total = q.count()
    items = q.order_by(Bed.room_number, Bed.bed_number).offset(skip).limit(limit).all()
    return BedListResponse(
        items=[_bed_to_read(b) for b in items],
        total=total,
    )


def get_bed(db: Session, bed_id: str, tenant_id: str) -> Optional[Bed]:
    return (
        db.query(Bed)
        .filter(Bed.id == bed_id, Bed.tenant_id == tenant_id)
        .first()
    )


def update_bed(
    db: Session, bed_id: str, data: BedUpdate, tenant_id: str,
) -> Optional[Bed]:
    bed = get_bed(db, bed_id, tenant_id)
    if not bed:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "features" in update_data:
        update_data["features"] = json_dump(update_data["features"]) if update_data["features"] else None
    for field, value in update_data.items():
        setattr(bed, field, value)
    db.commit()
    db.refresh(bed)
    logger.info("Bed updated: id=%s", bed_id)
    return bed


def delete_bed(db: Session, bed_id: str, tenant_id: str) -> bool:
    bed = get_bed(db, bed_id, tenant_id)
    if not bed:
        return False
    db.delete(bed)
    db.commit()
    logger.info("Bed deleted: id=%s", bed_id)
    return True


def _bed_to_read(bed: Bed) -> BedRead:
    """Convert Bed ORM to BedRead, parsing JSON features."""
    data = {
        "id": bed.id,
        "ward_id": bed.ward_id,
        "bed_number": bed.bed_number,
        "room_number": bed.room_number,
        "bed_type": bed.bed_type,
        "status": bed.status,
        "current_patient_id": bed.current_patient_id,
        "features": json_load(bed.features) if bed.features else None,
        "tenant_id": bed.tenant_id,
        "created_at": bed.created_at,
        "updated_at": bed.updated_at,
    }
    return BedRead(**data)


# ═══════════════════════════════════════════════════════════════════════════
# Admission CRUD
# ═══════════════════════════════════════════════════════════════════════════

def create_admission(db: Session, data: AdmissionCreate, tenant_id: str) -> Admission:
    admission = Admission(
        id=gen_id("adm"),
        encounter_id=data.encounter_id,
        patient_id=data.patient_id,
        admitting_doctor_id=data.admitting_doctor_id,
        attending_doctor_id=data.attending_doctor_id,
        admission_date=data.admission_date or now_utc(),
        admission_type=data.admission_type,
        status=data.status,
        ward_id=data.ward_id,
        bed_id=data.bed_id,
        admission_diagnosis=data.admission_diagnosis,
        diet_type=data.diet_type,
        activity_level=data.activity_level,
        isolation_type=data.isolation_type,
        tenant_id=tenant_id,
    )
    db.add(admission)

    # Mark bed as occupied if assigned
    if data.bed_id:
        bed = get_bed(db, data.bed_id, tenant_id)
        if bed:
            bed.status = "occupied"
            bed.current_patient_id = data.patient_id

    db.commit()
    db.refresh(admission)
    logger.info("Admission created: id=%s, patient=%s", admission.id, admission.patient_id)
    return admission


def list_admissions(
    db: Session, tenant_id: str, status: Optional[str] = None,
    ward_id: Optional[str] = None, patient_id: Optional[str] = None,
    skip: int = 0, limit: int = 50,
) -> AdmissionListResponse:
    q = db.query(Admission).filter(Admission.tenant_id == tenant_id)
    if status:
        q = q.filter(Admission.status == status)
    if ward_id:
        q = q.filter(Admission.ward_id == ward_id)
    if patient_id:
        q = q.filter(Admission.patient_id == patient_id)
    total = q.count()
    items = q.order_by(Admission.admission_date.desc()).offset(skip).limit(limit).all()
    return AdmissionListResponse(
        items=[AdmissionRead.model_validate(a) for a in items],
        total=total,
    )


def get_admission(db: Session, admission_id: str, tenant_id: str) -> Optional[Admission]:
    return (
        db.query(Admission)
        .filter(Admission.id == admission_id, Admission.tenant_id == tenant_id)
        .first()
    )


def update_admission(
    db: Session, admission_id: str, data: AdmissionUpdate, tenant_id: str,
) -> Optional[Admission]:
    admission = get_admission(db, admission_id, tenant_id)
    if not admission:
        return None

    old_bed_id = admission.bed_id
    update_data = data.model_dump(exclude_unset=True)
    new_bed_id = update_data.get("bed_id")

    for field, value in update_data.items():
        setattr(admission, field, value)

    # Handle bed change
    if new_bed_id and new_bed_id != old_bed_id:
        # Free old bed
        if old_bed_id:
            old_bed = get_bed(db, old_bed_id, tenant_id)
            if old_bed:
                old_bed.status = "available"
                old_bed.current_patient_id = None
        # Occupy new bed
        new_bed = get_bed(db, new_bed_id, tenant_id)
        if new_bed:
            new_bed.status = "occupied"
            new_bed.current_patient_id = admission.patient_id

    db.commit()
    db.refresh(admission)
    logger.info("Admission updated: id=%s", admission_id)
    return admission


def discharge_admission(
    db: Session, admission_id: str, data: AdmissionDischarge, tenant_id: str,
) -> Optional[Admission]:
    admission = get_admission(db, admission_id, tenant_id)
    if not admission:
        return None

    admission.status = "discharged"
    admission.discharge_date = data.discharge_date or now_utc()
    admission.discharge_type = data.discharge_type
    admission.discharge_diagnosis = data.discharge_diagnosis
    admission.discharge_summary = data.discharge_summary
    admission.follow_up_instructions = data.follow_up_instructions

    # Free the bed
    if admission.bed_id:
        bed = get_bed(db, admission.bed_id, tenant_id)
        if bed:
            bed.status = "cleaning"
            bed.current_patient_id = None

    # Cancel active nurse orders
    active_orders = (
        db.query(NurseOrder)
        .filter(
            NurseOrder.admission_id == admission_id,
            NurseOrder.tenant_id == tenant_id,
            NurseOrder.status == "active",
        )
        .all()
    )
    for order in active_orders:
        order.status = "completed"

    db.commit()
    db.refresh(admission)
    logger.info("Admission discharged: id=%s, type=%s", admission_id, data.discharge_type)
    return admission


def transfer_admission(
    db: Session, admission_id: str, data: AdmissionTransfer, tenant_id: str,
) -> Optional[Admission]:
    admission = get_admission(db, admission_id, tenant_id)
    if not admission:
        return None

    # Free old bed
    if admission.bed_id:
        old_bed = get_bed(db, admission.bed_id, tenant_id)
        if old_bed:
            old_bed.status = "cleaning"
            old_bed.current_patient_id = None

    # Assign new ward and bed
    admission.ward_id = data.target_ward_id
    admission.bed_id = data.target_bed_id
    admission.status = "in_treatment"

    if data.target_bed_id:
        new_bed = get_bed(db, data.target_bed_id, tenant_id)
        if new_bed:
            new_bed.status = "occupied"
            new_bed.current_patient_id = admission.patient_id

    db.commit()
    db.refresh(admission)
    logger.info(
        "Admission transferred: id=%s, to_ward=%s, to_bed=%s",
        admission_id, data.target_ward_id, data.target_bed_id,
    )
    return admission


def delete_admission(db: Session, admission_id: str, tenant_id: str) -> bool:
    admission = get_admission(db, admission_id, tenant_id)
    if not admission:
        return False
    # Free bed
    if admission.bed_id:
        bed = get_bed(db, admission.bed_id, tenant_id)
        if bed:
            bed.status = "available"
            bed.current_patient_id = None
    db.delete(admission)
    db.commit()
    logger.info("Admission deleted: id=%s", admission_id)
    return True


# ═══════════════════════════════════════════════════════════════════════════
# Nursing Observation CRUD
# ═══════════════════════════════════════════════════════════════════════════

def create_nursing_observation(
    db: Session, data: NursingObservationCreate, tenant_id: str,
) -> NursingObservation:
    obs = NursingObservation(
        id=gen_id("nob"),
        admission_id=data.admission_id,
        patient_id=data.patient_id,
        observation_type=data.observation_type,
        nurse_id=data.nurse_id,
        observed_at=data.observed_at or now_utc(),
        vital_data=json_dump(data.vital_data) if data.vital_data else None,
        intake_ml=data.intake_ml,
        output_ml=data.output_ml,
        pain_score=data.pain_score,
        fall_risk_score=data.fall_risk_score,
        braden_score=data.braden_score,
        glasgow_score=data.glasgow_score,
        notes=data.notes,
        shift=data.shift,
        tenant_id=tenant_id,
    )
    db.add(obs)
    db.commit()
    db.refresh(obs)
    logger.info("Nursing observation created: id=%s, type=%s", obs.id, obs.observation_type)
    return obs


def list_nursing_observations(
    db: Session, tenant_id: str, admission_id: Optional[str] = None,
    observation_type: Optional[str] = None, shift: Optional[str] = None,
    skip: int = 0, limit: int = 50,
) -> NursingObservationListResponse:
    q = db.query(NursingObservation).filter(NursingObservation.tenant_id == tenant_id)
    if admission_id:
        q = q.filter(NursingObservation.admission_id == admission_id)
    if observation_type:
        q = q.filter(NursingObservation.observation_type == observation_type)
    if shift:
        q = q.filter(NursingObservation.shift == shift)
    total = q.count()
    items = q.order_by(NursingObservation.observed_at.desc()).offset(skip).limit(limit).all()
    return NursingObservationListResponse(
        items=[_observation_to_read(o) for o in items],
        total=total,
    )


def get_nursing_observation(
    db: Session, observation_id: str, tenant_id: str,
) -> Optional[NursingObservation]:
    return (
        db.query(NursingObservation)
        .filter(NursingObservation.id == observation_id, NursingObservation.tenant_id == tenant_id)
        .first()
    )


def update_nursing_observation(
    db: Session, observation_id: str, data: NursingObservationUpdate, tenant_id: str,
) -> Optional[NursingObservation]:
    obs = get_nursing_observation(db, observation_id, tenant_id)
    if not obs:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "vital_data" in update_data:
        update_data["vital_data"] = json_dump(update_data["vital_data"]) if update_data["vital_data"] else None
    for field, value in update_data.items():
        setattr(obs, field, value)
    db.commit()
    db.refresh(obs)
    logger.info("Nursing observation updated: id=%s", observation_id)
    return obs


def delete_nursing_observation(
    db: Session, observation_id: str, tenant_id: str,
) -> bool:
    obs = get_nursing_observation(db, observation_id, tenant_id)
    if not obs:
        return False
    db.delete(obs)
    db.commit()
    logger.info("Nursing observation deleted: id=%s", observation_id)
    return True


def _observation_to_read(obs: NursingObservation) -> NursingObservationRead:
    """Convert NursingObservation ORM to read schema, parsing JSON."""
    return NursingObservationRead(
        id=obs.id,
        admission_id=obs.admission_id,
        patient_id=obs.patient_id,
        observation_type=obs.observation_type,
        nurse_id=obs.nurse_id,
        observed_at=obs.observed_at,
        vital_data=json_load(obs.vital_data) if obs.vital_data else None,
        intake_ml=obs.intake_ml,
        output_ml=obs.output_ml,
        pain_score=obs.pain_score,
        fall_risk_score=obs.fall_risk_score,
        braden_score=obs.braden_score,
        glasgow_score=obs.glasgow_score,
        notes=obs.notes,
        shift=obs.shift,
        tenant_id=obs.tenant_id,
        created_at=obs.created_at,
        updated_at=obs.updated_at,
    )


# ═══════════════════════════════════════════════════════════════════════════
# Nurse Order CRUD
# ═══════════════════════════════════════════════════════════════════════════

def create_nurse_order(
    db: Session, data: NurseOrderCreate, tenant_id: str,
) -> NurseOrder:
    order = NurseOrder(
        id=gen_id("nor"),
        admission_id=data.admission_id,
        patient_id=data.patient_id,
        order_type=data.order_type,
        description=data.description,
        frequency=data.frequency,
        scheduled_times=json_dump(data.scheduled_times) if data.scheduled_times else None,
        status=data.status,
        ordered_by=data.ordered_by,
        notes=data.notes,
        tenant_id=tenant_id,
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    logger.info("Nurse order created: id=%s, type=%s", order.id, order.order_type)
    return order


def list_nurse_orders(
    db: Session, tenant_id: str, admission_id: Optional[str] = None,
    status: Optional[str] = None, order_type: Optional[str] = None,
    skip: int = 0, limit: int = 50,
) -> NurseOrderListResponse:
    q = db.query(NurseOrder).filter(NurseOrder.tenant_id == tenant_id)
    if admission_id:
        q = q.filter(NurseOrder.admission_id == admission_id)
    if status:
        q = q.filter(NurseOrder.status == status)
    if order_type:
        q = q.filter(NurseOrder.order_type == order_type)
    total = q.count()
    items = q.order_by(NurseOrder.created_at.desc()).offset(skip).limit(limit).all()
    return NurseOrderListResponse(
        items=[_order_to_read(o) for o in items],
        total=total,
    )


def get_nurse_order(
    db: Session, order_id: str, tenant_id: str,
) -> Optional[NurseOrder]:
    return (
        db.query(NurseOrder)
        .filter(NurseOrder.id == order_id, NurseOrder.tenant_id == tenant_id)
        .first()
    )


def update_nurse_order(
    db: Session, order_id: str, data: NurseOrderUpdate, tenant_id: str,
) -> Optional[NurseOrder]:
    order = get_nurse_order(db, order_id, tenant_id)
    if not order:
        return None
    update_data = data.model_dump(exclude_unset=True)
    if "scheduled_times" in update_data:
        update_data["scheduled_times"] = (
            json_dump(update_data["scheduled_times"]) if update_data["scheduled_times"] else None
        )
    for field, value in update_data.items():
        setattr(order, field, value)
    db.commit()
    db.refresh(order)
    logger.info("Nurse order updated: id=%s", order_id)
    return order


def execute_nurse_order(
    db: Session, order_id: str, data: NurseOrderExecute, tenant_id: str,
) -> Optional[NurseOrder]:
    order = get_nurse_order(db, order_id, tenant_id)
    if not order:
        return None
    order.executed_by = data.executed_by
    order.executed_at = data.executed_at or now_utc()
    order.status = "completed"
    if data.notes:
        existing = order.notes or ""
        order.notes = f"{existing}\n[Executed] {data.notes}".strip()
    db.commit()
    db.refresh(order)
    logger.info("Nurse order executed: id=%s, by=%s", order_id, data.executed_by)
    return order


def delete_nurse_order(
    db: Session, order_id: str, tenant_id: str,
) -> bool:
    order = get_nurse_order(db, order_id, tenant_id)
    if not order:
        return False
    db.delete(order)
    db.commit()
    logger.info("Nurse order deleted: id=%s", order_id)
    return True


def _order_to_read(order: NurseOrder) -> NurseOrderRead:
    """Convert NurseOrder ORM to read schema, parsing JSON."""
    return NurseOrderRead(
        id=order.id,
        admission_id=order.admission_id,
        patient_id=order.patient_id,
        order_type=order.order_type,
        description=order.description,
        frequency=order.frequency,
        scheduled_times=json_load(order.scheduled_times) if order.scheduled_times else None,
        status=order.status,
        ordered_by=order.ordered_by,
        executed_by=order.executed_by,
        executed_at=order.executed_at,
        notes=order.notes,
        tenant_id=order.tenant_id,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


# ═══════════════════════════════════════════════════════════════════════════
# I/O Balance
# ═══════════════════════════════════════════════════════════════════════════

def get_io_balance(
    db: Session, admission_id: str, tenant_id: str,
    date_from: Optional[datetime] = None, date_to: Optional[datetime] = None,
) -> Optional[IOBalanceResponse]:
    admission = get_admission(db, admission_id, tenant_id)
    if not admission:
        return None

    q = db.query(NursingObservation).filter(
        NursingObservation.admission_id == admission_id,
        NursingObservation.tenant_id == tenant_id,
        NursingObservation.observation_type == "intake_output",
    )
    if date_from:
        q = q.filter(NursingObservation.observed_at >= date_from)
    if date_to:
        q = q.filter(NursingObservation.observed_at <= date_to)

    observations = q.order_by(NursingObservation.observed_at.desc()).all()

    total_intake = sum(o.intake_ml or 0.0 for o in observations)
    total_output = sum(o.output_ml or 0.0 for o in observations)

    return IOBalanceResponse(
        admission_id=admission_id,
        patient_id=admission.patient_id,
        total_intake_ml=total_intake,
        total_output_ml=total_output,
        balance_ml=total_intake - total_output,
        observations=[_observation_to_read(o) for o in observations],
    )


# ═══════════════════════════════════════════════════════════════════════════
# Dashboard
# ═══════════════════════════════════════════════════════════════════════════

def get_inpatient_dashboard(db: Session, tenant_id: str) -> InpatientDashboard:
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    total_admissions = (
        db.query(func.count(Admission.id))
        .filter(Admission.tenant_id == tenant_id)
        .scalar() or 0
    )

    active_statuses = ["admitted", "in_treatment", "discharge_planned"]
    active_admissions = (
        db.query(func.count(Admission.id))
        .filter(Admission.tenant_id == tenant_id, Admission.status.in_(active_statuses))
        .scalar() or 0
    )

    discharged_today = (
        db.query(func.count(Admission.id))
        .filter(
            Admission.tenant_id == tenant_id,
            Admission.status == "discharged",
            Admission.discharge_date >= today_start,
        )
        .scalar() or 0
    )

    admitted_today = (
        db.query(func.count(Admission.id))
        .filter(
            Admission.tenant_id == tenant_id,
            Admission.admission_date >= today_start,
        )
        .scalar() or 0
    )

    # Ward occupancy
    wards = db.query(Ward).filter(Ward.tenant_id == tenant_id, Ward.is_active == True).all()  # noqa: E712
    ward_occupancy: List[WardOccupancySummary] = []
    for ward in wards:
        occupied = (
            db.query(func.count(Bed.id))
            .filter(Bed.ward_id == ward.id, Bed.tenant_id == tenant_id, Bed.status == "occupied")
            .scalar() or 0
        )
        available = (
            db.query(func.count(Bed.id))
            .filter(Bed.ward_id == ward.id, Bed.tenant_id == tenant_id, Bed.status == "available")
            .scalar() or 0
        )
        total_beds = ward.total_beds or 0
        rate = (occupied / total_beds * 100.0) if total_beds > 0 else 0.0
        ward_occupancy.append(WardOccupancySummary(
            ward_id=ward.id,
            ward_name=ward.name,
            total_beds=total_beds,
            occupied_beds=occupied,
            available_beds=available,
            occupancy_rate=round(rate, 1),
        ))

    return InpatientDashboard(
        total_admissions=total_admissions,
        active_admissions=active_admissions,
        discharged_today=discharged_today,
        admitted_today=admitted_today,
        ward_occupancy=ward_occupancy,
    )
