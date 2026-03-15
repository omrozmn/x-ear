# Noah Import Service — Business Logic
import hashlib
import secrets
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Tuple, Dict

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from core.models.noah_import import (
    ImportSession, ImportSessionStatus,
    ImportAuditLog,
    AgentDevice, AgentDeviceStatus,
    PossibleDuplicate, DuplicateStatus,
)
from schemas.noah_imports import (
    NormalizedPayload, NoahPatient, FileMeta, ParserInfo,
)

logger = logging.getLogger(__name__)

SESSION_EXPIRY_HOURS = 24
ENROLLMENT_TOKEN_EXPIRY_HOURS = 2
DEVICE_TOKEN_EXPIRY_DAYS = 30


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class NoahImportService:
    """Core service for Noah import pipeline."""

    # ── Import Sessions ─────────────────────────────────────
    @staticmethod
    def create_session(
        db: Session,
        tenant_id: str,
        user_id: str,
        branch_id: Optional[str] = None,
        allowed_formats: Optional[List[str]] = None,
    ) -> ImportSession:
        session = ImportSession(
            tenant_id=tenant_id,
            requesting_user_id=user_id,
            branch_id=branch_id,
            allowed_formats=allowed_formats or ["csv", "xml"],
            status=ImportSessionStatus.PENDING,
            expires_at=datetime.now(timezone.utc)
            + timedelta(hours=SESSION_EXPIRY_HOURS),
        )
        db.add(session)
        db.flush()

        NoahImportService._audit(
            db,
            tenant_id=tenant_id,
            session_id=session.id,
            user_id=user_id,
            action="session_created",
            detail={"branchId": branch_id, "formats": session.allowed_formats},
        )
        db.commit()
        return session

    @staticmethod
    def get_session(db: Session, session_id: str) -> Optional[ImportSession]:
        return db.query(ImportSession).filter(ImportSession.id == session_id).first()

    @staticmethod
    def list_sessions(
        db: Session,
        tenant_id: str,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> Tuple[List[ImportSession], int]:
        q = db.query(ImportSession)
        if status:
            q = q.filter(ImportSession.status == status)
        total = q.count()
        items = (
            q.order_by(ImportSession.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    # ── Upload & Process ────────────────────────────────────
    @staticmethod
    def process_upload(
        db: Session,
        tenant_id: str,
        session_id: str,
        device_id: str,
        file_meta: FileMeta,
        parser: ParserInfo,
        payload: NormalizedPayload,
    ) -> ImportSession:
        session = (
            db.query(ImportSession).filter(ImportSession.id == session_id).first()
        )
        if not session:
            raise ValueError("Import session not found")
        if session.status not in (
            ImportSessionStatus.PENDING,
            ImportSessionStatus.UPLOADING,
        ):
            raise ValueError(f"Session in non-uploadable state: {session.status.value}")
        expires_at = session.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at < datetime.now(timezone.utc):
            session.status = ImportSessionStatus.EXPIRED
            db.commit()
            raise ValueError("Session has expired")

        # Update session metadata
        session.status = ImportSessionStatus.PROCESSING
        session.device_id = device_id
        session.file_name = file_meta.name
        session.file_size = file_meta.size
        session.file_sha256 = file_meta.sha256
        session.file_exported_at = file_meta.exported_at
        session.parser_name = parser.name
        session.parser_version = parser.version
        session.progress_stage = "processing"
        session.progress_percent = 10
        db.flush()

        NoahImportService._audit(
            db,
            tenant_id=tenant_id,
            session_id=session.id,
            device_id=device_id,
            action="upload_received",
            detail={
                "fileName": file_meta.name,
                "fileSize": file_meta.size,
                "parserName": parser.name,
                "parserVersion": parser.version,
                "patients": len(payload.patients),
                "audiograms": len(payload.audiograms),
                "fittings": len(payload.fittings),
            },
            file_sha256=file_meta.sha256,
            parser_version=parser.version,
        )

        # Process patients
        try:
            created, updated, skipped, dups = NoahImportService._process_patients(
                db, tenant_id, session.id, payload
            )
            session.records_created = created
            session.records_updated = updated
            session.records_skipped = skipped
            session.duplicates_found = dups
            session.progress_stage = "completed"
            session.progress_percent = 100
            session.completed_at = datetime.now(timezone.utc)

            if dups > 0:
                session.status = ImportSessionStatus.COMPLETED_WITH_WARNINGS
            else:
                session.status = ImportSessionStatus.COMPLETED

            NoahImportService._audit(
                db,
                tenant_id=tenant_id,
                session_id=session.id,
                device_id=device_id,
                action="import_completed",
                detail={
                    "created": created,
                    "updated": updated,
                    "skipped": skipped,
                    "duplicates": dups,
                },
                records_created=created,
                records_updated=updated,
                outcome="success",
            )
        except Exception as exc:
            logger.error(f"Import processing failed: {exc}", exc_info=True)
            session.status = ImportSessionStatus.FAILED
            session.errors = [{"code": "PROCESSING_ERROR", "message": str(exc)}]
            session.progress_stage = "failed"
            NoahImportService._audit(
                db,
                tenant_id=tenant_id,
                session_id=session.id,
                device_id=device_id,
                action="import_failed",
                detail={"error": str(exc)},
                outcome="failure",
            )

        db.commit()
        return session

    @staticmethod
    def sync_from_agent(
        db: Session,
        device: "AgentDevice",
        file_meta: FileMeta,
        parser: ParserInfo,
        payload: NormalizedPayload,
    ) -> ImportSession:
        """
        Agent-initiated auto-sync: creates a session internally and processes
        the payload in one step. No CRM interaction required.
        """
        session = ImportSession(
            tenant_id=device.tenant_id,
            requesting_user_id=f"agent:{device.id}",
            branch_id=device.branch_id,
            device_id=device.id,
            allowed_formats=["noah_sdf_direct", "noah_sqlite_direct", "file_upload"],
            status=ImportSessionStatus.PENDING,
            expires_at=datetime.now(timezone.utc)
            + timedelta(hours=SESSION_EXPIRY_HOURS),
        )
        db.add(session)
        db.flush()

        NoahImportService._audit(
            db,
            tenant_id=device.tenant_id,
            session_id=session.id,
            device_id=device.id,
            action="agent_sync_started",
            detail={
                "parserName": parser.name,
                "parserVersion": parser.version,
                "patients": len(payload.patients),
                "audiograms": len(payload.audiograms),
                "fittings": len(payload.fittings),
            },
        )

        return NoahImportService.process_upload(
            db=db,
            tenant_id=device.tenant_id,
            session_id=session.id,
            device_id=device.id,
            file_meta=file_meta,
            parser=parser,
            payload=payload,
        )

    @staticmethod
    def _process_patients(
        db: Session,
        tenant_id: str,
        session_id: str,
        payload: NormalizedPayload,
    ) -> Tuple[int, int, int, int]:
        """Process normalized patient data: create / update / flag duplicates.
        Also builds a patient_ref→party_id mapping for audiogram linking."""
        from core.models.party import Party  # Local import to avoid circular
        import json as json_mod

        created = 0
        updated = 0
        skipped = 0
        duplicates = 0

        # Build patient_ref → party_id mapping for audiogram processing
        ref_to_party: Dict[str, str] = {}

        for patient in payload.patients:
            match_type, existing_party = NoahImportService._find_match(db, tenant_id, patient)

            if match_type == "exact" and existing_party:
                # Update existing record with new data from Noah
                NoahImportService._update_party_from_noah(existing_party, patient)
                updated += 1
                if patient.external_ids and patient.external_ids.noah_patient_id:
                    ref_to_party[patient.external_ids.noah_patient_id] = existing_party.id
                # Also map by patient_no if available
                if hasattr(patient, 'patient_no') and patient.patient_no:
                    ref_to_party[patient.patient_no] = existing_party.id
            elif match_type == "ambiguous":
                # Create possible duplicate for manual review
                dup = PossibleDuplicate(
                    tenant_id=tenant_id,
                    session_id=session_id,
                    imported_data=patient.model_dump(by_alias=True),
                    existing_party_id=existing_party.id if existing_party else None,
                    match_score=70,
                    match_reason="Name + DOB match but no national ID confirmation",
                    status=DuplicateStatus.PENDING,
                )
                db.add(dup)
                duplicates += 1
            elif match_type == "none":
                # Create new party
                new_party = NoahImportService._create_party_from_noah(tenant_id, patient)
                db.add(new_party)
                db.flush()  # Get ID assigned
                created += 1
                if patient.external_ids and patient.external_ids.noah_patient_id:
                    ref_to_party[patient.external_ids.noah_patient_id] = new_party.id
                if hasattr(patient, 'patient_no') and patient.patient_no:
                    ref_to_party[patient.patient_no] = new_party.id
            else:
                skipped += 1

        db.flush()

        # Process audiograms - link to resolved parties
        if payload.audiograms:
            audiograms_saved = NoahImportService._process_audiograms(
                db, tenant_id, payload.audiograms, ref_to_party
            )
            logger.info(f"Saved {audiograms_saved} hearing tests from Noah audiograms")

        # Process fittings - save device info linked to parties
        if payload.fittings:
            fittings_saved = NoahImportService._process_fittings(
                db, tenant_id, payload.fittings, ref_to_party
            )
            logger.info(f"Saved {fittings_saved} fitting records from Noah")

        return created, updated, skipped, duplicates

    @staticmethod
    def _process_audiograms(
        db: Session,
        tenant_id: str,
        audiograms: list,
        ref_to_party: Dict[str, str],
    ) -> int:
        """Process Noah audiogram records, saving them as HearingTest entries."""
        from core.models.medical import HearingTest
        import json as json_mod

        saved = 0
        # Group audiograms by patient_ref and date for merging L/R ears
        grouped: Dict[str, Dict[str, list]] = {}
        for ag in audiograms:
            ref = ag.patient_ref or ""
            date_key = ag.date or "unknown"
            key = f"{ref}|{date_key}"
            if key not in grouped:
                grouped[key] = {"ref": ref, "date": ag.date, "items": []}
            grouped[key]["items"].append(ag)

        for key, group in grouped.items():
            ref = group["ref"]
            party_id = ref_to_party.get(ref)

            if not party_id:
                logger.warning(f"No party found for audiogram patient_ref={ref}, skipping")
                continue

            # Build audiogramData from L/R ear thresholds
            audiogram_data: Dict[str, any] = {
                "source": "noah_import",
                "conductionType": "air",
            }

            for ag in group["items"]:
                ear = (ag.ear or "").lower()
                thresholds = ag.thresholds or {}

                if ear in ("right", "r"):
                    audiogram_data["rightEar"] = thresholds
                    if ag.conduction_type:
                        audiogram_data["conductionType"] = ag.conduction_type
                elif ear in ("left", "l"):
                    audiogram_data["leftEar"] = thresholds
                elif ear == "binaural":
                    audiogram_data["binaural"] = thresholds

                if ag.audiogram_type:
                    audiogram_data["audiogramType"] = ag.audiogram_type
                if ag.transducer:
                    audiogram_data["transducer"] = ag.transducer
                if ag.point_statuses:
                    status_key = f"{ear}PointStatuses" if ear else "pointStatuses"
                    audiogram_data[status_key] = ag.point_statuses
                if ag.notes:
                    audiogram_data["notes"] = ag.notes

            # Parse test date
            test_date = datetime.now(timezone.utc)
            if group["date"]:
                try:
                    test_date = datetime.fromisoformat(
                        group["date"].replace("Z", "+00:00")
                    )
                except (ValueError, AttributeError):
                    pass

            # Check for existing test on same date to avoid duplicates
            existing = (
                db.query(HearingTest)
                .filter(
                    HearingTest.party_id == party_id,
                    HearingTest.tenant_id == tenant_id,
                    HearingTest.test_date == test_date,
                )
                .first()
            )
            if existing:
                logger.info(f"Hearing test already exists for party {party_id} on {test_date}, skipping")
                continue

            hearing_test = HearingTest(
                party_id=party_id,
                tenant_id=tenant_id,
                test_date=test_date,
                test_type="audiometry",
                conducted_by="Noah Import",
                results=json_mod.dumps(audiogram_data),
            )
            db.add(hearing_test)
            saved += 1

        return saved

    @staticmethod
    def _process_fittings(
        db: Session,
        tenant_id: str,
        fittings: list,
        ref_to_party: Dict[str, str],
    ) -> int:
        """Process Noah fitting records — store as hearing_tests with type='fitting'."""
        from core.models.medical import HearingTest
        import json as json_mod

        saved = 0
        for fit in fittings:
            ref = fit.patient_ref or ""
            party_id = ref_to_party.get(ref)
            if not party_id:
                logger.warning(f"No party for fitting patient_ref={ref}, skipping")
                continue

            fitting_data = {
                "source": "noah_import",
                "deviceBrand": fit.device_brand,
                "deviceModel": fit.device_model,
                "deviceSerial": fit.device_serial,
                "deviceCategory": getattr(fit, "device_category", None),
                "batteryType": getattr(fit, "battery_type", None),
                "earMold": getattr(fit, "ear_mold", None),
                "fittingType": getattr(fit, "fitting_type", None),
                "ear": fit.ear,
            }
            # Remove None values
            fitting_data = {k: v for k, v in fitting_data.items() if v is not None}

            fit_date = datetime.now(timezone.utc)
            if fit.date:
                try:
                    fit_date = datetime.fromisoformat(fit.date.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    pass

            # Duplicate check — same party, same serial, same date
            serial = fit.device_serial or ""
            existing = (
                db.query(HearingTest)
                .filter(
                    HearingTest.party_id == party_id,
                    HearingTest.tenant_id == tenant_id,
                    HearingTest.test_type == "fitting",
                    HearingTest.test_date == fit_date,
                )
                .first()
            )
            if existing:
                # Check if same serial
                try:
                    ex_data = json_mod.loads(existing.results) if existing.results else {}
                except (json_mod.JSONDecodeError, TypeError):
                    ex_data = {}
                if ex_data.get("deviceSerial") == serial:
                    continue

            record = HearingTest(
                party_id=party_id,
                tenant_id=tenant_id,
                test_date=fit_date,
                test_type="fitting",
                conducted_by="Noah Import",
                results=json_mod.dumps(fitting_data),
            )
            db.add(record)
            saved += 1

        return saved

    @staticmethod
    def _normalize_gender(gender: Optional[str]) -> Optional[str]:
        """Convert gender from Noah format to Party format (single char)."""
        if not gender:
            return None
        g = gender.lower().strip()
        if g in ("male", "m", "erkek"):
            return "M"
        if g in ("female", "f", "kadın", "kadin"):
            return "F"
        return None

    @staticmethod
    def _parse_dob(dob: Optional[str]) -> Optional[datetime]:
        """Convert DOB string to datetime for Party.birth_date."""
        if not dob:
            return None
        try:
            return datetime.fromisoformat(dob.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None

    @staticmethod
    def _build_noah_custom(patient) -> dict:
        """Build custom_data dict with Noah-specific info."""
        data = {"noah_import": True}
        ext = patient.external_ids
        if ext and ext.noah_patient_id:
            data["noah_patient_id"] = ext.noah_patient_id
        if patient.physician:
            data["physician"] = patient.physician
        if patient.insurance:
            data["insurance"] = patient.insurance
        if patient.patient_no:
            data["noah_patient_no"] = patient.patient_no
        return data

    @staticmethod
    def _create_party_from_noah(tenant_id: str, patient) -> "Party":
        """Create a new Party from Noah patient data with correct field mapping."""
        from core.models.party import Party
        import json as json_mod

        tc_number = None
        ext = patient.external_ids
        if ext and ext.national_id:
            nid = ext.national_id.strip()
            if len(nid) == 11 and nid.isdigit():
                tc_number = nid

        new_party = Party(
            tenant_id=tenant_id,
            first_name=patient.first_name or "",
            last_name=patient.last_name or "",
            phone=patient.phone or "",
            email=patient.email,
            tc_number=tc_number,
            birth_date=NoahImportService._parse_dob(patient.dob),
            gender=NoahImportService._normalize_gender(patient.gender),
            address_city=patient.city,
            address_full=patient.address,
            acquisition_type="noah_import",
            custom_data=json_mod.dumps(NoahImportService._build_noah_custom(patient)),
        )
        return new_party

    @staticmethod
    def _update_party_from_noah(party: "Party", patient) -> None:
        """Update existing Party with new data from Noah (non-destructive)."""
        import json as json_mod

        # Only fill empty fields — don't overwrite user edits
        if not party.email and patient.email:
            party.email = patient.email
        if not party.birth_date and patient.dob:
            party.birth_date = NoahImportService._parse_dob(patient.dob)
        if not party.gender and patient.gender:
            party.gender = NoahImportService._normalize_gender(patient.gender)
        if not party.address_city and patient.city:
            party.address_city = patient.city
        if not party.address_full and patient.address:
            party.address_full = patient.address

        # TC Kimlik: fill if empty and valid
        ext = patient.external_ids
        if not party.tc_number and ext and ext.national_id:
            nid = ext.national_id.strip()
            if len(nid) == 11 and nid.isdigit():
                party.tc_number = nid

        # Merge Noah metadata into custom_data
        existing_custom = {}
        if party.custom_data:
            try:
                existing_custom = json_mod.loads(party.custom_data)
            except (json_mod.JSONDecodeError, TypeError):
                existing_custom = {}
        noah_custom = NoahImportService._build_noah_custom(patient)
        existing_custom.update(noah_custom)
        party.custom_data = json_mod.dumps(existing_custom)

    @staticmethod
    def _find_match(
        db: Session, tenant_id: str, patient: NoahPatient
    ) -> Tuple[str, Optional["Party"]]:
        """Deterministic matching: tc_number > phone > name+dob.
        Returns (match_type, existing_party_or_none)."""
        from core.models.party import Party

        ext = patient.external_ids

        # 1) TC Kimlik (strongest — 11-digit national ID)
        if ext and ext.national_id:
            nid = ext.national_id.strip()
            if len(nid) == 11 and nid.isdigit():
                hit = (
                    db.query(Party)
                    .filter(Party.tc_number == nid)
                    .first()
                )
                if hit:
                    return "exact", hit

        # 2) Phone (exact match)
        if patient.phone:
            hit = (
                db.query(Party)
                .filter(Party.phone == patient.phone)
                .first()
            )
            if hit:
                return "exact", hit

        # 3) Name + DOB (ambiguous — needs manual review)
        if patient.first_name and patient.last_name and patient.dob:
            hit = (
                db.query(Party)
                .filter(
                    and_(
                        Party.first_name == patient.first_name,
                        Party.last_name == patient.last_name,
                    )
                )
                .first()
            )
            if hit:
                return "ambiguous", hit

        return "none", None

    # ── Agent Device Management ─────────────────────────────
    @staticmethod
    def generate_enrollment_token(
        db: Session, tenant_id: str, branch_id: Optional[str] = None
    ) -> Tuple[str, datetime]:
        """Generate a one-time enrollment token for the CRM settings page."""
        token = secrets.token_urlsafe(32)
        expires = datetime.now(timezone.utc) + timedelta(
            hours=ENROLLMENT_TOKEN_EXPIRY_HOURS
        )
        # Store hash in a lightweight row (reuse AgentDevice with status=inactive)
        device = AgentDevice(
            tenant_id=tenant_id,
            branch_id=branch_id,
            device_fingerprint=f"pending_{token[:8]}",
            enrollment_token_hash=_hash_token(token),
            status=AgentDeviceStatus.INACTIVE,
            token_expires_at=expires,
        )
        db.add(device)
        db.commit()
        return token, expires

    @staticmethod
    def enroll_device(
        db: Session,
        enrollment_token: str,
        device_fingerprint: str,
        device_name: Optional[str] = None,
    ) -> Tuple[AgentDevice, str]:
        """Validate enrollment token and activate device."""
        from core.database import unbound_session

        token_hash = _hash_token(enrollment_token)

        with unbound_session(reason="noah-agent-enrollment-lookup"):
            pending = (
                db.query(AgentDevice)
                .filter(
                    AgentDevice.enrollment_token_hash == token_hash,
                    AgentDevice.status == AgentDeviceStatus.INACTIVE,
                )
                .first()
            )

        if not pending:
            raise ValueError("Invalid or expired enrollment token")
        if pending.token_expires_at:
            expires = pending.token_expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < datetime.now(timezone.utc):
                raise ValueError("Enrollment token has expired")

        # Activate
        device_token = secrets.token_urlsafe(48)
        pending.device_fingerprint = device_fingerprint
        pending.device_name = device_name
        pending.device_token_hash = _hash_token(device_token)
        pending.token_expires_at = datetime.now(timezone.utc) + timedelta(
            days=DEVICE_TOKEN_EXPIRY_DAYS
        )
        pending.enrollment_token_hash = None  # Consumed
        pending.status = AgentDeviceStatus.ACTIVE
        pending.last_seen_at = datetime.now(timezone.utc)
        db.commit()

        return pending, device_token

    @staticmethod
    def authenticate_device(db: Session, device_token: str) -> Optional[AgentDevice]:
        """Validate device token and return device if valid."""
        from core.database import unbound_session

        token_hash = _hash_token(device_token)
        with unbound_session(reason="noah-agent-token-auth"):
            device = (
                db.query(AgentDevice)
                .filter(
                    AgentDevice.device_token_hash == token_hash,
                    AgentDevice.status == AgentDeviceStatus.ACTIVE,
                )
                .first()
            )
        if device and device.token_expires_at:
            expires = device.token_expires_at
            if expires.tzinfo is None:
                expires = expires.replace(tzinfo=timezone.utc)
            if expires < datetime.now(timezone.utc):
                return None
        return device

    @staticmethod
    def heartbeat(
        db: Session,
        device_id: str,
        agent_version: Optional[str] = None,
        ip_address: Optional[str] = None,
    ) -> AgentDevice:
        device = (
            db.query(AgentDevice).filter(AgentDevice.id == device_id).first()
        )
        if not device:
            raise ValueError("Device not found")
        device.last_seen_at = datetime.now(timezone.utc)
        if agent_version:
            device.agent_version = agent_version
        if ip_address:
            device.last_heartbeat_ip = ip_address
        db.commit()
        return device

    @staticmethod
    def get_agent_status(db: Session, tenant_id: str) -> List[AgentDevice]:
        return (
            db.query(AgentDevice)
            .filter(AgentDevice.status == AgentDeviceStatus.ACTIVE)
            .all()
        )

    # ── Duplicate Management ────────────────────────────────
    @staticmethod
    def list_duplicates(
        db: Session,
        tenant_id: str,
        status: Optional[str] = None,
        session_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PossibleDuplicate], int]:
        q = db.query(PossibleDuplicate)
        if status:
            q = q.filter(PossibleDuplicate.status == status)
        if session_id:
            q = q.filter(PossibleDuplicate.session_id == session_id)
        total = q.count()
        items = (
            q.order_by(PossibleDuplicate.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total

    @staticmethod
    def resolve_duplicate(
        db: Session,
        tenant_id: str,
        duplicate_id: str,
        action: str,
        user_id: str,
        target_party_id: Optional[str] = None,
    ) -> PossibleDuplicate:
        dup = (
            db.query(PossibleDuplicate)
            .filter(PossibleDuplicate.id == duplicate_id)
            .first()
        )
        if not dup:
            raise ValueError("Duplicate record not found")

        if action == "merge" and target_party_id:
            dup.status = DuplicateStatus.MERGED
            dup.existing_party_id = target_party_id
        elif action == "dismiss":
            dup.status = DuplicateStatus.DISMISSED
        else:
            raise ValueError("Invalid action. Use 'merge' or 'dismiss'.")

        dup.resolved_by = user_id
        dup.resolved_at = datetime.now(timezone.utc)
        db.commit()
        return dup

    # ── Audit Trail ─────────────────────────────────────────
    @staticmethod
    def _audit(
        db: Session,
        tenant_id: str,
        session_id: str,
        action: str,
        detail: Optional[dict] = None,
        user_id: Optional[str] = None,
        device_id: Optional[str] = None,
        file_sha256: Optional[str] = None,
        parser_version: Optional[str] = None,
        records_created: int = 0,
        records_updated: int = 0,
        outcome: Optional[str] = None,
    ):
        log = ImportAuditLog(
            tenant_id=tenant_id,
            session_id=session_id,
            user_id=user_id,
            device_id=device_id,
            action=action,
            detail=detail or {},
            file_sha256=file_sha256,
            parser_version=parser_version,
            records_created=records_created,
            records_updated=records_updated,
            outcome=outcome,
        )
        db.add(log)

    @staticmethod
    def get_audit_logs(
        db: Session,
        tenant_id: str,
        session_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ImportAuditLog], int]:
        q = db.query(ImportAuditLog)
        if session_id:
            q = q.filter(ImportAuditLog.session_id == session_id)
        total = q.count()
        items = (
            q.order_by(ImportAuditLog.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        return items, total
