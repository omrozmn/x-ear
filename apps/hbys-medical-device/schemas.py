"""
Medical Device Service Schemas (Pydantic v2)
Full CRUD schemas for device registry, device data, and device alerts.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import Field

from hbys_common.schemas import AppBaseModel


# ─── Device Registry Schemas ──────────────────────────────────────────────────


class DeviceRegistryCreate(AppBaseModel):
    device_name: str = Field(..., max_length=200, description="Human-readable device name")
    device_type: str = Field(
        "other",
        description="analyzer/monitor/ventilator/infusion_pump/ecg/defibrillator/xray/ultrasound/other",
    )
    manufacturer: Optional[str] = Field(None, max_length=200)
    model_number: Optional[str] = Field(None, max_length=100)
    serial_number: str = Field(..., max_length=100, description="Unique device serial number")
    location: Optional[str] = Field(None, max_length=200, description="Physical location")
    ip_address: Optional[str] = Field(None, max_length=45)
    port: Optional[int] = Field(None, ge=1, le=65535)
    connection_type: str = Field(
        "tcp", description="serial/tcp/hl7_mllp/dicom/http/usb"
    )
    communication_protocol: str = Field(
        "hl7v2", description="hl7v2/astm/dicom/proprietary/fhir"
    )
    baud_rate: Optional[int] = Field(None, description="Serial baud rate (e.g., 9600)")
    data_bits: Optional[int] = Field(None, description="Serial data bits (e.g., 8)")
    calibration_date: Optional[datetime] = None
    next_calibration_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = None


class DeviceRegistryUpdate(AppBaseModel):
    device_name: Optional[str] = Field(None, max_length=200)
    device_type: Optional[str] = None
    manufacturer: Optional[str] = Field(None, max_length=200)
    model_number: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=200)
    ip_address: Optional[str] = Field(None, max_length=45)
    port: Optional[int] = Field(None, ge=1, le=65535)
    connection_type: Optional[str] = None
    communication_protocol: Optional[str] = None
    baud_rate: Optional[int] = None
    data_bits: Optional[int] = None
    status: Optional[str] = None
    calibration_date: Optional[datetime] = None
    next_calibration_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = None


class DeviceRegistryRead(AppBaseModel):
    id: str
    device_name: str
    device_type: str
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: str
    location: Optional[str] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    connection_type: str
    communication_protocol: str
    baud_rate: Optional[int] = None
    data_bits: Optional[int] = None
    status: str
    last_seen_at: Optional[datetime] = None
    calibration_date: Optional[datetime] = None
    next_calibration_date: Optional[datetime] = None
    warranty_expiry: Optional[datetime] = None
    notes: Optional[str] = None
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DeviceRegistrySummary(AppBaseModel):
    """Lightweight device summary for list endpoints."""
    id: str
    device_name: str
    device_type: str
    serial_number: str
    location: Optional[str] = None
    status: str
    last_seen_at: Optional[datetime] = None
    connection_type: str


class DeviceListResponse(AppBaseModel):
    items: List[DeviceRegistrySummary] = Field(default_factory=list)
    total: int = 0


# ─── Device Data Schemas ─────────────────────────────────────────────────────


class DeviceDataCreate(AppBaseModel):
    device_id: str = Field(..., description="Device registry ID")
    patient_id: Optional[str] = None
    data_type: str = Field(
        "lab_result",
        description="lab_result/vital_sign/waveform/image/ecg/report",
    )
    raw_message: str = Field(..., description="Raw message from device")
    parsed_data: Optional[str] = Field(None, description="Parsed JSON data")
    linked_order_id: Optional[str] = None


class DeviceDataRead(AppBaseModel):
    id: str
    device_id: str
    patient_id: Optional[str] = None
    data_type: str
    raw_message: str
    parsed_data: Optional[str] = None
    received_at: Optional[datetime] = None
    processed: bool = False
    processing_error: Optional[str] = None
    linked_order_id: Optional[str] = None
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DeviceDataListResponse(AppBaseModel):
    items: List[DeviceDataRead] = Field(default_factory=list)
    total: int = 0


# ─── Device Alert Schemas ────────────────────────────────────────────────────


class DeviceAlertCreate(AppBaseModel):
    device_id: str
    alert_type: str = Field(
        ...,
        description="offline/error/calibration_due/warranty_expiry/communication_failure/data_error",
    )
    severity: str = Field("info", description="info/warning/critical")
    message: str


class DeviceAlertResolve(AppBaseModel):
    resolved_by: str = Field(..., description="User ID resolving the alert")


class DeviceAlertRead(AppBaseModel):
    id: str
    device_id: str
    alert_type: str
    severity: str
    message: str
    resolved: bool = False
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    tenant_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class DeviceAlertListResponse(AppBaseModel):
    items: List[DeviceAlertRead] = Field(default_factory=list)
    total: int = 0


# ─── Connection Test Schemas ─────────────────────────────────────────────────


class ConnectionTestResult(AppBaseModel):
    success: bool
    message: str
    protocol: Optional[str] = None
    details: Optional[Dict[str, Any]] = None


# ─── Send Command Schema ────────────────────────────────────────────────────


class DeviceCommand(AppBaseModel):
    command: str = Field(..., description="Command/message to send to device")
    timeout: Optional[float] = Field(None, ge=1, le=300, description="Timeout in seconds")
    wait_response: bool = Field(True, description="Whether to wait for device response")


class DeviceCommandResult(AppBaseModel):
    success: bool
    sent: str
    response: Optional[str] = None
    error: Optional[str] = None


# ─── Dashboard Schema ───────────────────────────────────────────────────────


class DeviceDashboard(AppBaseModel):
    total_devices: int = 0
    online_count: int = 0
    offline_count: int = 0
    error_count: int = 0
    maintenance_count: int = 0
    devices_by_type: Dict[str, int] = Field(default_factory=dict)
    unresolved_alerts: int = 0
    critical_alerts: int = 0
    calibration_due_count: int = 0
    warranty_expiry_soon_count: int = 0
    recent_data_count: int = 0


# ─── Listener Schemas ───────────────────────────────────────────────────────


class ListenerStatus(AppBaseModel):
    device_id: str
    device_name: str
    is_running: bool
    started_at: Optional[datetime] = None
    messages_received: int = 0
    last_message_at: Optional[datetime] = None
    errors: int = 0
