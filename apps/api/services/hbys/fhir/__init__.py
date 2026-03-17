"""
MS-11: FHIR Gateway
====================
FHIR R4 + HL7 v2 interoperability layer for the X-EAR HBYS system.

Provides:
- FHIR R4 RESTful endpoints (Patient, Encounter, Observation, etc.)
- HL7 v2 message parsing and building (ADT, ORM, ORU)
- Bidirectional mapping between internal X-EAR models and FHIR/HL7 formats
"""
from .config import fhir_config

__all__ = ["fhir_config"]
