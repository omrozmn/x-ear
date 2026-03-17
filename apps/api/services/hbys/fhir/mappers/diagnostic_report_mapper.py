"""
DiagnosticReport Mapper
=======================
LabOrder / ImagingOrder (X-EAR) <-> FHIR R4 DiagnosticReport resource.
"""
from __future__ import annotations

from typing import Any


class DiagnosticReportMapper:
    """Bidirectional mapper: LabOrder/ImagingOrder dict <-> FHIR DiagnosticReport."""

    # X-EAR status -> FHIR DiagnosticReport.status
    _STATUS_TO_FHIR = {
        "ordered": "registered",
        "collected": "registered",
        "scheduled": "registered",
        "in_progress": "preliminary",
        "completed": "final",
        "reported": "final",
        "verified": "final",
        "cancelled": "cancelled",
    }
    _STATUS_FROM_FHIR = {
        "registered": "ordered",
        "partial": "in_progress",
        "preliminary": "in_progress",
        "final": "completed",
        "amended": "completed",
        "corrected": "completed",
        "appended": "completed",
        "cancelled": "cancelled",
        "entered-in-error": "cancelled",
        "unknown": "ordered",
    }

    # ------------------------------------------------------------------ #
    # Lab Order -> FHIR DiagnosticReport
    # ------------------------------------------------------------------ #
    @classmethod
    def lab_order_to_fhir(cls, order: dict, tests: list[dict] | None = None) -> dict:
        """Convert an X-EAR LabOrder dict (with optional tests) to FHIR DiagnosticReport."""
        status_raw = order.get("status", "ordered")

        resource: dict[str, Any] = {
            "resourceType": "DiagnosticReport",
            "id": order.get("id"),
            "meta": {
                "profile": [
                    "http://hl7.org/fhir/StructureDefinition/DiagnosticReport"
                ],
            },
            "status": cls._STATUS_TO_FHIR.get(status_raw, "unknown"),
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
                            "code": "LAB",
                            "display": "Laboratory",
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "11502-2",
                        "display": "Laboratory report",
                    }
                ],
                "text": "Laboratory Report",
            },
        }

        # Subject
        patient_id = order.get("patientId") or order.get("patient_id")
        if patient_id:
            resource["subject"] = {"reference": f"Patient/{patient_id}"}

        # Encounter
        encounter_id = order.get("encounterId") or order.get("encounter_id")
        if encounter_id:
            resource["encounter"] = {"reference": f"Encounter/{encounter_id}"}

        # Effective (order date)
        order_date = order.get("orderDate") or order.get("order_date")
        if order_date:
            resource["effectiveDateTime"] = cls._to_str(order_date)

        # Issued (collection date or order date)
        collection_date = order.get("collectionDate") or order.get("collection_date")
        issued = collection_date or order_date
        if issued:
            resource["issued"] = cls._to_str(issued)

        # Performer (ordered_by)
        ordered_by = order.get("orderedBy") or order.get("ordered_by")
        if ordered_by:
            resource["performer"] = [{"reference": f"Practitioner/{ordered_by}"}]

        # Specimen
        specimen_type = order.get("specimenType") or order.get("specimen_type")
        if specimen_type:
            resource["specimen"] = [
                {
                    "display": specimen_type,
                    "type": {"text": specimen_type},
                }
            ]

        # Barcode as identifier
        barcode = order.get("barcode")
        if barcode:
            resource["identifier"] = [
                {
                    "use": "usual",
                    "system": "urn:x-ear:lab:barcode",
                    "value": barcode,
                }
            ]

        # Results (references to Observation resources built from LabTests)
        if tests:
            resource["result"] = [
                {"reference": f"Observation/{t.get('id')}"} for t in tests if t.get("id")
            ]

        # Clinical info
        clinical_info = order.get("clinicalInfo") or order.get("clinical_info")
        if clinical_info:
            resource["conclusion"] = clinical_info

        return resource

    # ------------------------------------------------------------------ #
    # Imaging Order -> FHIR DiagnosticReport
    # ------------------------------------------------------------------ #
    @classmethod
    def imaging_order_to_fhir(cls, order: dict) -> dict:
        """Convert an X-EAR ImagingOrder dict to FHIR DiagnosticReport."""
        status_raw = order.get("status", "ordered")

        resource: dict[str, Any] = {
            "resourceType": "DiagnosticReport",
            "id": order.get("id"),
            "meta": {
                "profile": [
                    "http://hl7.org/fhir/StructureDefinition/DiagnosticReport"
                ],
            },
            "status": cls._STATUS_TO_FHIR.get(status_raw, "unknown"),
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
                            "code": "RAD",
                            "display": "Radiology",
                        }
                    ]
                }
            ],
            "code": {
                "text": f"{order.get('modality', 'Imaging')} - {order.get('bodyPart') or order.get('body_part') or 'Unspecified'}",
            },
        }

        # Subject
        patient_id = order.get("patientId") or order.get("patient_id")
        if patient_id:
            resource["subject"] = {"reference": f"Patient/{patient_id}"}

        # Encounter
        encounter_id = order.get("encounterId") or order.get("encounter_id")
        if encounter_id:
            resource["encounter"] = {"reference": f"Encounter/{encounter_id}"}

        # Effective (performed date)
        performed = order.get("performedDate") or order.get("performed_date")
        if performed:
            resource["effectiveDateTime"] = cls._to_str(performed)

        # Performer
        performed_by = order.get("performedBy") or order.get("performed_by")
        if performed_by:
            resource["performer"] = [{"reference": f"Practitioner/{performed_by}"}]

        # Accession number
        accession = order.get("accessionNumber") or order.get("accession_number")
        if accession:
            resource["identifier"] = [
                {
                    "use": "official",
                    "type": {
                        "coding": [
                            {
                                "system": "http://terminology.hl7.org/CodeSystem/v2-0203",
                                "code": "ACSN",
                                "display": "Accession ID",
                            }
                        ]
                    },
                    "value": accession,
                }
            ]

        # DICOM references as imagingStudy
        dicom_uid = order.get("dicomStudyUid") or order.get("dicom_study_uid")
        if dicom_uid:
            resource["imagingStudy"] = [
                {
                    "display": f"DICOM Study {dicom_uid}",
                    "identifier": {"system": "urn:dicom:uid", "value": dicom_uid},
                }
            ]

        # Clinical indication
        indication = order.get("clinicalIndication") or order.get("clinical_indication")
        if indication:
            resource["conclusion"] = indication

        return resource

    # ------------------------------------------------------------------ #
    # Unified to_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def to_fhir(cls, data: dict, category: str = "LAB", tests: list[dict] | None = None) -> dict:
        """Dispatch to the appropriate conversion."""
        if category == "RAD":
            return cls.imaging_order_to_fhir(data)
        return cls.lab_order_to_fhir(data, tests)

    # ------------------------------------------------------------------ #
    # from_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def from_fhir(cls, fhir: dict) -> dict:
        """Convert a FHIR DiagnosticReport to X-EAR-compatible dict."""
        result: dict[str, Any] = {"id": fhir.get("id")}

        # Status
        result["status"] = cls._STATUS_FROM_FHIR.get(fhir.get("status", ""), "ordered")

        # Determine category (LAB or RAD)
        categories = fhir.get("category") or []
        cat_code = "LAB"
        for cat in categories:
            for coding in cat.get("coding") or []:
                cat_code = coding.get("code", "LAB")
                break
        result["_category"] = cat_code

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

        # Effective date
        if fhir.get("effectiveDateTime"):
            result["order_date"] = fhir["effectiveDateTime"]

        # Performer
        performers = fhir.get("performer") or []
        if performers:
            perf_ref = performers[0].get("reference", "")
            if perf_ref.startswith("Practitioner/"):
                result["ordered_by"] = perf_ref.split("/", 1)[1]

        # Conclusion
        conclusion = fhir.get("conclusion")
        if conclusion:
            result["clinical_info"] = conclusion

        # Identifiers
        for ident in fhir.get("identifier") or []:
            sys = ident.get("system", "")
            if "barcode" in sys:
                result["barcode"] = ident.get("value")
            elif ident.get("type", {}).get("coding", [{}])[0].get("code") == "ACSN":
                result["accession_number"] = ident.get("value")

        return {k: v for k, v in result.items() if v is not None}

    # ------------------------------------------------------------------ #
    @staticmethod
    def _to_str(value: Any) -> str:
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return str(value)
