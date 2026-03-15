"""UTS schemas."""
from datetime import datetime
from typing import Optional, List, Dict, Any, Literal

from pydantic import Field

from .base import AppBaseModel


UtsEnvironment = Literal["test", "prod"]
UtsAuthScheme = Literal["auto", "bearer", "plain_authorization", "uts_token", "x_uts_token", "token"]
UtsSerialStatus = Literal["owned", "pending_receipt", "not_owned"]


class BulkRegistration(AppBaseModel):
    device_ids: List[str]
    priority: Optional[str] = "normal"


class UtsRegistrationListResponse(AppBaseModel):
    success: bool
    data: List[Any]
    meta: Dict[str, Any]


class UtsJobStartResponse(AppBaseModel):
    success: bool
    data: Dict[str, str]
    message: str


class UtsJobStatusResponse(AppBaseModel):
    success: bool
    data: Dict[str, Any]


class UtsCancelResponse(AppBaseModel):
    success: bool
    message: str


class UtsConfigUpdate(AppBaseModel):
    enabled: bool = False
    environment: UtsEnvironment = "test"
    auth_scheme: UtsAuthScheme = "uts_token"
    token: Optional[str] = None
    company_code: Optional[str] = None
    member_number: Optional[str] = None
    auto_send_notifications: bool = False
    notification_mode: Literal["manual", "outbox"] = "outbox"
    base_url_override: Optional[str] = None
    notification_templates: Dict[str, "UtsMessageTemplate"] = Field(default_factory=dict, alias="notificationTemplates")
    auto_add_to_inventory_on_alma: bool = Field(default=False, alias="autoAddToInventoryOnAlma")
    auto_decrease_stock_on_verme: bool = Field(default=False, alias="autoDecreaseStockOnVerme")


class UtsConnectionTestResult(AppBaseModel):
    ok: bool
    http_status: Optional[int] = Field(default=None, alias="httpStatus")
    message: str
    token_valid: Optional[bool] = Field(default=None, alias="tokenValid")
    tested_url: str = Field(alias="testedUrl")
    tested_at: datetime = Field(alias="testedAt")
    auth_scheme_used: Optional[str] = Field(default=None, alias="authSchemeUsed")
    raw_error_code: Optional[str] = Field(default=None, alias="rawErrorCode")
    raw_response: Optional[str] = Field(default=None, alias="rawResponse")


class UtsSyncStatus(AppBaseModel):
    enabled: bool
    interval_minutes: int = Field(alias="intervalMinutes")
    last_sync_at: Optional[datetime] = Field(default=None, alias="lastSyncAt")
    last_sync_message: Optional[str] = Field(default=None, alias="lastSyncMessage")
    last_sync_ok: Optional[bool] = Field(default=None, alias="lastSyncOk")
    synced_records: int = Field(default=0, alias="syncedRecords")


class UtsConfigRead(AppBaseModel):
    enabled: bool = False
    environment: UtsEnvironment = "test"
    auth_scheme: UtsAuthScheme = "uts_token"
    base_url: str = Field(alias="baseUrl")
    token_configured: bool = Field(alias="tokenConfigured")
    token_masked: str = Field(alias="tokenMasked")
    company_code: Optional[str] = Field(default=None, alias="companyCode")
    company_code_source: Optional[str] = Field(default=None, alias="companyCodeSource")
    member_number: Optional[str] = Field(default=None, alias="memberNumber")
    member_number_source: Optional[str] = Field(default=None, alias="memberNumberSource")
    identity_discovery_supported: bool = Field(default=False, alias="identityDiscoverySupported")
    identity_discovery_status: str = Field(default="tenant_company_info_fallback", alias="identityDiscoveryStatus")
    auto_send_notifications: bool = Field(default=False, alias="autoSendNotifications")
    notification_mode: Literal["manual", "outbox"] = Field(default="outbox", alias="notificationMode")
    documentation_url: str = Field(alias="documentationUrl")
    test_endpoint_url: str = Field(alias="testEndpointUrl")
    last_test: Optional[UtsConnectionTestResult] = Field(default=None, alias="lastTest")
    public_ip: Optional[str] = Field(default=None, alias="publicIp")
    public_ip_detected_at: Optional[datetime] = Field(default=None, alias="publicIpDetectedAt")
    token_setup_steps: List[str] = Field(default_factory=list, alias="tokenSetupSteps")
    notification_templates: Dict[str, "UtsMessageTemplate"] = Field(default_factory=dict, alias="notificationTemplates")
    auto_add_to_inventory_on_alma: bool = Field(default=False, alias="autoAddToInventoryOnAlma")
    auto_decrease_stock_on_verme: bool = Field(default=False, alias="autoDecreaseStockOnVerme")
    sync: UtsSyncStatus = Field(alias="sync")


