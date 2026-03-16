from datetime import datetime
from typing import Literal, Optional

from pydantic import Field

from schemas.base import AppBaseModel


class PersonnelOverviewKpi(AppBaseModel):
    key: str
    label: str
    value: str


class PersonnelOverviewResponse(AppBaseModel):
    employees: list[PersonnelOverviewKpi]
    leave: list[PersonnelOverviewKpi]
    documents: list[PersonnelOverviewKpi]
    compensation: list[PersonnelOverviewKpi]


class PersonnelEmployee(AppBaseModel):
    id: str
    full_name: str = Field(..., alias="fullName")
    linked_user_id: Optional[str] = Field(None, alias="linkedUserId")
    linked_user: Optional[str] = Field(None, alias="linkedUser")
    email: Optional[str] = None
    role: Optional[str] = None
    branch_names: list[str] = Field(default_factory=list, alias="branchNames")
    status: Literal["active", "passive"]
    hired_at: Optional[datetime] = Field(None, alias="hiredAt")
    last_login: Optional[datetime] = Field(None, alias="lastLogin")
    premium_profile: str = Field(..., alias="premiumProfile")


class PersonnelLeaveRecord(AppBaseModel):
    id: str
    employee_id: str = Field(..., alias="employeeId")
    employee_name: str = Field(..., alias="employeeName")
    leave_type: str = Field(..., alias="leaveType")
    start_date: str = Field(..., alias="startDate")
    end_date: str = Field(..., alias="endDate")
    day_count: float = Field(..., alias="dayCount")
    status: str
    approver: Optional[str] = None


class PersonnelDocumentRecord(AppBaseModel):
    id: str
    employee_id: str = Field(..., alias="employeeId")
    employee_name: str = Field(..., alias="employeeName")
    document_type: str = Field(..., alias="documentType")
    status: str
    valid_until: Optional[str] = Field(None, alias="validUntil")
    branch_name: Optional[str] = Field(None, alias="branchName")


class PersonnelCompensationRecord(AppBaseModel):
    id: str
    employee_id: str = Field(..., alias="employeeId")
    employee_name: str = Field(..., alias="employeeName")
    linked_user_id: Optional[str] = Field(None, alias="linkedUserId")
    linked_user: Optional[str] = Field(None, alias="linkedUser")
    period_label: str = Field(..., alias="periodLabel")
    calculation_date: str = Field(..., alias="calculationDate")
    model_type: str = Field(..., alias="modelType")
    collection_rule: str = Field(..., alias="collectionRule")
    target_amount: Optional[float] = Field(None, alias="targetAmount")
    rate_summary: str = Field(..., alias="rateSummary")
    sales_total: float = Field(..., alias="salesTotal")
    accrued_premium: float = Field(..., alias="accruedPremium")
    payroll_status: str = Field(..., alias="payrollStatus")


class PersonnelTierRule(AppBaseModel):
    threshold: float
    rate: float


class PersonnelCompensationSettings(AppBaseModel):
    period_mode: str = Field(..., alias="periodMode")
    calculation_offset_days: int = Field(..., alias="calculationOffsetDays")
    model_type: str = Field(..., alias="modelType")
    base_rate: Optional[float] = Field(None, alias="baseRate")
    target_enabled: bool = Field(..., alias="targetEnabled")
    target_amount: Optional[float] = Field(None, alias="targetAmount")
    collection_rule: str = Field(..., alias="collectionRule")
    tiers: list[PersonnelTierRule] = Field(default_factory=list)


class PersonnelLeavePolicy(AppBaseModel):
    annual_entitlement_days: int = Field(..., alias="annualEntitlementDays")
    carry_over_enabled: bool = Field(..., alias="carryOverEnabled")
    leave_types: list[str] = Field(default_factory=list, alias="leaveTypes")


class PersonnelDocumentPolicy(AppBaseModel):
    required_document_types: list[str] = Field(default_factory=list, alias="requiredDocumentTypes")
    expiring_document_types: list[str] = Field(default_factory=list, alias="expiringDocumentTypes")
    reminder_days_before_expiry: int = Field(..., alias="reminderDaysBeforeExpiry")


class PersonnelSettingsResponse(AppBaseModel):
    linked_user_required: bool = Field(..., alias="linkedUserRequired")
    compensation: PersonnelCompensationSettings
    leave_policy: PersonnelLeavePolicy = Field(..., alias="leavePolicy")
    document_policy: PersonnelDocumentPolicy = Field(..., alias="documentPolicy")


class PersonnelSettingsUpdate(AppBaseModel):
    linked_user_required: Optional[bool] = Field(None, alias="linkedUserRequired")
    compensation: Optional[PersonnelCompensationSettings] = None
    leave_policy: Optional[PersonnelLeavePolicy] = Field(None, alias="leavePolicy")
    document_policy: Optional[PersonnelDocumentPolicy] = Field(None, alias="documentPolicy")


class AdminPersonnelTenantSummary(AppBaseModel):
    tenant_id: str = Field(..., alias="tenantId")
    tenant_name: str = Field(..., alias="tenantName")
    personnel_enabled: bool = Field(..., alias="personnelEnabled")
    linked_user_required: bool = Field(..., alias="linkedUserRequired")
    user_count: int = Field(..., alias="userCount")
    branch_count: int = Field(..., alias="branchCount")
    compensation_model: str = Field(..., alias="compensationModel")
    collection_rule: str = Field(..., alias="collectionRule")
    calculation_offset_days: int = Field(..., alias="calculationOffsetDays")


class AdminPersonnelOverviewResponse(AppBaseModel):
    total_tenants: int = Field(..., alias="totalTenants")
    active_rules: int = Field(..., alias="activeRules")
    linked_user_required_count: int = Field(..., alias="linkedUserRequiredCount")
    tenants: list[AdminPersonnelTenantSummary]
