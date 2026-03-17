"""
MedicationRequest Mapper
========================
Prescription (X-EAR) <-> FHIR R4 MedicationRequest resource.
"""
from __future__ import annotations

from typing import Any


class MedicationRequestMapper:
    """Bidirectional mapper: Prescription dict <-> FHIR MedicationRequest."""

    # X-EAR prescription status -> FHIR MedicationRequest.status
    _STATUS_TO_FHIR = {
        "draft": "draft",
        "sent": "active",
        "approved": "active",
        "rejected": "stopped",
        "cancelled": "cancelled",
    }
    _STATUS_FROM_FHIR = {
        "draft": "draft",
        "active": "approved",
        "on-hold": "draft",
        "cancelled": "cancelled",
        "completed": "approved",
        "stopped": "rejected",
        "entered-in-error": "cancelled",
        "unknown": "draft",
    }

    # Prescription type -> FHIR category coding
    _TYPE_TO_FHIR = {
        "normal": {"code": "outpatient", "display": "Outpatient"},
        "red": {"code": "inpatient", "display": "Inpatient"},
        "green": {"code": "community", "display": "Community"},
        "orange": {"code": "discharge", "display": "Discharge"},
        "purple": {"code": "outpatient", "display": "Outpatient (Controlled)"},
    }

    # ------------------------------------------------------------------ #
    # to_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def to_fhir(cls, prx: dict) -> dict:
        """Convert an X-EAR Prescription dict to a FHIR R4 MedicationRequest."""
        status_raw = prx.get("status", "draft")
        prx_type = prx.get("prescriptionType") or prx.get("prescription_type") or "normal"

        resource: dict[str, Any] = {
            "resourceType": "MedicationRequest",
            "id": prx.get("id"),
            "meta": {
                "profile": [
                    "http://hl7.org/fhir/StructureDefinition/MedicationRequest"
                ],
            },
            "status": cls._STATUS_TO_FHIR.get(status_raw, "unknown"),
            "intent": "order",
        }

        # Category (prescription type)
        cat_info = cls._TYPE_TO_FHIR.get(prx_type, cls._TYPE_TO_FHIR["normal"])
        resource["category"] = [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/medicationrequest-category",
                        "code": cat_info["code"],
                        "display": cat_info["display"],
                    }
                ]
            }
        ]

        # Subject (patient)
        patient_id = prx.get("patientId") or prx.get("patient_id")
        if patient_id:
            resource["subject"] = {"reference": f"Patient/{patient_id}"}

        # Encounter
        encounter_id = prx.get("encounterId") or prx.get("encounter_id")
        if encounter_id:
            resource["encounter"] = {"reference": f"Encounter/{encounter_id}"}

        # Requester (doctor)
        doctor_id = prx.get("doctorId") or prx.get("doctor_id")
        if doctor_id:
            resource["requester"] = {"reference": f"Practitioner/{doctor_id}"}

        # Authored on
        prescribed_at = prx.get("prescribedAt") or prx.get("prescribed_at")
        if prescribed_at:
            resource["authoredOn"] = cls._to_str(prescribed_at)

        # Reason (diagnosis codes)
        diag_codes = prx.get("diagnosisCodes") or prx.get("diagnosis_codes") or []
        if isinstance(diag_codes, list) and diag_codes:
            reason_codes = []
            for code in diag_codes:
                if isinstance(code, str):
                    reason_codes.append(
                        {
                            "coding": [
                                {
                                    "system": "http://hl7.org/fhir/sid/icd-10",
                                    "code": code,
                                }
                            ]
                        }
                    )
            if reason_codes:
                resource["reasonCode"] = reason_codes

        # MEDULA identifier
        medula_id = prx.get("medulaPrescriptionId") or prx.get("medula_prescription_id")
        if medula_id:
            resource["identifier"] = [
                {
                    "use": "official",
                    "system": "urn:tr:sgk:medula:prescription",
                    "value": medula_id,
                }
            ]

        # Protocol number as groupIdentifier
        protocol = prx.get("protocolNo") or prx.get("protocol_no")
        if protocol:
            resource["groupIdentifier"] = {
                "system": "urn:x-ear:protocol",
                "value": protocol,
            }

        # Notes
        notes = prx.get("notes")
        if notes:
            resource["note"] = [{"text": notes}]

        # Medication items as contained MedicationRequest entries
        items = prx.get("items") or []
        if items:
            contained = []
            dosage_instructions = []
            for idx, item in enumerate(items):
                med_id = f"med-{idx}"
                med_resource = {
                    "resourceType": "Medication",
                    "id": med_id,
                    "code": {
                        "text": item.get("medicationName") or item.get("medication_name") or "Unknown",
                    },
                }
                barcode = item.get("barcode")
                if barcode:
                    med_resource["code"]["coding"] = [
                        {"system": "urn:tr:titubb", "code": barcode}
                    ]
                contained.append(med_resource)

                dosage: dict[str, Any] = {
                    "sequence": idx + 1,
                    "text": item.get("dosageInstructions") or item.get("dosage_instructions") or "",
                }
                quantity = item.get("quantity")
                if quantity:
                    dosage["doseAndRate"] = [
                        {
                            "doseQuantity": {
                                "value": quantity,
                                "unit": item.get("unit") or "unit",
                            }
                        }
                    ]
                dosage_instructions.append(dosage)

            resource["contained"] = contained
            resource["medicationReference"] = {"reference": "#med-0"}
            if dosage_instructions:
                resource["dosageInstruction"] = dosage_instructions

        return resource

    # ------------------------------------------------------------------ #
    # from_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def from_fhir(cls, fhir: dict) -> dict:
        """Convert a FHIR MedicationRequest to X-EAR Prescription-compatible dict."""
        result: dict[str, Any] = {"id": fhir.get("id")}

        # Status
        result["status"] = cls._STATUS_FROM_FHIR.get(fhir.get("status", ""), "draft")

        # Intent is always 'order' in our context

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

        # Requester -> doctor_id
        requester = fhir.get("requester") or {}
        req_ref = requester.get("reference", "")
        if req_ref.startswith("Practitioner/"):
            result["doctor_id"] = req_ref.split("/", 1)[1]

        # Authored on
        if fhir.get("authoredOn"):
            result["prescribed_at"] = fhir["authoredOn"]

        # MEDULA identifier
        for ident in fhir.get("identifier") or []:
            if "medula" in (ident.get("system") or ""):
                result["medula_prescription_id"] = ident.get("value")

        # Group identifier -> protocol_no
        group = fhir.get("groupIdentifier") or {}
        if group.get("value"):
            result["protocol_no"] = group["value"]

        # Reason codes -> diagnosis_codes
        reason_codes = fhir.get("reasonCode") or []
        diag_codes = []
        for rc in reason_codes:
            for coding in rc.get("coding") or []:
                if coding.get("code"):
                    diag_codes.append(coding["code"])
        if diag_codes:
            result["diagnosis_codes"] = diag_codes

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
