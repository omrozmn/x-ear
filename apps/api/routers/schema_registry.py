from fastapi import APIRouter
from typing import Union, List, Optional
from schemas.base import ResponseEnvelope, AppBaseModel

# Import all missing schemas
from schemas.sales import DeviceAssignmentUpdate, InstallmentPayment, PaymentPlanCreate
from schemas.auth import PasswordChangeRequest
from schemas.parties import PartySearchFilters
from schemas.users import UserPermissionRead, UserRoleRead, UserProfile
from schemas.sms import SmsHeaderRequestUpdate, SmsProviderConfigCreate
from schemas.campaigns import SmsLogRead
from schemas.tenants import TenantStats

router = APIRouter(tags=["Developer"])

# Define a structured model to hold all types
class SchemaRegistryResponse(AppBaseModel):
    device_assignment_update: Optional[DeviceAssignmentUpdate] = None
    installment_payment: Optional[InstallmentPayment] = None
    password_change_request: Optional[PasswordChangeRequest] = None
    party_search_filters: Optional[PartySearchFilters] = None
    payment_plan_create: Optional[PaymentPlanCreate] = None
    user_permission_read: Optional[UserPermissionRead] = None
    user_role_read: Optional[UserRoleRead] = None
    sms_header_request_update: Optional[SmsHeaderRequestUpdate] = None
    sms_log_read: Optional[SmsLogRead] = None
    sms_provider_config_create: Optional[SmsProviderConfigCreate] = None
    tenant_stats: Optional[TenantStats] = None
    user_profile: Optional[UserProfile] = None

@router.get("/developer/schema-registry", operation_id="listDeveloperSchemaRegistry", response_model=ResponseEnvelope[SchemaRegistryResponse])
def schema_registry():
    """
    This endpoint exists solely to force Pydantic to generate OpenAPI schemas 
    for models that are required by the frontend/SDK but not yet used 
    in active API endpoints.
    
    By using a structured model instead of a Union, we avoid excessively 
    long auto-generated filenames in the frontend.
    """
    return ResponseEnvelope(data=SchemaRegistryResponse())
