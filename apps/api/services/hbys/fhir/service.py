"""
FHIR Gateway Service
====================
Business logic for FHIR resource operations.
Reads internal X-EAR models via SQLAlchemy and returns FHIR R4 resources.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from .config import fhir_config
from .mappers import (
    PatientMapper,
    EncounterMapper,
    ObservationMapper,
    MedicationRequestMapper,
    ConditionMapper,
    DiagnosticReportMapper,
    AllergyIntoleranceMapper,
)


class FHIRService:
    """Orchestrates FHIR resource retrieval and mapping."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ================================================================== #
    # Bundle helper
    # ================================================================== #
    @staticmethod
    def _make_bundle(
        entries: list[dict],
        total: int | None = None,
        bundle_type: str = "searchset",
    ) -> dict:
        """Wrap a list of FHIR resources in a FHIR Bundle."""
        return {
            "resourceType": "Bundle",
            "id": str(uuid4()),
            "meta": {"lastUpdated": datetime.utcnow().isoformat() + "Z"},
            "type": bundle_type,
            "total": total if total is not None else len(entries),
            "entry": [
                {
                    "fullUrl": f"urn:uuid:{e.get('id', uuid4())}",
                    "resource": e,
                }
                for e in entries
            ],
        }

    @staticmethod
    def _make_operation_outcome(
        severity: str = "error",
        code: str = "not-found",
        diagnostics: str = "Resource not found",
    ) -> dict:
        """Build a FHIR OperationOutcome resource."""
        return {
            "resourceType": "OperationOutcome",
            "issue": [
                {
                    "severity": severity,
                    "code": code,
                    "diagnostics": diagnostics,
                }
            ],
        }

    # ================================================================== #
    # CapabilityStatement
    # ================================================================== #
    def get_capability_statement(self) -> dict:
        """Return the server CapabilityStatement (FHIR metadata endpoint)."""
        resources = []
        for res_type in fhir_config.SUPPORTED_RESOURCES:
            search_params = self._search_params_for(res_type)
            res_entry: dict[str, Any] = {
                "type": res_type,
                "profile": f"http://hl7.org/fhir/StructureDefinition/{res_type}",
                "interaction": [
                    {"code": "read"},
                    {"code": "search-type"},
                ],
                "versioning": "no-version",
                "readHistory": False,
                "updateCreate": False,
                "searchParam": search_params,
            }
            resources.append(res_entry)

        return {
            "resourceType": "CapabilityStatement",
            "id": "x-ear-fhir-gateway",
            "status": "active",
            "date": datetime.utcnow().isoformat() + "Z",
            "publisher": fhir_config.FHIR_PUBLISHER,
            "kind": "instance",
            "software": {
                "name": fhir_config.FHIR_SERVER_NAME,
                "version": "1.0.0",
            },
            "implementation": {
                "description": fhir_config.FHIR_SERVER_NAME,
                "url": fhir_config.FHIR_BASE_URL,
            },
            "fhirVersion": fhir_config.FHIR_VERSION,
            "format": ["json"],
            "rest": [
                {
                    "mode": "server",
                    "resource": resources,
                }
            ],
        }

    @staticmethod
    def _search_params_for(resource_type: str) -> list[dict]:
        """Return search parameter definitions for a given resource type."""
        common = [
            {"name": "_id", "type": "token", "documentation": "Logical id of the resource"},
        ]
        specific: dict[str, list[dict]] = {
            "Patient": [
                {"name": "name", "type": "string"},
                {"name": "identifier", "type": "token"},
            ],
            "Encounter": [
                {"name": "patient", "type": "reference"},
                {"name": "date", "type": "date"},
                {"name": "status", "type": "token"},
            ],
            "Observation": [
                {"name": "patient", "type": "reference"},
                {"name": "category", "type": "token"},
                {"name": "code", "type": "token"},
                {"name": "date", "type": "date"},
                {"name": "status", "type": "token"},
            ],
            "Condition": [
                {"name": "patient", "type": "reference"},
                {"name": "code", "type": "token"},
                {"name": "category", "type": "token"},
                {"name": "clinical-status", "type": "token"},
            ],
            "MedicationRequest": [
                {"name": "patient", "type": "reference"},
                {"name": "status", "type": "token"},
                {"name": "date", "type": "date"},
            ],
            "DiagnosticReport": [
                {"name": "patient", "type": "reference"},
                {"name": "category", "type": "token"},
                {"name": "code", "type": "token"},
                {"name": "date", "type": "date"},
                {"name": "status", "type": "token"},
            ],
            "AllergyIntolerance": [
                {"name": "patient", "type": "reference"},
                {"name": "category", "type": "token"},
                {"name": "clinical-status", "type": "token"},
            ],
        }
        return common + specific.get(resource_type, [])

    # ================================================================== #
    # Patient
    # ================================================================== #
    async def search_patients(self, params: dict[str, str]) -> dict:
        """Search Patient resources."""
        from core.models.party import Party

        query = select(Party)
        filters = []

        if params.get("_id"):
            filters.append(Party.id == params["_id"])
        if params.get("identifier"):
            ident = params["identifier"]
            filters.append(
                or_(Party.tc_number == ident, Party.identity_number == ident)
            )
        if params.get("name"):
            name = f"%{params['name']}%"
            filters.append(
                or_(Party.first_name.ilike(name), Party.last_name.ilike(name))
            )

        if filters:
            query = query.where(and_(*filters))

        query = query.limit(fhir_config.DEFAULT_PAGE_SIZE)
        result = await self.db.execute(query)
        parties = result.scalars().all()

        entries = [PatientMapper.to_fhir(p.to_dict()) for p in parties]
        return self._make_bundle(entries)

    async def read_patient(self, patient_id: str) -> dict | None:
        """Read a single Patient by ID."""
        from core.models.party import Party

        result = await self.db.execute(select(Party).where(Party.id == patient_id))
        party = result.scalar_one_or_none()
        if not party:
            return None
        return PatientMapper.to_fhir(party.to_dict())

    # ================================================================== #
    # Encounter
    # ================================================================== #
    async def search_encounters(self, params: dict[str, str]) -> dict:
        """Search Encounter resources."""
        from services.hbys.clinical.models.encounter import Encounter

        query = select(Encounter)
        filters = []

        if params.get("_id"):
            filters.append(Encounter.id == params["_id"])
        if params.get("patient"):
            filters.append(Encounter.patient_id == params["patient"])
        if params.get("status"):
            fhir_status = params["status"]
            status_map = EncounterMapper._STATUS_FROM_FHIR
            internal = status_map.get(fhir_status, fhir_status)
            filters.append(Encounter.status == internal)
        if params.get("date"):
            try:
                dt = datetime.fromisoformat(params["date"])
                filters.append(Encounter.encounter_date >= dt)
            except ValueError:
                pass

        if filters:
            query = query.where(and_(*filters))

        query = query.limit(fhir_config.DEFAULT_PAGE_SIZE)
        result = await self.db.execute(query)
        encounters = result.scalars().all()

        entries = [EncounterMapper.to_fhir(e.to_dict()) for e in encounters]
        return self._make_bundle(entries)

    async def read_encounter(self, encounter_id: str) -> dict | None:
        """Read a single Encounter by ID."""
        from services.hbys.clinical.models.encounter import Encounter

        result = await self.db.execute(
            select(Encounter).where(Encounter.id == encounter_id)
        )
        enc = result.scalar_one_or_none()
        if not enc:
            return None
        return EncounterMapper.to_fhir(enc.to_dict())

    # ================================================================== #
    # Observation
    # ================================================================== #
    async def search_observations(self, params: dict[str, str]) -> dict:
        """Search Observation resources (vital signs + lab results)."""
        entries: list[dict] = []
        category = params.get("category", "")

        # Vital signs
        if not category or category == "vital-signs":
            from services.hbys.clinical.models.vital_signs import VitalSigns

            query = select(VitalSigns)
            filters = []
            if params.get("_id"):
                filters.append(VitalSigns.id == params["_id"])
            if params.get("patient"):
                filters.append(VitalSigns.patient_id == params["patient"])
            if params.get("date"):
                try:
                    dt = datetime.fromisoformat(params["date"])
                    filters.append(VitalSigns.recorded_at >= dt)
                except ValueError:
                    pass
            if filters:
                query = query.where(and_(*filters))
            query = query.limit(fhir_config.DEFAULT_PAGE_SIZE)
            result = await self.db.execute(query)
            for vs in result.scalars().all():
                entries.append(
                    ObservationMapper.to_fhir(vs.to_dict(), category="vital-signs")
                )

        # Laboratory
        if not category or category == "laboratory":
            from services.hbys.laboratory.models.lab_test import LabTest

            query = select(LabTest)
            filters = []
            if params.get("_id"):
                filters.append(LabTest.id == params["_id"])
            if params.get("code"):
                filters.append(LabTest.loinc_code == params["code"])
            if params.get("status"):
                status_map = ObservationMapper._STATUS_FROM_FHIR
                internal = status_map.get(params["status"], params["status"])
                filters.append(LabTest.status == internal)
            if params.get("date"):
                try:
                    dt = datetime.fromisoformat(params["date"])
                    filters.append(LabTest.result_date >= dt)
                except ValueError:
                    pass
            if filters:
                query = query.where(and_(*filters))
            query = query.limit(fhir_config.DEFAULT_PAGE_SIZE)
            result = await self.db.execute(query)
            for lt in result.scalars().all():
                entries.append(
                    ObservationMapper.to_fhir(lt.to_dict(), category="laboratory")
                )

        return self._make_bundle(entries)

    async def read_observation(self, observation_id: str) -> dict | None:
        """Read a single Observation by ID (try vital signs first, then lab)."""
        from services.hbys.clinical.models.vital_signs import VitalSigns
        from services.hbys.laboratory.models.lab_test import LabTest

        # Try vital signs
        result = await self.db.execute(
            select(VitalSigns).where(VitalSigns.id == observation_id)
        )
        vs = result.scalar_one_or_none()
        if vs:
            return ObservationMapper.to_fhir(vs.to_dict(), category="vital-signs")

        # Try lab test
        result = await self.db.execute(
            select(LabTest).where(LabTest.id == observation_id)
        )
        lt = result.scalar_one_or_none()
        if lt:
            return ObservationMapper.to_fhir(lt.to_dict(), category="laboratory")

        return None

    # ================================================================== #
    # Condition
    # ================================================================== #
    async def search_conditions(self, params: dict[str, str]) -> dict:
        """Search Condition resources."""
        from services.hbys.diagnosis.models.diagnosis import Diagnosis

        query = select(Diagnosis)
        filters = []

        if params.get("_id"):
            filters.append(Diagnosis.id == params["_id"])
        if params.get("patient"):
            filters.append(Diagnosis.patient_id == params["patient"])
        if params.get("code"):
            filters.append(Diagnosis.icd_code == params["code"])
        if params.get("category"):
            cat = params["category"]
            if cat == "encounter-diagnosis":
                filters.append(
                    Diagnosis.diagnosis_type.in_(["primary", "secondary"])
                )
            elif cat == "problem-list-item":
                filters.append(Diagnosis.diagnosis_type == "differential")

        if filters:
            query = query.where(and_(*filters))

        query = query.limit(fhir_config.DEFAULT_PAGE_SIZE)
        result = await self.db.execute(query)
        diagnoses = result.scalars().all()

        entries = [ConditionMapper.to_fhir(d.to_dict()) for d in diagnoses]
        return self._make_bundle(entries)

    async def read_condition(self, condition_id: str) -> dict | None:
        """Read a single Condition by ID."""
        from services.hbys.diagnosis.models.diagnosis import Diagnosis

        result = await self.db.execute(
            select(Diagnosis).where(Diagnosis.id == condition_id)
        )
        diag = result.scalar_one_or_none()
        if not diag:
            return None
        return ConditionMapper.to_fhir(diag.to_dict())

    # ================================================================== #
    # MedicationRequest
    # ================================================================== #
    async def search_medication_requests(self, params: dict[str, str]) -> dict:
        """Search MedicationRequest resources."""
        from services.hbys.prescription.models.prescription import Prescription

        query = select(Prescription)
        filters = []

        if params.get("_id"):
            filters.append(Prescription.id == params["_id"])
        if params.get("patient"):
            filters.append(Prescription.patient_id == params["patient"])
        if params.get("status"):
            status_map = MedicationRequestMapper._STATUS_FROM_FHIR
            internal = status_map.get(params["status"], params["status"])
            filters.append(Prescription.status == internal)
        if params.get("date"):
            try:
                dt = datetime.fromisoformat(params["date"])
                filters.append(Prescription.prescribed_at >= dt)
            except ValueError:
                pass

        if filters:
            query = query.where(and_(*filters))

        query = query.limit(fhir_config.DEFAULT_PAGE_SIZE)
        result = await self.db.execute(query)
        prescriptions = result.scalars().all()

        entries = [MedicationRequestMapper.to_fhir(p.to_dict()) for p in prescriptions]
        return self._make_bundle(entries)

    async def read_medication_request(self, request_id: str) -> dict | None:
        """Read a single MedicationRequest by ID."""
        from services.hbys.prescription.models.prescription import Prescription

        result = await self.db.execute(
            select(Prescription).where(Prescription.id == request_id)
        )
        prx = result.scalar_one_or_none()
        if not prx:
            return None
        return MedicationRequestMapper.to_fhir(prx.to_dict())

    # ================================================================== #
    # DiagnosticReport
    # ================================================================== #
    async def search_diagnostic_reports(self, params: dict[str, str]) -> dict:
        """Search DiagnosticReport resources (lab orders + imaging orders)."""
        entries: list[dict] = []
        category = params.get("category", "")

        # Laboratory reports
        if not category or category == "LAB":
            from services.hbys.laboratory.models.lab_order import LabOrder

            query = select(LabOrder)
            filters = []
            if params.get("_id"):
                filters.append(LabOrder.id == params["_id"])
            if params.get("patient"):
                filters.append(LabOrder.patient_id == params["patient"])
            if params.get("status"):
                status_map = DiagnosticReportMapper._STATUS_FROM_FHIR
                internal = status_map.get(params["status"], params["status"])
                filters.append(LabOrder.status == internal)
            if params.get("date"):
                try:
                    dt = datetime.fromisoformat(params["date"])
                    filters.append(LabOrder.order_date >= dt)
                except ValueError:
                    pass
            if filters:
                query = query.where(and_(*filters))
            query = query.limit(fhir_config.DEFAULT_PAGE_SIZE)
            result = await self.db.execute(query)
            for order in result.scalars().all():
                entries.append(
                    DiagnosticReportMapper.to_fhir(order.to_dict(), category="LAB")
                )

        # Imaging reports
        if not category or category == "RAD":
            from services.hbys.imaging.models.imaging_order import ImagingOrder

            query = select(ImagingOrder)
            filters = []
            if params.get("_id"):
                filters.append(ImagingOrder.id == params["_id"])
            if params.get("patient"):
                filters.append(ImagingOrder.patient_id == params["patient"])
            if params.get("status"):
                status_map = DiagnosticReportMapper._STATUS_FROM_FHIR
                internal = status_map.get(params["status"], params["status"])
                filters.append(ImagingOrder.status == internal)
            if params.get("date"):
                try:
                    dt = datetime.fromisoformat(params["date"])
                    filters.append(ImagingOrder.performed_date >= dt)
                except ValueError:
                    pass
            if filters:
                query = query.where(and_(*filters))
            query = query.limit(fhir_config.DEFAULT_PAGE_SIZE)
            result = await self.db.execute(query)
            for order in result.scalars().all():
                entries.append(
                    DiagnosticReportMapper.to_fhir(order.to_dict(), category="RAD")
                )

        return self._make_bundle(entries)

    async def read_diagnostic_report(self, report_id: str) -> dict | None:
        """Read a single DiagnosticReport by ID."""
        from services.hbys.laboratory.models.lab_order import LabOrder
        from services.hbys.imaging.models.imaging_order import ImagingOrder

        # Try lab order first
        result = await self.db.execute(
            select(LabOrder).where(LabOrder.id == report_id)
        )
        order = result.scalar_one_or_none()
        if order:
            return DiagnosticReportMapper.to_fhir(order.to_dict(), category="LAB")

        # Try imaging order
        result = await self.db.execute(
            select(ImagingOrder).where(ImagingOrder.id == report_id)
        )
        img = result.scalar_one_or_none()
        if img:
            return DiagnosticReportMapper.to_fhir(img.to_dict(), category="RAD")

        return None

    # ================================================================== #
    # AllergyIntolerance
    # ================================================================== #
    async def search_allergy_intolerances(self, params: dict[str, str]) -> dict:
        """Search AllergyIntolerance resources.

        Note: X-EAR currently stores allergies in Party.custom_data JSON.
        This is a placeholder that returns an empty bundle until a dedicated
        allergy table is created. The mapper is fully functional for when
        the model is available.
        """
        # Future: query from a dedicated allergy model
        # For now, return empty bundle
        return self._make_bundle([])

    async def read_allergy_intolerance(self, allergy_id: str) -> dict | None:
        """Read a single AllergyIntolerance by ID."""
        # Placeholder until allergy model is available
        return None
