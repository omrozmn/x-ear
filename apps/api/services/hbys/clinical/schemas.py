"""
Clinical Service Pydantic Schemas
Create / Read / Update schemas for Encounter, VitalSigns, and ClinicalNote.
"""
from datetime import datetime
from typing import Optional, List, Literal

from pydantic import Field, field_validator

from schemas.base import AppBaseModel, IDMixin, TimestampMixin


# ---------------------------------------------------------------------------
# Encounter Schemas
# ---------------------------------------------------------------------------

class EncounterCreate(AppBaseModel):
    patient_id: str = Field(..., min_length=1, description="Patient party ID")
    doctor_id: Optional[str] = Field(None, description="Doctor user ID")
    encounter_type: Literal["outpatient", "inpatient", "emergency"] = "outpatient"
    status: Literal["waiting", "in_progress", "completed", "cancelled"] = "waiting"
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    chief_complaint: Optional[str] = Field(None, max_length=500)
    clinical_notes: Optional[str] = None
    encounter_date: Optional[datetime] = None
    discharge_date: Optional[datetime] = None


class EncounterUpdate(AppBaseModel):
    doctor_id: Optional[str] = None
    encounter_type: Optional[Literal["outpatient", "inpatient", "emergency"]] = None
    status: Optional[Literal["waiting", "in_progress", "completed", "cancelled"]] = None
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    chief_complaint: Optional[str] = Field(None, max_length=500)
    clinical_notes: Optional[str] = None
    encounter_date: Optional[datetime] = None
    discharge_date: Optional[datetime] = None


class EncounterRead(AppBaseModel, IDMixin, TimestampMixin):
    patient_id: str
    doctor_id: Optional[str] = None
    encounter_type: str
    status: str
    subjective: Optional[str] = None
    objective: Optional[str] = None
    assessment: Optional[str] = None
    plan: Optional[str] = None
    chief_complaint: Optional[str] = None
    clinical_notes: Optional[str] = None
    encounter_date: Optional[datetime] = None
    discharge_date: Optional[datetime] = None
    tenant_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Vital Signs Schemas
# ---------------------------------------------------------------------------

class VitalSignsCreate(AppBaseModel):
    encounter_id: str = Field(..., min_length=1, description="Encounter ID")
    patient_id: str = Field(..., min_length=1, description="Patient party ID")
    blood_pressure_systolic: Optional[int] = Field(None, ge=0, le=400)
    blood_pressure_diastolic: Optional[int] = Field(None, ge=0, le=300)
    heart_rate: Optional[int] = Field(None, ge=0, le=400)
    respiratory_rate: Optional[int] = Field(None, ge=0, le=100)
    temperature: Optional[float] = Field(None, ge=25.0, le=50.0)
    oxygen_saturation: Optional[float] = Field(None, ge=0.0, le=100.0)
    height: Optional[float] = Field(None, ge=0.0, le=300.0)
    weight: Optional[float] = Field(None, ge=0.0, le=700.0)
    bmi: Optional[float] = Field(None, ge=0.0, le=200.0)
    pain_score: Optional[int] = Field(None, ge=0, le=10)
    recorded_at: Optional[datetime] = None
    recorded_by: Optional[str] = None

    @field_validator("bmi", mode="before")
    @classmethod
    def auto_calculate_bmi(cls, v, info):
        """Auto-calculate BMI if height and weight provided but bmi is not."""
        if v is not None:
            return v
        data = info.data
        height_m = data.get("height")
        weight_kg = data.get("weight")
        if height_m and weight_kg and height_m > 0:
            height_in_m = height_m / 100.0  # cm -> m
            return round(weight_kg / (height_in_m ** 2), 2)
        return v


class VitalSignsUpdate(AppBaseModel):
    blood_pressure_systolic: Optional[int] = Field(None, ge=0, le=400)
    blood_pressure_diastolic: Optional[int] = Field(None, ge=0, le=300)
    heart_rate: Optional[int] = Field(None, ge=0, le=400)
    respiratory_rate: Optional[int] = Field(None, ge=0, le=100)
    temperature: Optional[float] = Field(None, ge=25.0, le=50.0)
    oxygen_saturation: Optional[float] = Field(None, ge=0.0, le=100.0)
    height: Optional[float] = Field(None, ge=0.0, le=300.0)
    weight: Optional[float] = Field(None, ge=0.0, le=700.0)
    bmi: Optional[float] = Field(None, ge=0.0, le=200.0)
    pain_score: Optional[int] = Field(None, ge=0, le=10)
    recorded_by: Optional[str] = None


class VitalSignsRead(AppBaseModel, IDMixin, TimestampMixin):
    encounter_id: str
    patient_id: str
    blood_pressure_systolic: Optional[int] = None
    blood_pressure_diastolic: Optional[int] = None
    heart_rate: Optional[int] = None
    respiratory_rate: Optional[int] = None
    temperature: Optional[float] = None
    oxygen_saturation: Optional[float] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    bmi: Optional[float] = None
    pain_score: Optional[int] = None
    recorded_at: Optional[datetime] = None
    recorded_by: Optional[str] = None
    tenant_id: Optional[str] = None


# ---------------------------------------------------------------------------
# Clinical Note Schemas
# ---------------------------------------------------------------------------

class ClinicalNoteCreate(AppBaseModel):
    encounter_id: str = Field(..., min_length=1, description="Encounter ID")
    note_type: Literal["anamnesis", "progress", "discharge", "consultation"] = "progress"
    content: str = Field(..., min_length=1, description="Note content")
    author_id: Optional[str] = None


class ClinicalNoteUpdate(AppBaseModel):
    note_type: Optional[Literal["anamnesis", "progress", "discharge", "consultation"]] = None
    content: Optional[str] = Field(None, min_length=1)
    author_id: Optional[str] = None


class ClinicalNoteRead(AppBaseModel, IDMixin, TimestampMixin):
    encounter_id: str
    note_type: str
    content: str
    author_id: Optional[str] = None
    tenant_id: Optional[str] = None
