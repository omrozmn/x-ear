from fastapi import APIRouter
from typing import Union, List
from schemas.base import ResponseEnvelope

# Import all missing schemas
from schemas.sales import DeviceAssignmentUpdate, InstallmentPayment, PaymentPlanCreate
from schemas.auth import PasswordChangeRequest
from schemas.patients import PatientSearchFilters
from schemas.users import PermissionRead, UserProfile
from schemas.sms import SMSHeaderRequestUpdate, SMSProviderConfigCreate
from schemas.campaigns import SMSLogRead
from schemas.tenants import TenantStats

router = APIRouter(tags=["Developer"])

# Define a Union of all missing types to force their inclusion in OpenAPI components
RegistryType = Union[
    DeviceAssignmentUpdate,
    InstallmentPayment,
    PasswordChangeRequest,
    PatientSearchFilters,
    PaymentPlanCreate,
    PermissionRead,
    SMSHeaderRequestUpdate,
    SMSLogRead,
    SMSProviderConfigCreate,
    TenantStats,
    UserProfile
]

@router.get("/developer/schema-registry", response_model=ResponseEnvelope[List[RegistryType]])
def schema_registry():
    """
    This endpoint exists solely to force Pydantic to generate OpenAPI schemas 
    for models that are required by the frontend/SDK but not yet used 
    in active API endpoints.
    """
    return ResponseEnvelope(data=[])
