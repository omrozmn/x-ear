import copy

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from models.tenant import Tenant
from models.user import User
from schemas.base import ApiError, ResponseEnvelope
from schemas.personnel import (
    AdminPersonnelOverviewResponse,
    AdminPersonnelTenantSummary,
    PersonnelCompensationRecord,
    PersonnelDocumentRecord,
    PersonnelEmployee,
    PersonnelLeaveRecord,
    PersonnelOverviewKpi,
    PersonnelOverviewResponse,
    PersonnelSettingsResponse,
    PersonnelSettingsUpdate,
)
from services.personnel_compensation_service import calculate_compensation_rows

router = APIRouter(tags=["Personnel"])

DEFAULT_PERSONNEL_SETTINGS = {
    "linkedUserRequired": True,
    "compensation": {
        "periodMode": "previous_month",
        "calculationOffsetDays": 15,
        "modelType": "fixed_rate",
        "baseRate": 3.0,
        "targetEnabled": False,
        "targetAmount": None,
        "collectionRule": "full_collection_only",
        "tiers": [
            {"threshold": 250000.0, "rate": 3.5},
            {"threshold": 500000.0, "rate": 4.0},
        ],
    },
    "leavePolicy": {
        "annualEntitlementDays": 14,
        "carryOverEnabled": True,
        "leaveTypes": ["Yillik Izin", "Mazeret Izni", "Rapor", "Ucretsiz Izin"],
    },
    "documentPolicy": {
        "requiredDocumentTypes": [
            "Is Sozlesmesi",
            "Kimlik Fotokopisi",
            "Banka Formu",
            "KVKK Acik Riza",
        ],
        "expiringDocumentTypes": ["Saglik Raporu", "Surucu Belgesi"],
        "reminderDaysBeforeExpiry": 15,
    },
}

DEFAULT_LEAVE_RECORDS = [
    {
        "id": "leave_default_1",
        "employeeId": "placeholder",
        "employeeName": "Atanmamis Personel",
        "leaveType": "Yillik Izin",
        "startDate": "2026-03-18",
        "endDate": "2026-03-20",
        "dayCount": 3,
        "status": "Onay Bekliyor",
        "approver": "Sube Yoneticisi",
    }
]

DEFAULT_DOCUMENT_RECORDS = [
    {
        "id": "document_default_1",
        "employeeId": "placeholder",
        "employeeName": "Atanmamis Personel",
        "documentType": "Saglik Raporu",
        "status": "Suresi Yaklasiyor",
        "validUntil": "2026-03-28",
        "branchName": "Merkez",
    }
]


def _get_tenant(access: UnifiedAccess, db: Session) -> Tenant:
    tenant_id = access.tenant_id or getattr(access.user, "tenant_id", None)
    if not tenant_id:
        raise HTTPException(
            status_code=400,
            detail=ApiError(message="Tenant baglami bulunamadi", code="NO_TENANT").model_dump(mode="json"),
        )

    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=404,
            detail=ApiError(message="Tenant bulunamadi", code="TENANT_NOT_FOUND").model_dump(mode="json"),
        )
    return tenant


def _get_personnel_settings(tenant: Tenant) -> dict:
    settings = tenant.settings or {}
    stored = settings.get("personnel_management") or {}
    merged = copy.deepcopy(DEFAULT_PERSONNEL_SETTINGS)
    for key, value in stored.items():
        if isinstance(value, dict) and isinstance(merged.get(key), dict):
            merged[key].update(value)
        else:
            merged[key] = value
    return merged


def _store_personnel_settings(tenant: Tenant, payload: dict) -> None:
    settings = tenant.settings or {}
    settings["personnel_management"] = payload
    tenant.settings = settings


def _list_tenant_users(access: UnifiedAccess, db: Session) -> list[User]:
    query = db.query(User).filter(User.tenant_id == access.tenant_id)
    return query.order_by(User.first_name.asc(), User.last_name.asc(), User.username.asc()).all()


def _employee_name(user: User) -> str:
    full_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return full_name or user.username or user.email


def _premium_profile_label(settings: dict) -> str:
    compensation = settings.get("compensation", {})
    target_enabled = bool(compensation.get("targetEnabled"))
    model_type = compensation.get("modelType") or "fixed_rate"
    if target_enabled and model_type == "tiered":
        return "Hedef + Kademeli"
    if target_enabled:
        return "Hedef + Sabit"
    if model_type == "tiered":
        return "Kademeli"
    return "Sabit Yuzde"


