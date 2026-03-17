"""
Pydantic v2 schemas for the Diagnosis Service.
"""
from datetime import date, datetime
from enum import Enum
from typing import Optional, List

from pydantic import Field
from hbys_common.schemas import AppBaseModel


# ─── Enums ────────────────────────────────────────────────────────────────────

class DiagnosisTypeEnum(str, Enum):
    primary = "primary"
    secondary = "secondary"
    differential = "differential"


class SeverityEnum(str, Enum):
    mild = "mild"
    moderate = "moderate"
    severe = "severe"
    critical = "critical"


# ─── ICD Code Schemas ────────────────────────────────────────────────────────

class ICDCodeBase(AppBaseModel):
    code: str = Field(..., max_length=20, description="ICD code (e.g. J06.9)")
    version: str = Field("10", max_length=5)
    name_tr: str = Field(..., max_length=500, description="Turkish name")
    name_en: Optional[str] = Field(None, max_length=500, description="English name")
    category: Optional[str] = Field(None, max_length=200)
    chapter: Optional[str] = Field(None, max_length=10)
    parent_code: Optional[str] = Field(None, max_length=20)
    is_billable: bool = Field(True)


class ICDCodeCreate(ICDCodeBase):
    pass


class ICDCodeRead(ICDCodeBase):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ICDSearchParams(AppBaseModel):
    q: str = Field(..., min_length=1, max_length=200, description="Search query (code or name)")
    version: str = Field("10", max_length=5)
    chapter: Optional[str] = Field(None, max_length=10)
    limit: int = Field(20, ge=1, le=100)


class ICDSearchResult(AppBaseModel):
    results: List[ICDCodeRead]
    total: int
    query: str


# ─── Diagnosis Schemas ────────────────────────────────────────────────────────

class DiagnosisBase(AppBaseModel):
    encounter_id: str = Field(..., max_length=36)
    patient_id: str = Field(..., max_length=36)
    icd_code: str = Field(..., max_length=20)
    icd_version: str = Field("10", max_length=5)
    diagnosis_name_tr: str = Field(..., max_length=500)
    diagnosis_name_en: Optional[str] = Field(None, max_length=500)
    diagnosis_type: DiagnosisTypeEnum = Field(DiagnosisTypeEnum.primary)
    severity: Optional[SeverityEnum] = None
    onset_date: Optional[date] = None
    resolved_date: Optional[date] = None
    is_chronic: bool = Field(False)
    notes: Optional[str] = None
    diagnosed_by: Optional[str] = Field(None, max_length=36)


class DiagnosisCreate(AppBaseModel):
    """Schema for creating a new diagnosis. encounter_id comes from the URL path."""
    patient_id: str = Field(..., max_length=36)
    icd_code: str = Field(..., max_length=20)
    icd_version: str = Field("10", max_length=5)
    diagnosis_name_tr: str = Field(..., max_length=500)
    diagnosis_name_en: Optional[str] = Field(None, max_length=500)
    diagnosis_type: DiagnosisTypeEnum = Field(DiagnosisTypeEnum.primary)
    severity: Optional[SeverityEnum] = None
    onset_date: Optional[date] = None
    resolved_date: Optional[date] = None
    is_chronic: bool = Field(False)
    notes: Optional[str] = None
    diagnosed_by: Optional[str] = Field(None, max_length=36)


class DiagnosisUpdate(AppBaseModel):
    """Schema for updating a diagnosis. All fields optional."""
    icd_code: Optional[str] = Field(None, max_length=20)
    icd_version: Optional[str] = Field(None, max_length=5)
    diagnosis_name_tr: Optional[str] = Field(None, max_length=500)
    diagnosis_name_en: Optional[str] = Field(None, max_length=500)
    diagnosis_type: Optional[DiagnosisTypeEnum] = None
    severity: Optional[SeverityEnum] = None
    onset_date: Optional[date] = None
    resolved_date: Optional[date] = None
    is_chronic: Optional[bool] = None
    notes: Optional[str] = None
    diagnosed_by: Optional[str] = Field(None, max_length=36)


class DiagnosisRead(DiagnosisBase):
    id: str
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DiagnosisListResponse(AppBaseModel):
    items: List[DiagnosisRead]
    total: int


class PatientDiagnosisHistory(AppBaseModel):
    patient_id: str
    diagnoses: List[DiagnosisRead]
    total: int
    chronic_count: int
    active_count: int
