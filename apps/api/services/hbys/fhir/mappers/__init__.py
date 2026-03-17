"""
FHIR Resource Mappers
=====================
Bidirectional mapping between X-EAR internal models and FHIR R4 resources.
Each mapper exposes `to_fhir(internal_dict) -> dict` and `from_fhir(fhir_dict) -> dict`.
"""
from .patient_mapper import PatientMapper
from .encounter_mapper import EncounterMapper
from .observation_mapper import ObservationMapper
from .medication_request_mapper import MedicationRequestMapper
from .condition_mapper import ConditionMapper
from .diagnostic_report_mapper import DiagnosticReportMapper
from .allergy_intolerance_mapper import AllergyIntoleranceMapper

__all__ = [
    "PatientMapper",
    "EncounterMapper",
    "ObservationMapper",
    "MedicationRequestMapper",
    "ConditionMapper",
    "DiagnosticReportMapper",
    "AllergyIntoleranceMapper",
]