def _build_employee_rows(users: list[User], settings: dict) -> list[PersonnelEmployee]:
    premium_profile = _premium_profile_label(settings)
    rows: list[PersonnelEmployee] = []
    for user in users:
        rows.append(
            PersonnelEmployee(
                id=user.id,
                fullName=_employee_name(user),
                linkedUserId=user.id,
                linkedUser=user.username,
                email=user.email,
                role=user.role,
                branchNames=[branch.name for branch in user.branches],
                status="active" if user.is_active else "passive",
                hiredAt=user.created_at,
                lastLogin=user.last_login,
                premiumProfile=premium_profile,
            )
        )
    return rows


def _fallback_employee(users: list[User]) -> dict:
    if not users:
        return {"id": "placeholder", "name": "Atanmamis Personel", "username": None, "branch": "Merkez"}
    user = users[0]
    return {
        "id": user.id,
        "name": _employee_name(user),
        "username": user.username,
        "branch": user.branches[0].name if user.branches else "Merkez",
    }


def _build_leave_rows(users: list[User], tenant: Tenant) -> list[PersonnelLeaveRecord]:
    settings = tenant.settings or {}
    records = copy.deepcopy(settings.get("personnel_leave_records") or DEFAULT_LEAVE_RECORDS)
    fallback = _fallback_employee(users)
    for record in records:
        if record.get("employeeId") == "placeholder":
            record["employeeId"] = fallback["id"]
        if record.get("employeeName") == "Atanmamis Personel":
            record["employeeName"] = fallback["name"]
    return [PersonnelLeaveRecord.model_validate(record) for record in records]


def _build_document_rows(users: list[User], tenant: Tenant) -> list[PersonnelDocumentRecord]:
    settings = tenant.settings or {}
    records = copy.deepcopy(settings.get("personnel_document_records") or DEFAULT_DOCUMENT_RECORDS)
    fallback = _fallback_employee(users)
    for record in records:
        if record.get("employeeId") == "placeholder":
            record["employeeId"] = fallback["id"]
        if record.get("employeeName") == "Atanmamis Personel":
            record["employeeName"] = fallback["name"]
        if record.get("branchName") == "Merkez":
            record["branchName"] = fallback["branch"]
    return [PersonnelDocumentRecord.model_validate(record) for record in records]
def _build_compensation_rows(db: Session, users: list[User], tenant: Tenant) -> list[PersonnelCompensationRecord]:
    settings = _get_personnel_settings(tenant)
    rows = calculate_compensation_rows(db, tenant.id, users, settings)
    return [
        PersonnelCompensationRecord(
            id=f"comp_{row.employee_id}",
            employeeId=row.employee_id,
            employeeName=row.employee_name,
            linkedUserId=row.linked_user_id,
            linkedUser=row.linked_user,
            periodLabel=row.period_label,
            calculationDate=row.calculation_date,
            modelType=row.model_type,
            collectionRule=row.collection_rule,
            targetAmount=row.target_amount,
            rateSummary=row.rate_summary,
            salesTotal=row.sales_total,
            accruedPremium=row.accrued_premium,
            payrollStatus=row.payroll_status,
        )
        for row in rows
    ]


def _build_overview(
    employees: list[PersonnelEmployee],
    leaves: list[PersonnelLeaveRecord],
    documents: list[PersonnelDocumentRecord],
    compensation_rows: list[PersonnelCompensationRecord],
) -> PersonnelOverviewResponse:
    active_count = sum(1 for employee in employees if employee.status == "active")
    linked_count = sum(1 for employee in employees if employee.linked_user_id)
    pending_leaves = sum(1 for leave in leaves if leave.status.lower() == "onay bekliyor")
    expiring_documents = sum(1 for document in documents if document.status.lower() == "suresi yaklasiyor")
    ready_compensations = sum(1 for row in compensation_rows if row.payroll_status == "Aktarima Hazir")

    return PersonnelOverviewResponse(
        employees=[
            PersonnelOverviewKpi(key="total", label="Toplam Personel", value=str(len(employees))),
            PersonnelOverviewKpi(key="active", label="Aktif Personel", value=str(active_count)),
            PersonnelOverviewKpi(key="linked", label="Bagli Kullanici", value=str(linked_count)),
        ],
        leave=[
            PersonnelOverviewKpi(key="pending", label="Bekleyen Talep", value=str(pending_leaves)),
            PersonnelOverviewKpi(key="total", label="Toplam Talep", value=str(len(leaves))),
        ],
        documents=[
            PersonnelOverviewKpi(key="missing", label="Eksik Evrak", value=str(sum(1 for document in documents if document.status.lower() == "eksik"))),
            PersonnelOverviewKpi(key="expiring", label="Suresi Yaklasan", value=str(expiring_documents)),
        ],
        compensation=[
            PersonnelOverviewKpi(key="ready", label="Aktarima Hazir", value=str(ready_compensations)),
            PersonnelOverviewKpi(
                key="total",
                label="Toplam Prim",
                value=f"{int(sum(row.accrued_premium for row in compensation_rows))} TL",
            ),
        ],
    )