class UtsMessageChannels(AppBaseModel):
    sms: bool = False
    whatsapp: bool = False
    email: bool = False


class UtsMessageTemplate(AppBaseModel):
    enabled: bool = False
    template_name: str = Field(alias="templateName")
    subject: Optional[str] = None
    body_text: str = Field(alias="bodyText")
    variables: List[str] = Field(default_factory=list)
    channels: UtsMessageChannels = Field(default_factory=UtsMessageChannels)


class UtsTekilUrunQueryRequest(AppBaseModel):
    product_number: str = Field(alias="productNumber")
    serial_number: Optional[str] = Field(default=None, alias="serialNumber")
    lot_batch_number: Optional[str] = Field(default=None, alias="lotBatchNumber")


class UtsTekilUrunRecord(AppBaseModel):
    product_number: str = Field(alias="productNumber")
    serial_number: Optional[str] = Field(default=None, alias="serialNumber")
    lot_batch_number: Optional[str] = Field(default=None, alias="lotBatchNumber")
    quantity: Optional[int] = None
    available_quantity: Optional[int] = Field(default=None, alias="availableQuantity")
    product_name: Optional[str] = Field(default=None, alias="productName")
    manufacture_date: Optional[str] = Field(default=None, alias="manufactureDate")
    import_date: Optional[str] = Field(default=None, alias="importDate")
    expiry_date: Optional[str] = Field(default=None, alias="expiryDate")
    owner_institution_number: Optional[str] = Field(default=None, alias="ownerInstitutionNumber")
    manufacturer_institution_number: Optional[str] = Field(default=None, alias="manufacturerInstitutionNumber")
    raw: Dict[str, Any] = Field(default_factory=dict)


class UtsTekilUrunQueryResponse(AppBaseModel):
    success: bool
    items: List[UtsTekilUrunRecord]
    message: Optional[str] = None
    is_owned: Optional[bool] = Field(default=None, alias="isOwned")
    our_member_number: Optional[str] = Field(default=None, alias="ourMemberNumber")
    queried_product_numbers: List[str] = Field(default_factory=list, alias="queriedProductNumbers")
    raw_response: Optional[Dict[str, Any]] = Field(default=None, alias="rawResponse")


class UtsVermeDraftRequest(AppBaseModel):
    inventory_id: Optional[str] = Field(default=None, alias="inventoryId")
    inventory_name: Optional[str] = Field(default=None, alias="inventoryName")
    product_name: Optional[str] = Field(default=None, alias="productName")
    supplier_name: Optional[str] = Field(default=None, alias="supplierName")
    supplier_id: Optional[str] = Field(default=None, alias="supplierId")
    product_number: str = Field(alias="productNumber")
    serial_number: Optional[str] = Field(default=None, alias="serialNumber")
    lot_batch_number: Optional[str] = Field(default=None, alias="lotBatchNumber")
    quantity: int = 1
    recipient_institution_number: str = Field(alias="recipientInstitutionNumber")
    document_number: str = Field(alias="documentNumber")


class UtsVermeDraftResponse(AppBaseModel):
    success: bool
    payload: Dict[str, Any]
    message: Optional[str] = None


class UtsAlmaRequest(AppBaseModel):
    inventory_id: Optional[str] = Field(default=None, alias="inventoryId")
    inventory_name: Optional[str] = Field(default=None, alias="inventoryName")
    product_name: Optional[str] = Field(default=None, alias="productName")
    supplier_name: Optional[str] = Field(default=None, alias="supplierName")
    supplier_id: Optional[str] = Field(default=None, alias="supplierId")
    product_number: str = Field(alias="productNumber")
    serial_number: Optional[str] = Field(default=None, alias="serialNumber")
    lot_batch_number: Optional[str] = Field(default=None, alias="lotBatchNumber")
    quantity: int = 1
    source_institution_number: Optional[str] = Field(default=None, alias="sourceInstitutionNumber")
    document_number: Optional[str] = Field(default=None, alias="documentNumber")


