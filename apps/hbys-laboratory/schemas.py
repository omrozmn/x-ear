"""
Laboratory Service Schemas (Pydantic v2)
Full CRUD schemas for lab orders, lab tests, and test definitions.
"""
from datetime import datetime
from typing import Optional, List
from pydantic import Field

from hbys_common.schemas import AppBaseModel


# ─── Test Definition Schemas ────────────────────────────────────────────────

class TestDefinitionCreate(AppBaseModel):
    name_tr: str = Field(..., max_length=200, description="Test name in Turkish")
    name_en: Optional[str] = Field(None, max_length=200, description="Test name in English")
    loinc_code: Optional[str] = Field(None, max_length=20)
    category: str = Field("biochemistry", description="hematology/biochemistry/microbiology/immunology/urinalysis/coagulation/hormones/tumor_markers")
    specimen_type: str = Field("blood", description="blood/urine/stool/csf/tissue/swab")
    unit: Optional[str] = Field(None, max_length=50)
    ref_range_male_low: Optional[float] = None
    ref_range_male_high: Optional[float] = None
    ref_range_female_low: Optional[float] = None
    ref_range_female_high: Optional[float] = None
    ref_range_child_low: Optional[float] = None
    ref_range_child_high: Optional[float] = None
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None
    turnaround_minutes: Optional[int] = None
    is_active: bool = True
    description: Optional[str] = None


class TestDefinitionUpdate(AppBaseModel):
    name_tr: Optional[str] = Field(None, max_length=200)
    name_en: Optional[str] = Field(None, max_length=200)
    loinc_code: Optional[str] = Field(None, max_length=20)
    category: Optional[str] = None
    specimen_type: Optional[str] = None
    unit: Optional[str] = Field(None, max_length=50)
    ref_range_male_low: Optional[float] = None
    ref_range_male_high: Optional[float] = None
    ref_range_female_low: Optional[float] = None
    ref_range_female_high: Optional[float] = None
    ref_range_child_low: Optional[float] = None
    ref_range_child_high: Optional[float] = None
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None
    turnaround_minutes: Optional[int] = None
    is_active: Optional[bool] = None
    description: Optional[str] = None


class TestDefinitionRead(AppBaseModel):
    id: str
    name_tr: str
    name_en: Optional[str] = None
    loinc_code: Optional[str] = None
    category: str
    specimen_type: str
    unit: Optional[str] = None
    ref_range_male_low: Optional[float] = None
    ref_range_male_high: Optional[float] = None
    ref_range_female_low: Optional[float] = None
    ref_range_female_high: Optional[float] = None
    ref_range_child_low: Optional[float] = None
    ref_range_child_high: Optional[float] = None
    critical_low: Optional[float] = None
    critical_high: Optional[float] = None
    turnaround_minutes: Optional[int] = None
    is_active: bool
    description: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


# ─── Lab Test Schemas ────────────────────────────────────────────────────────

class LabTestCreate(AppBaseModel):
    test_definition_id: str = Field(..., description="ID of the test definition")
    notes: Optional[str] = None


class LabTestResultEntry(AppBaseModel):
    """Schema for entering a test result."""
    result_value: Optional[str] = Field(None, max_length=200, description="Numeric or text result value")
    result_unit: Optional[str] = Field(None, max_length=50)
    result_text: Optional[str] = Field(None, description="Free-text result (e.g., culture report)")
    performed_by: Optional[str] = Field(None, description="User ID of the technician")
    notes: Optional[str] = None


class LabTestVerify(AppBaseModel):
    """Schema for verifying/approving a test result."""
    verified_by: str = Field(..., description="User ID of the verifying physician/pathologist")
    notes: Optional[str] = None


class LabTestRead(AppBaseModel):
    id: str
    lab_order_id: str
    test_definition_id: Optional[str] = None
    status: str
    result_value: Optional[str] = None
    result_unit: Optional[str] = None
    reference_range_low: Optional[float] = None
    reference_range_high: Optional[float] = None
    is_abnormal: bool = False
    is_critical: bool = False
    result_text: Optional[str] = None
    result_date: Optional[datetime] = None
    performed_by: Optional[str] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    notes: Optional[str] = None
    loinc_code: Optional[str] = None
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Nested test definition
    test_definition: Optional[TestDefinitionRead] = None


# ─── Lab Order Schemas ───────────────────────────────────────────────────────

class LabOrderCreate(AppBaseModel):
    encounter_id: Optional[str] = None
    patient_id: str = Field(..., description="Patient party ID")
    ordered_by: Optional[str] = Field(None, description="Ordering physician user ID")
    priority: str = Field("routine", description="routine/urgent/stat")
    clinical_info: Optional[str] = None
    specimen_type: Optional[str] = Field(None, description="blood/urine/stool/csf/tissue/swab")
    # Tests to include in this order
    tests: List[LabTestCreate] = Field(default_factory=list, description="List of tests to order")


class LabOrderUpdate(AppBaseModel):
    priority: Optional[str] = None
    clinical_info: Optional[str] = None
    specimen_type: Optional[str] = None
    status: Optional[str] = None


class SpecimenCollect(AppBaseModel):
    """Schema for recording specimen collection."""
    collected_by: str = Field(..., description="User ID of the phlebotomist / collector")
    barcode: Optional[str] = Field(None, max_length=50, description="Barcode label on the specimen tube")
    specimen_type: Optional[str] = None
    notes: Optional[str] = None


class LabOrderRead(AppBaseModel):
    id: str
    encounter_id: Optional[str] = None
    patient_id: str
    ordered_by: Optional[str] = None
    order_date: Optional[datetime] = None
    status: str
    priority: str
    clinical_info: Optional[str] = None
    specimen_type: Optional[str] = None
    barcode: Optional[str] = None
    collection_date: Optional[datetime] = None
    collected_by: Optional[str] = None
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    # Nested tests
    tests: List[LabTestRead] = Field(default_factory=list)


class LabOrderSummary(AppBaseModel):
    """Lightweight order summary for list endpoints."""
    id: str
    patient_id: str
    order_date: Optional[datetime] = None
    status: str
    priority: str
    specimen_type: Optional[str] = None
    barcode: Optional[str] = None
    test_count: int = 0
    completed_count: int = 0
    has_abnormal: bool = False
    has_critical: bool = False
