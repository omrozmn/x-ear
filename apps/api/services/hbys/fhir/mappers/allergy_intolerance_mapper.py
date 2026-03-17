"""
AllergyIntolerance Mapper
=========================
Allergy (X-EAR) <-> FHIR R4 AllergyIntolerance resource.

Note: X-EAR does not yet have a dedicated Allergy model, so this mapper
works with a generic allergy dict that can be stored in custom_data or
a future allergy table.
"""
from __future__ import annotations

from typing import Any


class AllergyIntoleranceMapper:
    """Bidirectional mapper: Allergy dict <-> FHIR AllergyIntolerance resource."""

    # X-EAR allergy type -> FHIR AllergyIntolerance.type
    _TYPE_TO_FHIR = {
        "allergy": "allergy",
        "intolerance": "intolerance",
    }

    # X-EAR category -> FHIR AllergyIntolerance.category
    _CATEGORY_TO_FHIR = {
        "food": "food",
        "medication": "medication",
        "environment": "environment",
        "biologic": "biologic",
    }

    # X-EAR criticality -> FHIR
    _CRITICALITY_TO_FHIR = {
        "low": "low",
        "high": "high",
        "unable_to_assess": "unable-to-assess",
    }
    _CRITICALITY_FROM_FHIR = {
        "low": "low",
        "high": "high",
        "unable-to-assess": "unable_to_assess",
    }

    # X-EAR severity -> FHIR reaction.severity
    _SEVERITY_TO_FHIR = {
        "mild": "mild",
        "moderate": "moderate",
        "severe": "severe",
    }

    # ------------------------------------------------------------------ #
    # to_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def to_fhir(cls, allergy: dict) -> dict:
        """Convert an X-EAR Allergy dict to FHIR R4 AllergyIntolerance."""
        resource: dict[str, Any] = {
            "resourceType": "AllergyIntolerance",
            "id": allergy.get("id"),
            "meta": {
                "profile": [
                    "http://hl7.org/fhir/StructureDefinition/AllergyIntolerance"
                ],
            },
        }

        # Clinical status
        status = allergy.get("status", "active")
        resource["clinicalStatus"] = {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    "code": status if status in ("active", "inactive", "resolved") else "active",
                }
            ]
        }

        # Verification status
        verification = allergy.get("verification_status", "confirmed")
        resource["verificationStatus"] = {
            "coding": [
                {
                    "system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
                    "code": verification
                    if verification in ("unconfirmed", "confirmed", "refuted", "entered-in-error")
                    else "confirmed",
                }
            ]
        }

        # Type
        allergy_type = allergy.get("type", "allergy")
        if allergy_type in cls._TYPE_TO_FHIR:
            resource["type"] = cls._TYPE_TO_FHIR[allergy_type]

        # Category
        category = allergy.get("category")
        if category:
            cats = category if isinstance(category, list) else [category]
            resource["category"] = [
                cls._CATEGORY_TO_FHIR.get(c, c) for c in cats
            ]

        # Criticality
        criticality = allergy.get("criticality")
        if criticality:
            resource["criticality"] = cls._CRITICALITY_TO_FHIR.get(criticality, criticality)

        # Code (the allergen substance)
        substance = allergy.get("substance") or allergy.get("allergen")
        substance_code = allergy.get("substance_code")
        if substance or substance_code:
            code_entry: dict[str, Any] = {}
            if substance_code:
                code_entry["coding"] = [
                    {
                        "system": "http://snomed.info/sct",
                        "code": substance_code,
                        "display": substance or "",
                    }
                ]
            if substance:
                code_entry["text"] = substance
            resource["code"] = code_entry

        # Patient
        patient_id = allergy.get("patientId") or allergy.get("patient_id")
        if patient_id:
            resource["patient"] = {"reference": f"Patient/{patient_id}"}

        # Encounter
        encounter_id = allergy.get("encounterId") or allergy.get("encounter_id")
        if encounter_id:
            resource["encounter"] = {"reference": f"Encounter/{encounter_id}"}

        # Onset
        onset = allergy.get("onset_date") or allergy.get("onsetDate")
        if onset:
            resource["onsetDateTime"] = cls._to_str(onset)

        # Recorded date
        recorded = allergy.get("recorded_date") or allergy.get("recordedDate")
        if recorded:
            resource["recordedDate"] = cls._to_str(recorded)

        # Recorder
        recorder = allergy.get("recorded_by") or allergy.get("recordedBy")
        if recorder:
            resource["recorder"] = {"reference": f"Practitioner/{recorder}"}

        # Reactions
        reactions = allergy.get("reactions") or []
        if reactions:
            fhir_reactions = []
            for rxn in reactions:
                fhir_rxn: dict[str, Any] = {}
                # Substance
                rxn_substance = rxn.get("substance")
                if rxn_substance:
                    fhir_rxn["substance"] = {"text": rxn_substance}
                # Manifestations
                manifestations = rxn.get("manifestations") or rxn.get("symptoms") or []
                if manifestations:
                    fhir_rxn["manifestation"] = [{"text": m} for m in manifestations]
                else:
                    fhir_rxn["manifestation"] = [{"text": "Unknown reaction"}]
                # Severity
                rxn_severity = rxn.get("severity")
                if rxn_severity in cls._SEVERITY_TO_FHIR:
                    fhir_rxn["severity"] = cls._SEVERITY_TO_FHIR[rxn_severity]
                # Description
                desc = rxn.get("description")
                if desc:
                    fhir_rxn["description"] = desc
                fhir_reactions.append(fhir_rxn)
            resource["reaction"] = fhir_reactions

        # Notes
        notes = allergy.get("notes")
        if notes:
            resource["note"] = [{"text": notes}]

        return resource

    # ------------------------------------------------------------------ #
    # from_fhir
    # ------------------------------------------------------------------ #
    @classmethod
    def from_fhir(cls, fhir: dict) -> dict:
        """Convert a FHIR AllergyIntolerance to X-EAR allergy dict."""
        result: dict[str, Any] = {"id": fhir.get("id")}

        # Clinical status
        cs = fhir.get("clinicalStatus") or {}
        for c in cs.get("coding") or []:
            result["status"] = c.get("code", "active")
            break

        # Type
        result["type"] = fhir.get("type", "allergy")

        # Category
        categories = fhir.get("category") or []
        if categories:
            result["category"] = categories[0] if len(categories) == 1 else categories

        # Criticality
        crit = fhir.get("criticality")
        if crit:
            result["criticality"] = cls._CRITICALITY_FROM_FHIR.get(crit, crit)

        # Code -> substance
        code = fhir.get("code") or {}
        result["substance"] = code.get("text")
        for coding in code.get("coding") or []:
            result["substance_code"] = coding.get("code")
            if not result.get("substance"):
                result["substance"] = coding.get("display")
            break

        # Patient
        patient = fhir.get("patient") or {}
        ref = patient.get("reference", "")
        if ref.startswith("Patient/"):
            result["patient_id"] = ref.split("/", 1)[1]

        # Encounter
        encounter = fhir.get("encounter") or {}
        enc_ref = encounter.get("reference", "")
        if enc_ref.startswith("Encounter/"):
            result["encounter_id"] = enc_ref.split("/", 1)[1]

        # Onset
        if fhir.get("onsetDateTime"):
            result["onset_date"] = fhir["onsetDateTime"]

        # Recorded date
        if fhir.get("recordedDate"):
            result["recorded_date"] = fhir["recordedDate"]

        # Recorder
        recorder = fhir.get("recorder") or {}
        rec_ref = recorder.get("reference", "")
        if rec_ref.startswith("Practitioner/"):
            result["recorded_by"] = rec_ref.split("/", 1)[1]

        # Reactions
        fhir_reactions = fhir.get("reaction") or []
        if fhir_reactions:
            reactions = []
            for rxn in fhir_reactions:
                reaction: dict[str, Any] = {}
                sub = rxn.get("substance") or {}
                if sub.get("text"):
                    reaction["substance"] = sub["text"]
                manifestations = rxn.get("manifestation") or []
                reaction["manifestations"] = [m.get("text", "") for m in manifestations]
                if rxn.get("severity"):
                    reaction["severity"] = rxn["severity"]
                if rxn.get("description"):
                    reaction["description"] = rxn["description"]
                reactions.append(reaction)
            result["reactions"] = reactions

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
