"""
Encounter Mapper
================
Encounter (X-EAR internal) <-> FHIR R4 Encounter resource.
"""
from __future__ import annotations

from typing import Any


class EncounterMapper:
    """Bidirectional mapper: X-EAR Encounter dict <-> FHIR Encounter resource."""

    # X-EAR encounter_type -> FHIR Encounter.class coding
    _CLASS_TO_FHIR = {
        "outpatient": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "AMB",
            "display": "ambulatory",
        },
        "inpatient": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "IMP",
            "display": "inpatient encounter",
        },
        "emergency": {
            "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            "code": "EMER",
            "display": "emergency",
        },
    }
    _CLASS_FROM_FHIR = {"AMB": "outpatient", "IMP": "inpatient", "EMER": "emergency"}

    # X-EAR status -> FHIR Encounter.status
    _STATUS_TO_FHIR = {
        "waiting": "planned",
        "in_progress": "in-progress",
        "completed": "finished",
        "cancelled": "cancelled",
    }
    _STATUS_FROM_FHIR = {v: k for k, v in _STATUS_TO_FHIR.items()}

    # ------------------------------------------------------------------ #
    # to_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def to_fhir(cls, enc: dict) -> dict:
        """Convert an X-EAR Encounter dict to a FHIR R4 Encounter resource."""
        enc_type = enc.get("encounterType") or enc.get("encounter_type") or "outpatient"
        status_raw = enc.get("status", "waiting")

        resource: dict[str, Any] = {
            "resourceType": "Encounter",
            "id": enc.get("id"),
            "meta": {
                "profile": ["http://hl7.org/fhir/StructureDefinition/Encounter"],
            },
            "status": cls._STATUS_TO_FHIR.get(status_raw, "unknown"),
            "class": cls._CLASS_TO_FHIR.get(
                enc_type,
                {
                    "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                    "code": "AMB",
                    "display": "ambulatory",
                },
            ),
        }

        # Subject (patient reference)
        patient_id = enc.get("patientId") or enc.get("patient_id")
        if patient_id:
            resource["subject"] = {"reference": f"Patient/{patient_id}"}

        # Participant (doctor)
        doctor_id = enc.get("doctorId") or enc.get("doctor_id")
        if doctor_id:
            resource["participant"] = [
                {
                    "type": [
                        {
                            "coding": [
                                {
                                    "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
                                    "code": "ATND",
                                    "display": "attender",
                                }
                            ]
                        }
                    ],
                    "individual": {"reference": f"Practitioner/{doctor_id}"},
                }
            ]

        # Period
        enc_date = enc.get("encounterDate") or enc.get("encounter_date")
        discharge_date = enc.get("dischargeDate") or enc.get("discharge_date")
        if enc_date or discharge_date:
            period: dict[str, str] = {}
            if enc_date:
                period["start"] = cls._to_fhir_datetime(enc_date)
            if discharge_date:
                period["end"] = cls._to_fhir_datetime(discharge_date)
            resource["period"] = period

        # Reason (chief complaint)
        complaint = enc.get("chiefComplaint") or enc.get("chief_complaint")
        if complaint:
            resource["reasonCode"] = [{"text": complaint}]

        # SOAP notes as contained text
        notes_parts = []
        for field, label in [
            ("subjective", "Subjective"),
            ("objective", "Objective"),
            ("assessment", "Assessment"),
            ("plan", "Plan"),
        ]:
            val = enc.get(field)
            if val:
                notes_parts.append(f"{label}: {val}")
        clinical = enc.get("clinicalNotes") or enc.get("clinical_notes")
        if clinical:
            notes_parts.append(f"Clinical Notes: {clinical}")
        if notes_parts:
            resource["text"] = {
                "status": "generated",
                "div": f'<div xmlns="http://www.w3.org/1999/xhtml">{"<br/>".join(notes_parts)}</div>',
            }

        return resource

    # ------------------------------------------------------------------ #
    # from_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def from_fhir(cls, fhir: dict) -> dict:
        """Convert a FHIR R4 Encounter resource to X-EAR Encounter-compatible dict."""
        result: dict[str, Any] = {"id": fhir.get("id")}

        # Status
        result["status"] = cls._STATUS_FROM_FHIR.get(fhir.get("status", ""), "waiting")

        # Class -> encounter_type
        enc_class = fhir.get("class") or {}
        result["encounter_type"] = cls._CLASS_FROM_FHIR.get(
            enc_class.get("code", ""), "outpatient"
        )

        # Subject -> patient_id
        subject = fhir.get("subject") or {}
        ref = subject.get("reference", "")
        if ref.startswith("Patient/"):
            result["patient_id"] = ref.split("/", 1)[1]

        # Participant -> doctor_id
        for participant in fhir.get("participant") or []:
            individual = participant.get("individual") or {}
            ind_ref = individual.get("reference", "")
            if ind_ref.startswith("Practitioner/"):
                result["doctor_id"] = ind_ref.split("/", 1)[1]
                break

        # Period
        period = fhir.get("period") or {}
        if period.get("start"):
            result["encounter_date"] = period["start"]
        if period.get("end"):
            result["discharge_date"] = period["end"]

        # Reason -> chief_complaint
        reasons = fhir.get("reasonCode") or []
        if reasons:
            result["chief_complaint"] = reasons[0].get("text")

        return {k: v for k, v in result.items() if v is not None}

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _to_fhir_datetime(value: Any) -> str:
        """Normalise a datetime value to a FHIR-compatible ISO string."""
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return str(value)
