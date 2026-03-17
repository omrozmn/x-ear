"""
FHIR Gateway Configuration
===========================
Settings for FHIR R4 interoperability and HL7 v2 MLLP integration.
"""
from pydantic import Field
from pydantic_settings import BaseSettings


class FHIRConfig(BaseSettings):
    """FHIR / HL7 gateway configuration, loaded from environment variables."""

    # FHIR R4 settings
    FHIR_BASE_URL: str = Field(
        default="http://localhost:8111/api/fhir",
        description="Base URL for this FHIR server (used in Bundle links)",
    )
    FHIR_VERSION: str = Field(default="4.0.1", description="FHIR specification version")
    FHIR_SERVER_NAME: str = Field(default="X-EAR HBYS FHIR Gateway")
    FHIR_PUBLISHER: str = Field(default="X-EAR Health Information Systems")

    # Supported FHIR resource types
    SUPPORTED_RESOURCES: list[str] = Field(
        default=[
            "Patient",
            "Encounter",
            "Observation",
            "Condition",
            "MedicationRequest",
            "DiagnosticReport",
            "AllergyIntolerance",
        ]
    )

    # HL7 v2 MLLP settings
    HL7_MLLP_HOST: str = Field(default="0.0.0.0", description="MLLP listener host")
    HL7_MLLP_PORT: int = Field(default=2575, description="MLLP listener port")
    HL7_SENDING_APPLICATION: str = Field(default="X-EAR-HBYS")
    HL7_SENDING_FACILITY: str = Field(default="X-EAR")
    HL7_RECEIVING_APPLICATION: str = Field(default="EXTERNAL-HIS")
    HL7_RECEIVING_FACILITY: str = Field(default="HOSPITAL")
    HL7_VERSION: str = Field(default="2.5.1")
    HL7_ENCODING_CHARACTERS: str = Field(default="^~\\&")
    HL7_FIELD_SEPARATOR: str = Field(default="|")

    # Pagination defaults
    DEFAULT_PAGE_SIZE: int = Field(default=20, ge=1, le=100)
    MAX_PAGE_SIZE: int = Field(default=100, ge=1, le=1000)

    model_config = {"env_prefix": "FHIR_GATEWAY_", "case_sensitive": False}


fhir_config = FHIRConfig()