class UtsSerialState(AppBaseModel):
    serial_key: str = Field(alias="serialKey")
    status: UtsSerialStatus
    inventory_id: Optional[str] = Field(default=None, alias="inventoryId")
    inventory_name: Optional[str] = Field(default=None, alias="inventoryName")
    product_name: Optional[str] = Field(default=None, alias="productName")
    product_number: Optional[str] = Field(default=None, alias="productNumber")
    serial_number: Optional[str] = Field(default=None, alias="serialNumber")
    lot_batch_number: Optional[str] = Field(default=None, alias="lotBatchNumber")
    supplier_name: Optional[str] = Field(default=None, alias="supplierName")
    supplier_id: Optional[str] = Field(default=None, alias="supplierId")
    institution_number: Optional[str] = Field(default=None, alias="institutionNumber")
    document_number: Optional[str] = Field(default=None, alias="documentNumber")
    last_movement_type: Optional[str] = Field(default=None, alias="lastMovementType")
    last_movement_id: Optional[str] = Field(default=None, alias="lastMovementId")
    last_message: Optional[str] = Field(default=None, alias="lastMessage")
    last_movement_at: Optional[datetime] = Field(default=None, alias="lastMovementAt")
    updated_at: Optional[datetime] = Field(default=None, alias="updatedAt")
    raw_response: Optional[str] = Field(default=None, alias="rawResponse")


class UtsSerialStateListResponse(AppBaseModel):
    success: bool
    items: List[UtsSerialState]
    total: int


class UtsSerialStateUpsertRequest(AppBaseModel):
    status: UtsSerialStatus
    inventory_id: Optional[str] = Field(default=None, alias="inventoryId")
    inventory_name: Optional[str] = Field(default=None, alias="inventoryName")
    product_name: Optional[str] = Field(default=None, alias="productName")
    product_number: Optional[str] = Field(default=None, alias="productNumber")
    serial_number: Optional[str] = Field(default=None, alias="serialNumber")
    lot_batch_number: Optional[str] = Field(default=None, alias="lotBatchNumber")
    supplier_name: Optional[str] = Field(default=None, alias="supplierName")
    supplier_id: Optional[str] = Field(default=None, alias="supplierId")
    institution_number: Optional[str] = Field(default=None, alias="institutionNumber")
    document_number: Optional[str] = Field(default=None, alias="documentNumber")
    last_message: Optional[str] = Field(default=None, alias="lastMessage")
    last_movement_type: Optional[str] = Field(default=None, alias="lastMovementType")
    raw_response: Optional[str] = Field(default=None, alias="rawResponse")


class UtsMovementExecuteResponse(AppBaseModel):
    success: bool
    uts_success: bool = Field(alias="utsSuccess")
    http_status: Optional[int] = Field(default=None, alias="httpStatus")
    message: str
    movement_type: str = Field(alias="movementType")
    movement_id: Optional[str] = Field(default=None, alias="movementId")
    state: Optional[UtsSerialState] = None
    raw_response: Optional[str] = Field(default=None, alias="rawResponse")


class UtsAlmaBekleyenlerSyncResponse(AppBaseModel):
    success: bool
    synced: int
    total: int
    message: Optional[str] = None


class UtsAddToInventoryRequest(AppBaseModel):
    serial_key: str = Field(alias="serialKey")
    brand: Optional[str] = None
    model: Optional[str] = None


class UtsAddToInventoryResponse(AppBaseModel):
    success: bool
    message: Optional[str] = None
    inventory_id: Optional[str] = Field(default=None, alias="inventoryId")
    created: bool = False
    serial_added: bool = Field(default=False, alias="serialAdded")
    stock_updated: bool = Field(default=False, alias="stockUpdated")
    barcode_updated: bool = Field(default=False, alias="barcodeUpdated")


UtsConfigUpdate.model_rebuild()
UtsConfigRead.model_rebuild()