@router.get("/personnel/overview", operation_id="getPersonnelOverview", response_model=ResponseEnvelope[PersonnelOverviewResponse])
def get_personnel_overview(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant = _get_tenant(access, db)
    settings = _get_personnel_settings(tenant)
    users = _list_tenant_users(access, db)
    employees = _build_employee_rows(users, settings)
    leaves = _build_leave_rows(users, tenant)
    documents = _build_document_rows(users, tenant)
    compensation_rows = _build_compensation_rows(db, users, tenant)
    return ResponseEnvelope(data=_build_overview(employees, leaves, documents, compensation_rows))


@router.get("/personnel/employees", operation_id="listPersonnelEmployees", response_model=ResponseEnvelope[list[PersonnelEmployee]])
def list_personnel_employees(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant = _get_tenant(access, db)
    users = _list_tenant_users(access, db)
    settings = _get_personnel_settings(tenant)
    return ResponseEnvelope(data=_build_employee_rows(users, settings))


@router.get("/personnel/leave", operation_id="listPersonnelLeave", response_model=ResponseEnvelope[list[PersonnelLeaveRecord]])
def list_personnel_leave(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant = _get_tenant(access, db)
    users = _list_tenant_users(access, db)
    return ResponseEnvelope(data=_build_leave_rows(users, tenant))


@router.get("/personnel/documents", operation_id="listPersonnelDocuments", response_model=ResponseEnvelope[list[PersonnelDocumentRecord]])
def list_personnel_documents(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant = _get_tenant(access, db)
    users = _list_tenant_users(access, db)
    return ResponseEnvelope(data=_build_document_rows(users, tenant))


@router.get("/personnel/compensation", operation_id="listPersonnelCompensation", response_model=ResponseEnvelope[list[PersonnelCompensationRecord]])
def list_personnel_compensation(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant = _get_tenant(access, db)
    users = _list_tenant_users(access, db)
    return ResponseEnvelope(data=_build_compensation_rows(db, users, tenant))


@router.get("/personnel/settings", operation_id="getPersonnelSettings", response_model=ResponseEnvelope[PersonnelSettingsResponse])
def get_personnel_settings(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant = _get_tenant(access, db)
    return ResponseEnvelope(data=PersonnelSettingsResponse.model_validate(_get_personnel_settings(tenant)))


@router.put("/personnel/settings", operation_id="updatePersonnelSettings", response_model=ResponseEnvelope[PersonnelSettingsResponse])
def update_personnel_settings(
    payload: PersonnelSettingsUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant = _get_tenant(access, db)
    current = _get_personnel_settings(tenant)
    incoming = payload.model_dump(mode="json", by_alias=True, exclude_none=True)
    for key, value in incoming.items():
        if isinstance(value, dict) and isinstance(current.get(key), dict):
            current[key].update(value)
        else:
            current[key] = value
    _store_personnel_settings(tenant, current)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return ResponseEnvelope(data=PersonnelSettingsResponse.model_validate(_get_personnel_settings(tenant)))


@router.get("/admin/personnel/overview", operation_id="getAdminPersonnelOverview", response_model=ResponseEnvelope[AdminPersonnelOverviewResponse])
def get_admin_personnel_overview(
    access: UnifiedAccess = Depends(require_access(admin_only=True)),
    db: Session = Depends(get_db),
):
    tenants = db.query(Tenant).order_by(Tenant.name.asc()).all()
    tenant_rows: list[AdminPersonnelTenantSummary] = []

    for tenant in tenants:
        settings = _get_personnel_settings(tenant)
        user_count = db.query(User).filter(User.tenant_id == tenant.id).count()
        branch_count = int(tenant.current_branches or 0)
        compensation = settings["compensation"]
        tenant_rows.append(
            AdminPersonnelTenantSummary(
                tenantId=tenant.id,
                tenantName=tenant.name,
                personnelEnabled=bool((tenant.settings or {}).get("personnel_management")),
                linkedUserRequired=bool(settings.get("linkedUserRequired", True)),
                userCount=user_count,
                branchCount=branch_count,
                compensationModel=compensation.get("modelType") or "fixed_rate",
                collectionRule=compensation.get("collectionRule") or "full_collection_only",
                calculationOffsetDays=int(compensation.get("calculationOffsetDays") or 0),
            )
        )

    return ResponseEnvelope(
        data=AdminPersonnelOverviewResponse(
            totalTenants=len(tenant_rows),
            activeRules=sum(1 for tenant in tenant_rows if tenant.personnel_enabled),
            linkedUserRequiredCount=sum(1 for tenant in tenant_rows if tenant.linked_user_required),
            tenants=tenant_rows,
        )
    )
