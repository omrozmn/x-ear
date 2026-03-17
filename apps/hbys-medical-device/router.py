"""
Medical Device Router - FastAPI endpoints for device management,
data ingestion, connection testing, command sending, alerts, and dashboard.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from hbys_common.auth import get_current_user, CurrentUser
from hbys_common.schemas import ResponseEnvelope

import service
from listener_service import listener_manager
from schemas import (
    DeviceRegistryCreate,
    DeviceRegistryUpdate,
    DeviceRegistryRead,
    DeviceListResponse,
    DeviceDataCreate,
    DeviceDataRead,
    DeviceDataListResponse,
    DeviceAlertCreate,
    DeviceAlertResolve,
    DeviceAlertRead,
    DeviceAlertListResponse,
    ConnectionTestResult,
    DeviceCommand,
    DeviceCommandResult,
    DeviceDashboard,
    ListenerStatus,
)

router = APIRouter(prefix="/api/hbys/medical-devices", tags=["HBYS - Medical Devices"])


# ─── DB Dependency ──────────────────────────────────────────────────────────

def get_db():
    """Lazy import to avoid circular dependency with main.py."""
    from main import get_db as _get_db
    yield from _get_db()


# ─── Dashboard ──────────────────────────────────────────────────────────────


@router.get(
    "/dashboard",
    response_model=ResponseEnvelope[DeviceDashboard],
    summary="Get device dashboard statistics",
)
def get_dashboard(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    dashboard = service.get_dashboard(db, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok(data=dashboard)


# ─── Device CRUD ─────────────────────────────────────────────────────────────


@router.post(
    "/",
    response_model=ResponseEnvelope[DeviceRegistryRead],
    status_code=status.HTTP_201_CREATED,
    summary="Register a new medical device",
)
def create_device(
    data: DeviceRegistryCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    device = service.create_device(db, data=data, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok(
        data=DeviceRegistryRead.model_validate(device),
    )


@router.get(
    "/",
    response_model=ResponseEnvelope[DeviceListResponse],
    summary="List registered devices",
)
def list_devices(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    device_type: Optional[str] = Query(None, description="Filter by device type"),
    device_status: Optional[str] = Query(None, alias="status", description="Filter by status"),
    search: Optional[str] = Query(None, max_length=200, description="Search by name/serial/manufacturer/location"),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.list_devices(
        db,
        tenant_id=user.tenant_id,
        skip=skip,
        limit=limit,
        device_type=device_type,
        status=device_status,
        search=search,
    )
    return ResponseEnvelope.ok(data=result)


@router.get(
    "/{device_id}",
    response_model=ResponseEnvelope[DeviceRegistryRead],
    summary="Get device details",
)
def get_device(
    device_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    device = service.get_device(db, device_id=device_id, tenant_id=user.tenant_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found.",
        )
    return ResponseEnvelope.ok(data=DeviceRegistryRead.model_validate(device))


@router.put(
    "/{device_id}",
    response_model=ResponseEnvelope[DeviceRegistryRead],
    summary="Update device",
)
def update_device(
    device_id: str,
    data: DeviceRegistryUpdate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    device = service.update_device(
        db, device_id=device_id, data=data, tenant_id=user.tenant_id
    )
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found.",
        )
    return ResponseEnvelope.ok(
        data=DeviceRegistryRead.model_validate(device),
    )


@router.delete(
    "/{device_id}",
    response_model=ResponseEnvelope,
    summary="Delete device",
)
def delete_device(
    device_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    deleted = service.delete_device(db, device_id=device_id, tenant_id=user.tenant_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found.",
        )
    return ResponseEnvelope.ok()


# ─── Connection Testing ─────────────────────────────────────────────────────


@router.post(
    "/{device_id}/test-connection",
    response_model=ResponseEnvelope[ConnectionTestResult],
    summary="Test device connection",
    description="Attempt to connect to the device using its configured driver.",
)
async def test_connection(
    device_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = await service.test_device_connection(
        db, device_id=device_id, tenant_id=user.tenant_id
    )
    return ResponseEnvelope.ok(data=result)


# ─── Send Command ───────────────────────────────────────────────────────────


@router.post(
    "/{device_id}/send-command",
    response_model=ResponseEnvelope[DeviceCommandResult],
    summary="Send command to device",
    description="Send a command or message to the device and optionally receive a response.",
)
async def send_command(
    device_id: str,
    data: DeviceCommand,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = await service.send_device_command(
        db,
        device_id=device_id,
        tenant_id=user.tenant_id,
        command=data.command,
        timeout=data.timeout,
        wait_response=data.wait_response,
    )
    return ResponseEnvelope.ok(data=result)


# ─── Device Data ─────────────────────────────────────────────────────────────


@router.post(
    "/data",
    response_model=ResponseEnvelope[DeviceDataRead],
    status_code=status.HTTP_201_CREATED,
    summary="Submit device data",
    description="Manually submit data received from a device. Auto-parsing is applied.",
)
def submit_device_data(
    data: DeviceDataCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    record = service.create_device_data(db, data=data, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok(
        data=DeviceDataRead.model_validate(record),
    )


@router.get(
    "/data/list",
    response_model=ResponseEnvelope[DeviceDataListResponse],
    summary="List device data records",
)
def list_device_data(
    device_id: Optional[str] = Query(None),
    patient_id: Optional[str] = Query(None),
    data_type: Optional[str] = Query(None),
    processed: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.list_device_data(
        db,
        tenant_id=user.tenant_id,
        device_id=device_id,
        patient_id=patient_id,
        data_type=data_type,
        processed=processed,
        skip=skip,
        limit=limit,
    )
    return ResponseEnvelope.ok(data=result)


@router.get(
    "/data/{data_id}",
    response_model=ResponseEnvelope[DeviceDataRead],
    summary="Get device data record",
)
def get_device_data(
    data_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    record = service.get_device_data(db, data_id=data_id, tenant_id=user.tenant_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device data '{data_id}' not found.",
        )
    return ResponseEnvelope.ok(data=DeviceDataRead.model_validate(record))


# ─── Alerts ──────────────────────────────────────────────────────────────────


@router.get(
    "/alerts/list",
    response_model=ResponseEnvelope[DeviceAlertListResponse],
    summary="List device alerts",
)
def list_alerts(
    device_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    resolved: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    result = service.list_alerts(
        db,
        tenant_id=user.tenant_id,
        device_id=device_id,
        severity=severity,
        resolved=resolved,
        skip=skip,
        limit=limit,
    )
    return ResponseEnvelope.ok(data=result)


@router.post(
    "/alerts",
    response_model=ResponseEnvelope[DeviceAlertRead],
    status_code=status.HTTP_201_CREATED,
    summary="Create a device alert",
)
def create_alert(
    data: DeviceAlertCreate,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    alert = service.create_alert(db, data=data, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok(
        data=DeviceAlertRead.model_validate(alert),
    )


@router.put(
    "/alerts/{alert_id}/resolve",
    response_model=ResponseEnvelope[DeviceAlertRead],
    summary="Resolve a device alert",
)
def resolve_alert(
    alert_id: str,
    data: DeviceAlertResolve,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    alert = service.resolve_alert(
        db, alert_id=alert_id, resolved_by=data.resolved_by, tenant_id=user.tenant_id
    )
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_id}' not found.",
        )
    return ResponseEnvelope.ok(
        data=DeviceAlertRead.model_validate(alert),
    )


@router.post(
    "/alerts/check-calibration",
    response_model=ResponseEnvelope,
    summary="Run calibration check",
    description="Scan all devices and create alerts for upcoming/overdue calibrations.",
)
def check_calibration(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    alerts = service.check_calibration_alerts(db, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok()


@router.post(
    "/alerts/check-warranty",
    response_model=ResponseEnvelope,
    summary="Run warranty check",
    description="Scan all devices and create alerts for upcoming/expired warranties.",
)
def check_warranty(
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    alerts = service.check_warranty_alerts(db, tenant_id=user.tenant_id)
    return ResponseEnvelope.ok()


# ─── Listener Management ────────────────────────────────────────────────────


@router.post(
    "/{device_id}/listener/start",
    response_model=ResponseEnvelope[ListenerStatus],
    summary="Start device listener",
    description="Start a background listener for incoming device data.",
)
async def start_listener(
    device_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    device = service.get_device(db, device_id=device_id, tenant_id=user.tenant_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Device '{device_id}' not found.",
        )

    # Use the app's session factory for background tasks
    from main import app
    session_factory = app.state.session_factory

    started = await listener_manager.start_listener(
        device=device,
        db_factory=session_factory,
        tenant_id=user.tenant_id,
    )
    if not started:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Listener already running or not applicable for this device type.",
        )

    info = listener_manager.get_listener_status(device_id)
    return ResponseEnvelope.ok(
        data=ListenerStatus(
            device_id=device_id,
            device_name=device.device_name,
            is_running=info.is_running if info else False,
            started_at=info.started_at if info else None,
            messages_received=info.messages_received if info else 0,
            last_message_at=info.last_message_at if info else None,
            errors=info.errors if info else 0,
        ),
    )


@router.post(
    "/{device_id}/listener/stop",
    response_model=ResponseEnvelope,
    summary="Stop device listener",
)
async def stop_listener(
    device_id: str,
    db: Session = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
):
    stopped = await listener_manager.stop_listener(device_id)
    if not stopped:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active listener found for this device.",
        )
    return ResponseEnvelope.ok()


@router.get(
    "/listeners/status",
    response_model=ResponseEnvelope[list],
    summary="Get all listener statuses",
)
def get_listener_statuses(
    user: CurrentUser = Depends(get_current_user),
):
    statuses = listener_manager.get_all_statuses()
    result = [
        ListenerStatus(
            device_id=info.device_id,
            device_name=info.device_name,
            is_running=info.is_running,
            started_at=info.started_at,
            messages_received=info.messages_received,
            last_message_at=info.last_message_at,
            errors=info.errors,
        )
        for info in statuses
    ]
    return ResponseEnvelope.ok(data=result)
