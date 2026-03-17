"""
Condition Mapper
================
Diagnosis (X-EAR) <-> FHIR R4 Condition resource.
"""
from __future__ import annotations

from typing import Any


class ConditionMapper:
    """Bidirectional mapper: Diagnosis dict <-> FHIR Condition resource."""

    # X-EAR severity -> FHIR Condition.severity coding
    _SEVERITY_TO_FHIR = {
        "mild": {
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "code": "255604002",
                    "display": "Mild",
                }
            ],
            "text": "Mild",
        },
        "moderate": {
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "code": "6736007",
                    "display": "Moderate",
                }
            ],
            "text": "Moderate",
        },
        "severe": {
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "code": "24484000",
                    "display": "Severe",
                }
            ],
            "text": "Severe",
        },
        "critical": {
            "coding": [
                {
                    "system": "http://snomed.info/sct",
                    "code": "442452003",
                    "display": "Life threatening severity",
                }
            ],
            "text": "Critical",
        },
    }
    _SEVERITY_FROM_FHIR = {
        "255604002": "mild",
        "6736007": "moderate",
        "24484000": "severe",
        "442452003": "critical",
    }

    # X-EAR diagnosis_type -> FHIR Condition.category
    _TYPE_TO_FHIR = {
        "primary": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                    "code": "encounter-diagnosis",
                    "display": "Encounter Diagnosis",
                }
            ],
            "text": "Primary Diagnosis",
        },
        "secondary": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                    "code": "encounter-diagnosis",
                    "display": "Encounter Diagnosis",
                }
            ],
            "text": "Secondary Diagnosis",
        },
        "differential": {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-category",
                    "code": "problem-list-item",
                    "display": "Problem List Item",
                }
            ],
            "text": "Differential Diagnosis",
        },
    }

    # ------------------------------------------------------------------ #
    # to_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def to_fhir(cls, diag: dict) -> dict:
        """Convert an X-EAR Diagnosis dict to a FHIR R4 Condition resource."""
        resource: dict[str, Any] = {
            "resourceType": "Condition",
            "id": diag.get("id"),
            "meta": {
                "profile": ["http://hl7.org/fhir/StructureDefinition/Condition"],
            },
        }

        # Clinical status
        resolved = diag.get("resolvedDate") or diag.get("resolved_date")
        is_chronic = diag.get("isChronic") or diag.get("is_chronic")
        if resolved:
            clinical_status_code = "resolved"
        elif is_chronic:
            clinical_status_code = "active"
        else:
            clinical_status_code = "active"
        resource["clinicalStatus"] = {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    "code": clinical_status_code,
                }
            ]
        }

        # Verification status
        resource["verificationStatus"] = {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                    "code": "confirmed",
                }
            ]
        }

        # Category (based on diagnosis_type)
        dtype = diag.get("diagnosisType") or diag.get("diagnosis_type") or "primary"
        cat = cls._TYPE_TO_FHIR.get(dtype, cls._TYPE_TO_FHIR["primary"])
        resource["category"] = [cat]

        # Severity
        severity = diag.get("severity")
        if severity and severity in cls._SEVERITY_TO_FHIR:
            resource["severity"] = cls._SEVERITY_TO_FHIR[severity]

        # Code (ICD-10)
        icd_code = diag.get("icdCode") or diag.get("icd_code")
        icd_version = diag.get("icdVersion") or diag.get("icd_version") or "10"
        name_en = diag.get("diagnosisNameEn") or diag.get("diagnosis_name_en") or ""
        name_tr = diag.get("diagnosisNameTr") or diag.get("diagnosis_name_tr") or ""
        display = name_en or name_tr
        if icd_code:
            icd_system = (
                "http://hl7.org/fhir/sid/icd-10"
                if icd_version == "10"
                else f"http://hl7.org/fhir/sid/icd-{icd_version}"
            )
            code_entry: dict[str, Any] = {
                "coding": [
                    {
                        "system": icd_system,
                        "code": icd_code,
                        "display": display,
                    }
                ],
            }
            if name_tr:
                code_entry["text"] = name_tr
            resource["code"] = code_entry

        # Subject
        patient_id = diag.get("patientId") or diag.get("patient_id")
        if patient_id:
            resource["subject"] = {"reference": f"Patient/{patient_id}"}

        # Encounter
        encounter_id = diag.get("encounterId") or diag.get("encounter_id")
        if encounter_id:
            resource["encounter"] = {"reference": f"Encounter/{encounter_id}"}

        # Onset / abatement dates
        onset = diag.get("onsetDate") or diag.get("onset_date")
        if onset:
            resource["onsetDateTime"] = cls._to_str(onset)

        if resolved:
            resource["abatementDateTime"] = cls._to_str(resolved)

        # Recorder (diagnosed_by)
        diagnosed_by = diag.get("diagnosedBy") or diag.get("diagnosed_by")
        if diagnosed_by:
            resource["recorder"] = {"reference": f"Practitioner/{diagnosed_by}"}

        # Notes
        notes = diag.get("notes")
        if notes:
            resource["note"] = [{"text": notes}]

        return resource

    # ------------------------------------------------------------------ #
    # from_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def from_fhir(cls, fhir: dict) -> dict:
        """Convert a FHIR Condition to X-EAR Diagnosis-compatible dict."""
        result: dict[str, Any] = {"id": fhir.get("id")}

        # Code -> icd_code, names
        code = fhir.get("code") or {}
        codings = code.get("coding") or []
        for c in codings:
            sys = c.get("system", "")
            if "icd" in sys:
                result["icd_code"] = c.get("code")
                result["diagnosis_name_en"] = c.get("display")
                # Extract version from system URL
                if "icd-10" in sys:
                    result["icd_version"] = "10"
                break
        if code.get("text"):
            result["diagnosis_name_tr"] = code["text"]

        # Subject
        subject = fhir.get("subject") or {}
        ref = subject.get("reference", "")
        if ref.startswith("Patient/"):
            result["patient_id"] = ref.split("/", 1)[1]

        # Encounter
        encounter = fhir.get("encounter") or {}
        enc_ref = encounter.get("reference", "")
        if enc_ref.startswith("Encounter/"):
            result["encounter_id"] = enc_ref.split("/", 1)[1]

        # Severity
        severity = fhir.get("severity") or {}
        for sc in severity.get("coding") or []:
            mapped = cls._SEVERITY_FROM_FHIR.get(sc.get("code"))
            if mapped:
                result["severity"] = mapped
                break

        # Category -> diagnosis_type
        categories = fhir.get("category") or []
        for cat in categories:
            text = (cat.get("text") or "").lower()
            if "primary" in text:
                result["diagnosis_type"] = "primary"
            elif "secondary" in text:
                result["diagnosis_type"] = "secondary"
            elif "differential" in text:
                result["diagnosis_type"] = "differential"

        # Onset / abatement
        if fhir.get("onsetDateTime"):
            result["onset_date"] = fhir["onsetDateTime"][:10]
        if fhir.get("abatementDateTime"):
            result["resolved_date"] = fhir["abatementDateTime"][:10]

        # Clinical status -> is_chronic
        cs = fhir.get("clinicalStatus") or {}
        for csc in cs.get("coding") or []:
            if csc.get("code") == "resolved":
                result["is_chronic"] = False

        # Recorder
        recorder = fhir.get("recorder") or {}
        rec_ref = recorder.get("reference", "")
        if rec_ref.startswith("Practitioner/"):
            result["diagnosed_by"] = rec_ref.split("/", 1)[1]

        # Notes
        notes_list = fhir.get("note") or []
        if notes_list:
            result["notes"] = notes_list[0].get("text")

        return {k: v for k, v in result.items() if v is not None}

    # ------------------------------------------------------------------ #
    @staticmethod
    def _to_str(value: Any) -> str:
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return str(value)
