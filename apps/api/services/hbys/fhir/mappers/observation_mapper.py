"""
Observation Mapper
==================
VitalSigns / LabResult (X-EAR) <-> FHIR R4 Observation resource.
"""
from __future__ import annotations

from typing import Any


class ObservationMapper:
    """Bidirectional mapper: VitalSigns/LabTest dict <-> FHIR Observation resource."""

    # LOINC codes for vital sign components
    _VITAL_LOINC = {
        "blood_pressure_systolic": ("8480-6", "Systolic blood pressure", "mm[Hg]"),
        "blood_pressure_diastolic": ("8462-4", "Diastolic blood pressure", "mm[Hg]"),
        "heart_rate": ("8867-4", "Heart rate", "/min"),
        "respiratory_rate": ("9279-1", "Respiratory rate", "/min"),
        "temperature": ("8310-5", "Body temperature", "Cel"),
        "oxygen_saturation": ("2708-6", "Oxygen saturation", "%"),
        "height": ("8302-2", "Body height", "cm"),
        "weight": ("29463-7", "Body weight", "kg"),
        "bmi": ("39156-5", "Body mass index", "kg/m2"),
        "pain_score": ("72514-3", "Pain severity", "{score}"),
    }

    # camelCase aliases used by to_dict()
    _VITAL_CAMEL = {
        "bloodPressureSystolic": "blood_pressure_systolic",
        "bloodPressureDiastolic": "blood_pressure_diastolic",
        "heartRate": "heart_rate",
        "respiratoryRate": "respiratory_rate",
        "temperature": "temperature",
        "oxygenSaturation": "oxygen_saturation",
        "height": "height",
        "weight": "weight",
        "bmi": "bmi",
        "painScore": "pain_score",
    }

    # FHIR status mapping
    _STATUS_TO_FHIR = {
        "pending": "registered",
        "in_progress": "preliminary",
        "completed": "final",
        "verified": "final",
        "cancelled": "cancelled",
    }
    _STATUS_FROM_FHIR = {
        "registered": "pending",
        "preliminary": "in_progress",
        "final": "completed",
        "cancelled": "cancelled",
        "amended": "completed",
    }

    # ================================================================== #
    # VITAL SIGNS -> FHIR Observation (panel with components)
    # ================================================================== #
    @classmethod
    def vital_signs_to_fhir(cls, vs: dict) -> dict:
        """Convert an X-EAR VitalSigns dict to a FHIR Observation (vital-signs panel)."""
        resource: dict[str, Any] = {
            "resourceType": "Observation",
            "id": vs.get("id"),
            "meta": {
                "profile": [
                    "http://hl7.org/fhir/StructureDefinition/vitalsigns"
                ],
            },
            "status": "final",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "vital-signs",
                            "display": "Vital Signs",
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": "http://loinc.org",
                        "code": "85353-1",
                        "display": "Vital signs, weight, height, head circumference, oxygen saturation and BMI panel",
                    }
                ],
                "text": "Vital Signs Panel",
            },
        }

        # Subject
        patient_id = vs.get("patientId") or vs.get("patient_id")
        if patient_id:
            resource["subject"] = {"reference": f"Patient/{patient_id}"}

        # Encounter
        encounter_id = vs.get("encounterId") or vs.get("encounter_id")
        if encounter_id:
            resource["encounter"] = {"reference": f"Encounter/{encounter_id}"}

        # Effective date
        recorded = vs.get("recordedAt") or vs.get("recorded_at")
        if recorded:
            resource["effectiveDateTime"] = cls._to_str(recorded)

        # Performer
        recorded_by = vs.get("recordedBy") or vs.get("recorded_by")
        if recorded_by:
            resource["performer"] = [{"reference": f"Practitioner/{recorded_by}"}]

        # Components - one per vital sign field
        components = []
        for camel_key, snake_key in cls._VITAL_CAMEL.items():
            value = vs.get(camel_key) or vs.get(snake_key)
            if value is not None:
                loinc_code, display, unit = cls._VITAL_LOINC[snake_key]
                comp: dict[str, Any] = {
                    "code": {
                        "coding": [
                            {
                                "system": "http://loinc.org",
                                "code": loinc_code,
                                "display": display,
                            }
                        ],
                        "text": display,
                    },
                    "valueQuantity": {
                        "value": value,
                        "unit": unit,
                        "system": "http://unitsofmeasure.org",
                        "code": unit,
                    },
                }
                components.append(comp)

        if components:
            resource["component"] = components

        return resource

    # ================================================================== #
    # LAB RESULT -> FHIR Observation
    # ================================================================== #
    @classmethod
    def lab_result_to_fhir(cls, lab: dict) -> dict:
        """Convert an X-EAR LabTest dict to a FHIR Observation (laboratory)."""
        status_raw = lab.get("status", "pending")
        resource: dict[str, Any] = {
            "resourceType": "Observation",
            "id": lab.get("id"),
            "meta": {
                "profile": [
                    "http://hl7.org/fhir/StructureDefinition/Observation"
                ],
            },
            "status": cls._STATUS_TO_FHIR.get(status_raw, "unknown"),
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": "laboratory",
                            "display": "Laboratory",
                        }
                    ]
                }
            ],
        }

        # Code (LOINC if available)
        loinc = lab.get("loincCode") or lab.get("loinc_code")
        code_entry: dict[str, Any] = {"text": lab.get("testName", "Lab Test")}
        if loinc:
            code_entry["coding"] = [
                {"system": "http://loinc.org", "code": loinc, "display": lab.get("testName", "")}
            ]
        resource["code"] = code_entry

        # Value
        result_val = lab.get("resultValue") or lab.get("result_value")
        result_unit = lab.get("resultUnit") or lab.get("result_unit")
        if result_val is not None:
            try:
                numeric = float(result_val)
                vq: dict[str, Any] = {"value": numeric}
                if result_unit:
                    vq["unit"] = result_unit
                    vq["system"] = "http://unitsofmeasure.org"
                    vq["code"] = result_unit
                resource["valueQuantity"] = vq
            except (ValueError, TypeError):
                resource["valueString"] = str(result_val)

        # Reference range
        ref_low = lab.get("referenceRangeLow") or lab.get("reference_range_low")
        ref_high = lab.get("referenceRangeHigh") or lab.get("reference_range_high")
        if ref_low is not None or ref_high is not None:
            rr: dict[str, Any] = {}
            if ref_low is not None:
                rr["low"] = {"value": ref_low, "unit": result_unit or ""}
            if ref_high is not None:
                rr["high"] = {"value": ref_high, "unit": result_unit or ""}
            resource["referenceRange"] = [rr]

        # Interpretation (abnormal / critical flags)
        is_critical = lab.get("isCritical") or lab.get("is_critical")
        is_abnormal = lab.get("isAbnormal") or lab.get("is_abnormal")
        if is_critical:
            resource["interpretation"] = [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                            "code": "AA",
                            "display": "Critical abnormal",
                        }
                    ]
                }
            ]
        elif is_abnormal:
            resource["interpretation"] = [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                            "code": "A",
                            "display": "Abnormal",
                        }
                    ]
                }
            ]

        # Effective date
        result_date = lab.get("resultDate") or lab.get("result_date")
        if result_date:
            resource["effectiveDateTime"] = cls._to_str(result_date)

        # Notes
        notes = lab.get("notes")
        result_text = lab.get("resultText") or lab.get("result_text")
        note_text = notes or result_text
        if note_text:
            resource["note"] = [{"text": note_text}]

        return resource

    # ================================================================== #
    # Unified to_fhir dispatcher
    # ================================================================== #
    @classmethod
    def to_fhir(cls, data: dict, category: str = "vital-signs") -> dict:
        """Dispatch to the appropriate conversion based on category."""
        if category == "laboratory":
            return cls.lab_result_to_fhir(data)
        return cls.vital_signs_to_fhir(data)

    # ================================================================== #
    # from_fhir
    # ================================================================== #
    @classmethod
    def from_fhir(cls, fhir: dict) -> dict:
        """Convert a FHIR Observation to an X-EAR-compatible dict."""
        result: dict[str, Any] = {"id": fhir.get("id")}

        # Determine category
        categories = fhir.get("category") or []
        category_code = ""
        for cat in categories:
            for coding in cat.get("coding") or []:
                category_code = coding.get("code", "")
                break

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

        result["status"] = cls._STATUS_FROM_FHIR.get(fhir.get("status", ""), "pending")

        if category_code == "vital-signs":
            result["_type"] = "vital_signs"
            # Extract components
            loinc_to_field = {v[0]: k for k, v in cls._VITAL_LOINC.items()}
            for comp in fhir.get("component") or []:
                codings = (comp.get("code") or {}).get("coding") or []
                for c in codings:
                    field = loinc_to_field.get(c.get("code"))
                    if field:
                        vq = comp.get("valueQuantity") or {}
                        result[field] = vq.get("value")
        elif category_code == "laboratory":
            result["_type"] = "lab_test"
            vq = fhir.get("valueQuantity")
            if vq:
                result["result_value"] = str(vq.get("value", ""))
                result["result_unit"] = vq.get("unit")
            elif fhir.get("valueString"):
                result["result_value"] = fhir["valueString"]

            # Reference range
            ranges = fhir.get("referenceRange") or []
            if ranges:
                rr = ranges[0]
                low = rr.get("low") or {}
                high = rr.get("high") or {}
                if low.get("value") is not None:
                    result["reference_range_low"] = low["value"]
                if high.get("value") is not None:
                    result["reference_range_high"] = high["value"]

            # LOINC code
            code_codings = (fhir.get("code") or {}).get("coding") or []
            for cc in code_codings:
                if cc.get("system") == "http://loinc.org":
                    result["loinc_code"] = cc.get("code")
                    break

        if fhir.get("effectiveDateTime"):
            result["recorded_at"] = fhir["effectiveDateTime"]

        return {k: v for k, v in result.items() if v is not None}

    # ------------------------------------------------------------------ #
    # Helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _to_str(value: Any) -> str:
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return str(value)
