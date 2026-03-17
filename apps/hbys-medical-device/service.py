"""
Medical Device Service - Business logic for device management, data handling, and alerts.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from hbys_common.database import gen_id, now_utc
from models.device_registry import DeviceRegistry
from models.device_data import DeviceData
from models.device_alert import DeviceAlert
from schemas import (
    DeviceRegistryCreate,
    DeviceRegistryUpdate,
    DeviceRegistryRead,
    DeviceRegistrySummary,
    DeviceListResponse,
    DeviceDataCreate,
    DeviceDataRead,
    DeviceDataListResponse,
    DeviceAlertCreate,
    DeviceAlertRead,
    DeviceAlertListResponse,
    DeviceDashboard,
    ConnectionTestResult,
    DeviceCommandResult,
)
from parsers.hl7_parser import HL7Parser
from parsers.astm_parser import ASTMParser
from parsers.vital_parser import VitalSignParser

logger = logging.getLogger(__name__)


# ─── Device CRUD ─────────────────────────────────────────────────────────────


def create_device(
    db: Session,
    data: DeviceRegistryCreate,
    tenant_id: str,
) -> DeviceRegistry:
    """Register a new medical device."""
    device = DeviceRegistry(
        id=gen_id("mdd"),
        device_name=data.device_name,
        device_type=data.device_type,
        manufacturer=data.manufacturer,
        model_number=data.model_number,
        serial_number=data.serial_number,
        location=data.location,
        ip_address=data.ip_address,
        port=data.port,
        connection_type=data.connection_type,
        communication_protocol=data.communication_protocol,
        baud_rate=data.baud_rate,
        data_bits=data.data_bits,
        status="offline",
        calibration_date=data.calibration_date,
        next_calibration_date=data.next_calibration_date,
        warranty_expiry=data.warranty_expiry,
        notes=data.notes,
        tenant_id=tenant_id,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    logger.info("Device registered: id=%s, name=%s, serial=%s", device.id, device.device_name, device.serial_number)
    return device


def get_device(db: Session, device_id: str, tenant_id: str) -> Optional[DeviceRegistry]:
    """Get a device by ID."""
    return (
        db.query(DeviceRegistry)
        .filter(DeviceRegistry.id == device_id, DeviceRegistry.tenant_id == tenant_id)
        .first()
    )


def list_devices(
    db: Session,
    tenant_id: str,
    skip: int = 0,
    limit: int = 50,
    device_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
) -> DeviceListResponse:
    """List devices with optional filters."""
    query = db.query(DeviceRegistry).filter(DeviceRegistry.tenant_id == tenant_id)

    if device_type:
        query = query.filter(DeviceRegistry.device_type == device_type)
    if status:
        query = query.filter(DeviceRegistry.status == status)
    if search:
        pattern = f"%{search}%"
        query = query.filter(
            or_(
                DeviceRegistry.device_name.ilike(pattern),
                DeviceRegistry.serial_number.ilike(pattern),
                DeviceRegistry.manufacturer.ilike(pattern),
                DeviceRegistry.location.ilike(pattern),
            )
        )

    total = query.count()
    items = query.order_by(DeviceRegistry.device_name).offset(skip).limit(limit).all()

    return DeviceListResponse(
        items=[
            DeviceRegistrySummary(
                id=d.id,
                device_name=d.device_name,
                device_type=d.device_type,
                serial_number=d.serial_number,
                location=d.location,
                status=d.status,
                last_seen_at=d.last_seen_at,
                connection_type=d.connection_type,
            )
            for d in items
        ],
        total=total,
    )


def update_device(
    db: Session,
    device_id: str,
    data: DeviceRegistryUpdate,
    tenant_id: str,
) -> Optional[DeviceRegistry]:
    """Update a device."""
    device = get_device(db, device_id, tenant_id)
    if not device:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(device, field, value)

    db.commit()
    db.refresh(device)
    logger.info("Device updated: id=%s", device_id)
    return device


def delete_device(db: Session, device_id: str, tenant_id: str) -> bool:
    """Delete a device and all related data."""
    device = get_device(db, device_id, tenant_id)
    if not device:
        return False

    db.delete(device)
    db.commit()
    logger.info("Device deleted: id=%s", device_id)
    return True


def update_device_status(
    db: Session, device_id: str, tenant_id: str, status: str
) -> Optional[DeviceRegistry]:
    """Update device status and last_seen_at timestamp."""
    device = get_device(db, device_id, tenant_id)
    if not device:
        return None

    device.status = status
    if status == "online":
        device.last_seen_at = now_utc()

    db.commit()
    db.refresh(device)
    return device


# ─── Connection Testing ─────────────────────────────────────────────────────


async def test_device_connection(
    db: Session, device_id: str, tenant_id: str
) -> ConnectionTestResult:
    """Test connectivity to a device using the appropriate driver."""
    device = get_device(db, device_id, tenant_id)
    if not device:
        return ConnectionTestResult(
            success=False, message="Device not found"
        )

    try:
        driver = _get_driver_for_device(device)
        if not driver:
            return ConnectionTestResult(
                success=False,
                message=f"No driver available for connection type: {device.connection_type}",
            )

        result = await driver.test_connection()

        # Update device status based on result
        if result.get("success"):
            device.status = "online"
            device.last_seen_at = now_utc()
        else:
            device.status = "offline"
        db.commit()
        db.refresh(device)

        return ConnectionTestResult(
            success=result.get("success", False),
            message=result.get("message", ""),
            protocol=result.get("protocol"),
            details=result,
        )
    except Exception as exc:
        logger.error("Connection test failed for device %s: %s", device_id, exc)
        return ConnectionTestResult(
            success=False,
            message=f"Connection test error: {str(exc)}",
        )


def _get_driver_for_device(device: DeviceRegistry):
    """Instantiate the appropriate driver for a device."""
    from drivers.hl7_mllp_driver import HL7MLLPDriver
    from drivers.tcp_driver import TCPDriver
    from drivers.serial_driver import SerialDriver
    from drivers.http_driver import HTTPDriver

    if device.connection_type == "hl7_mllp":
        if not device.ip_address or not device.port:
            return None
        return HL7MLLPDriver(
            device_id=device.id,
            host=device.ip_address,
            port=device.port,
        )
    elif device.connection_type == "tcp":
        if not device.ip_address or not device.port:
            return None
        return TCPDriver(
            device_id=device.id,
            host=device.ip_address,
            port=device.port,
        )
    elif device.connection_type == "serial":
        serial_port = device.notes  # Serial port path stored in notes or a dedicated field
        if not serial_port:
            return None
        return SerialDriver(
            device_id=device.id,
            serial_port=serial_port,
            baud_rate=device.baud_rate or 9600,
            data_bits=device.data_bits or 8,
        )
    elif device.connection_type == "http":
        if not device.ip_address:
            return None
        return HTTPDriver(
            device_id=device.id,
            host=device.ip_address,
            port=device.port or 80,
        )
    return None


# ─── Send Command ───────────────────────────────────────────────────────────


async def send_device_command(
    db: Session,
    device_id: str,
    tenant_id: str,
    command: str,
    timeout: Optional[float] = None,
    wait_response: bool = True,
) -> DeviceCommandResult:
    """Send a command to a device and optionally wait for a response."""
    device = get_device(db, device_id, tenant_id)
    if not device:
        return DeviceCommandResult(
            success=False, sent=command, error="Device not found"
        )

    driver = _get_driver_for_device(device)
    if not driver:
        return DeviceCommandResult(
            success=False,
            sent=command,
            error=f"No driver for connection type: {device.connection_type}",
        )

    try:
        connected = await driver.connect()
        if not connected:
            return DeviceCommandResult(
                success=False, sent=command, error="Could not connect to device"
            )

        sent_ok = await driver.send(command)
        if not sent_ok:
            await driver.disconnect()
            return DeviceCommandResult(
                success=False, sent=command, error="Failed to send command"
            )

        response = None
        if wait_response:
            response = await driver.receive(timeout=timeout)

        await driver.disconnect()

        # Update device status
        device.status = "online"
        device.last_seen_at = now_utc()
        db.commit()

        return DeviceCommandResult(
            success=True, sent=command, response=response
        )
    except Exception as exc:
        logger.error("Command send failed for device %s: %s", device_id, exc)
        return DeviceCommandResult(
            success=False, sent=command, error=str(exc)
        )


# ─── Device Data ─────────────────────────────────────────────────────────────


def create_device_data(
    db: Session,
    data: DeviceDataCreate,
    tenant_id: str,
    auto_parse: bool = True,
) -> DeviceData:
    """Store incoming device data and optionally parse it."""
    parsed_json = data.parsed_data
    processing_error = None

    if auto_parse and not parsed_json:
        parsed_json, processing_error = _auto_parse_data(
            data.raw_message, data.data_type, db, data.device_id, tenant_id
        )

    record = DeviceData(
        id=gen_id("ddt"),
        device_id=data.device_id,
        patient_id=data.patient_id,
        data_type=data.data_type,
        raw_message=data.raw_message,
        parsed_data=parsed_json,
        received_at=now_utc(),
        processed=parsed_json is not None and processing_error is None,
        processing_error=processing_error,
        linked_order_id=data.linked_order_id,
        tenant_id=tenant_id,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    logger.info("Device data stored: id=%s, device=%s, type=%s", record.id, data.device_id, data.data_type)
    return record


def _auto_parse_data(
    raw_message: str,
    data_type: str,
    db: Session,
    device_id: str,
    tenant_id: str,
) -> tuple:
    """
    Automatically parse raw data based on data_type and device protocol.
    Returns (parsed_json, error_message).
    """
    try:
        device = get_device(db, device_id, tenant_id)
        protocol = device.communication_protocol if device else "hl7v2"

        if protocol == "hl7v2" or data_type == "lab_result":
            parsed = HL7Parser.parse(raw_message)
            return HL7Parser.to_json(parsed), None
        elif protocol == "astm":
            parsed = ASTMParser.parse(raw_message)
            return ASTMParser.to_json(parsed), None
        elif data_type == "vital_sign":
            parsed = VitalSignParser.parse(raw_message)
            return VitalSignParser.to_json(parsed), None
        else:
            # Store raw as-is for unknown protocols
            return None, None
    except Exception as exc:
        logger.warning("Auto-parse failed for device %s: %s", device_id, exc)
        return None, str(exc)


def list_device_data(
    db: Session,
    tenant_id: str,
    device_id: Optional[str] = None,
    patient_id: Optional[str] = None,
    data_type: Optional[str] = None,
    processed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> DeviceDataListResponse:
    """List device data records with optional filters."""
    query = db.query(DeviceData).filter(DeviceData.tenant_id == tenant_id)

    if device_id:
        query = query.filter(DeviceData.device_id == device_id)
    if patient_id:
        query = query.filter(DeviceData.patient_id == patient_id)
    if data_type:
        query = query.filter(DeviceData.data_type == data_type)
    if processed is not None:
        query = query.filter(DeviceData.processed == processed)

    total = query.count()
    items = query.order_by(DeviceData.received_at.desc()).offset(skip).limit(limit).all()

    return DeviceDataListResponse(
        items=[DeviceDataRead.model_validate(i) for i in items],
        total=total,
    )


def get_device_data(db: Session, data_id: str, tenant_id: str) -> Optional[DeviceData]:
    """Get a single device data record."""
    return (
        db.query(DeviceData)
        .filter(DeviceData.id == data_id, DeviceData.tenant_id == tenant_id)
        .first()
    )


# ─── Device Alerts ──────────────────────────────────────────────────────────


def create_alert(
    db: Session,
    data: DeviceAlertCreate,
    tenant_id: str,
) -> DeviceAlert:
    """Create a new device alert."""
    alert = DeviceAlert(
        id=gen_id("dal"),
        device_id=data.device_id,
        alert_type=data.alert_type,
        severity=data.severity,
        message=data.message,
        tenant_id=tenant_id,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    logger.info("Alert created: id=%s, device=%s, type=%s", alert.id, data.device_id, data.alert_type)
    return alert


def resolve_alert(
    db: Session,
    alert_id: str,
    resolved_by: str,
    tenant_id: str,
) -> Optional[DeviceAlert]:
    """Mark an alert as resolved."""
    alert = (
        db.query(DeviceAlert)
        .filter(DeviceAlert.id == alert_id, DeviceAlert.tenant_id == tenant_id)
        .first()
    )
    if not alert:
        return None

    alert.resolved = True
    alert.resolved_by = resolved_by
    alert.resolved_at = now_utc()
    db.commit()
    db.refresh(alert)
    logger.info("Alert resolved: id=%s by %s", alert_id, resolved_by)
    return alert


def list_alerts(
    db: Session,
    tenant_id: str,
    device_id: Optional[str] = None,
    severity: Optional[str] = None,
    resolved: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> DeviceAlertListResponse:
    """List device alerts with optional filters."""
    query = db.query(DeviceAlert).filter(DeviceAlert.tenant_id == tenant_id)

    if device_id:
        query = query.filter(DeviceAlert.device_id == device_id)
    if severity:
        query = query.filter(DeviceAlert.severity == severity)
    if resolved is not None:
        query = query.filter(DeviceAlert.resolved == resolved)

    total = query.count()
    items = query.order_by(DeviceAlert.created_at.desc()).offset(skip).limit(limit).all()

    return DeviceAlertListResponse(
        items=[DeviceAlertRead.model_validate(i) for i in items],
        total=total,
    )


# ─── Dashboard ──────────────────────────────────────────────────────────────


def get_dashboard(db: Session, tenant_id: str) -> DeviceDashboard:
    """Get device dashboard statistics."""
    base_q = db.query(DeviceRegistry).filter(DeviceRegistry.tenant_id == tenant_id)

    total = base_q.count()
    online = base_q.filter(DeviceRegistry.status == "online").count()
    offline = base_q.filter(DeviceRegistry.status == "offline").count()
    error = base_q.filter(DeviceRegistry.status == "error").count()
    maintenance = base_q.filter(DeviceRegistry.status == "maintenance").count()

    # Devices by type
    type_counts = (
        db.query(DeviceRegistry.device_type, func.count(DeviceRegistry.id))
        .filter(DeviceRegistry.tenant_id == tenant_id)
        .group_by(DeviceRegistry.device_type)
        .all()
    )
    devices_by_type = {t: c for t, c in type_counts}

    # Alert counts
    alert_base = db.query(DeviceAlert).filter(DeviceAlert.tenant_id == tenant_id)
    unresolved_alerts = alert_base.filter(DeviceAlert.resolved == False).count()  # noqa: E712
    critical_alerts = (
        alert_base.filter(DeviceAlert.resolved == False, DeviceAlert.severity == "critical")  # noqa: E712
        .count()
    )

    # Calibration due in next 30 days
    now = now_utc()
    thirty_days = now + timedelta(days=30)
    calibration_due = (
        base_q.filter(
            DeviceRegistry.next_calibration_date.isnot(None),
            DeviceRegistry.next_calibration_date <= thirty_days,
        ).count()
    )

    # Warranty expiring in next 30 days
    warranty_expiry_soon = (
        base_q.filter(
            DeviceRegistry.warranty_expiry.isnot(None),
            DeviceRegistry.warranty_expiry <= thirty_days,
        ).count()
    )

    # Data received in last 24 hours
    yesterday = now - timedelta(hours=24)
    recent_data = (
        db.query(DeviceData)
        .filter(DeviceData.tenant_id == tenant_id, DeviceData.received_at >= yesterday)
        .count()
    )

    return DeviceDashboard(
        total_devices=total,
        online_count=online,
        offline_count=offline,
        error_count=error,
        maintenance_count=maintenance,
        devices_by_type=devices_by_type,
        unresolved_alerts=unresolved_alerts,
        critical_alerts=critical_alerts,
        calibration_due_count=calibration_due,
        warranty_expiry_soon_count=warranty_expiry_soon,
        recent_data_count=recent_data,
    )


# ─── Calibration & Warranty Checks ──────────────────────────────────────────


def check_calibration_alerts(db: Session, tenant_id: str) -> List[DeviceAlert]:
    """Check for devices with upcoming or overdue calibrations and create alerts."""
    now = now_utc()
    thirty_days = now + timedelta(days=30)
    created_alerts: List[DeviceAlert] = []

    devices = (
        db.query(DeviceRegistry)
        .filter(
            DeviceRegistry.tenant_id == tenant_id,
            DeviceRegistry.next_calibration_date.isnot(None),
            DeviceRegistry.next_calibration_date <= thirty_days,
            DeviceRegistry.status != "decommissioned",
        )
        .all()
    )

    for device in devices:
        # Check if an unresolved calibration alert already exists
        existing = (
            db.query(DeviceAlert)
            .filter(
                DeviceAlert.device_id == device.id,
                DeviceAlert.alert_type == "calibration_due",
                DeviceAlert.resolved == False,  # noqa: E712
            )
            .first()
        )
        if existing:
            continue

        is_overdue = device.next_calibration_date <= now
        severity = "critical" if is_overdue else "warning"
        message = (
            f"Calibration OVERDUE for {device.device_name} (SN: {device.serial_number}). "
            f"Due: {device.next_calibration_date.strftime('%Y-%m-%d')}"
            if is_overdue
            else f"Calibration due soon for {device.device_name} (SN: {device.serial_number}). "
            f"Due: {device.next_calibration_date.strftime('%Y-%m-%d')}"
        )

        alert = DeviceAlert(
            id=gen_id("dal"),
            device_id=device.id,
            alert_type="calibration_due",
            severity=severity,
            message=message,
            tenant_id=tenant_id,
        )
        db.add(alert)
        created_alerts.append(alert)

    if created_alerts:
        db.commit()
        for a in created_alerts:
            db.refresh(a)

    return created_alerts


def check_warranty_alerts(db: Session, tenant_id: str) -> List[DeviceAlert]:
    """Check for devices with upcoming or expired warranties and create alerts."""
    now = now_utc()
    sixty_days = now + timedelta(days=60)
    created_alerts: List[DeviceAlert] = []

    devices = (
        db.query(DeviceRegistry)
        .filter(
            DeviceRegistry.tenant_id == tenant_id,
            DeviceRegistry.warranty_expiry.isnot(None),
            DeviceRegistry.warranty_expiry <= sixty_days,
            DeviceRegistry.status != "decommissioned",
        )
        .all()
    )

    for device in devices:
        existing = (
            db.query(DeviceAlert)
            .filter(
                DeviceAlert.device_id == device.id,
                DeviceAlert.alert_type == "warranty_expiry",
                DeviceAlert.resolved == False,  # noqa: E712
            )
            .first()
        )
        if existing:
            continue

        is_expired = device.warranty_expiry <= now
        severity = "critical" if is_expired else "info"
        message = (
            f"Warranty EXPIRED for {device.device_name} (SN: {device.serial_number}). "
            f"Expired: {device.warranty_expiry.strftime('%Y-%m-%d')}"
            if is_expired
            else f"Warranty expiring soon for {device.device_name} (SN: {device.serial_number}). "
            f"Expires: {device.warranty_expiry.strftime('%Y-%m-%d')}"
        )

        alert = DeviceAlert(
            id=gen_id("dal"),
            device_id=device.id,
            alert_type="warranty_expiry",
            severity=severity,
            message=message,
            tenant_id=tenant_id,
        )
        db.add(alert)
        created_alerts.append(alert)

    if created_alerts:
        db.commit()
        for a in created_alerts:
            db.refresh(a)

    return created_alerts
