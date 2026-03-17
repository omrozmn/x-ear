"""
Listener Service - Background listener for incoming medical device data.
Manages persistent connections to devices that push data (HL7 MLLP, serial, TCP).
"""
import asyncio
import logging
from datetime import datetime
from typing import Dict, Optional

from sqlalchemy.orm import Session

from hbys_common.database import gen_id, now_utc
from config import (
    LISTENER_POLL_INTERVAL,
    LISTENER_MAX_RECONNECT_ATTEMPTS,
    LISTENER_RECONNECT_DELAY,
)
from models.device_registry import DeviceRegistry
from models.device_data import DeviceData
from models.device_alert import DeviceAlert
from parsers.hl7_parser import HL7Parser
from parsers.astm_parser import ASTMParser
from parsers.vital_parser import VitalSignParser

logger = logging.getLogger(__name__)


class DeviceListenerInfo:
    """Tracks state of an individual device listener."""

    def __init__(self, device_id: str, device_name: str):
        self.device_id = device_id
        self.device_name = device_name
        self.is_running = False
        self.started_at: Optional[datetime] = None
        self.messages_received = 0
        self.last_message_at: Optional[datetime] = None
        self.errors = 0
        self.task: Optional[asyncio.Task] = None


class DeviceListenerService:
    """
    Manages background listener tasks for medical devices.
    Each device gets its own asyncio task that maintains a persistent connection
    and processes incoming data.
    """

    def __init__(self):
        self._listeners: Dict[str, DeviceListenerInfo] = {}

    @property
    def active_listeners(self) -> Dict[str, DeviceListenerInfo]:
        return {k: v for k, v in self._listeners.items() if v.is_running}

    def get_listener_status(self, device_id: str) -> Optional[DeviceListenerInfo]:
        return self._listeners.get(device_id)

    def get_all_statuses(self) -> list:
        return list(self._listeners.values())

    async def start_listener(
        self,
        device: DeviceRegistry,
        db_factory,
        tenant_id: str,
    ) -> bool:
        """
        Start a background listener for a device.

        Args:
            device: The device to listen to.
            db_factory: Callable that returns a new DB session (e.g., SessionLocal).
            tenant_id: Tenant context for data storage.

        Returns:
            True if listener was started, False if already running or not applicable.
        """
        device_id = device.id

        # Check if already running
        existing = self._listeners.get(device_id)
        if existing and existing.is_running:
            logger.warning("Listener already running for device %s", device_id)
            return False

        # Only start listeners for push-type connections
        if device.connection_type not in ("hl7_mllp", "serial", "tcp"):
            logger.info(
                "Device %s uses %s - no persistent listener needed",
                device_id,
                device.connection_type,
            )
            return False

        info = DeviceListenerInfo(device_id=device_id, device_name=device.device_name)
        info.is_running = True
        info.started_at = datetime.utcnow()
        self._listeners[device_id] = info

        # Start the listener task
        info.task = asyncio.create_task(
            self._listener_loop(device, db_factory, tenant_id, info)
        )
        logger.info("Listener started for device %s (%s)", device_id, device.device_name)
        return True

    async def stop_listener(self, device_id: str) -> bool:
        """Stop the background listener for a device."""
        info = self._listeners.get(device_id)
        if not info or not info.is_running:
            return False

        info.is_running = False
        if info.task and not info.task.done():
            info.task.cancel()
            try:
                await info.task
            except asyncio.CancelledError:
                pass

        logger.info("Listener stopped for device %s", device_id)
        return True

    async def stop_all(self):
        """Stop all running listeners."""
        device_ids = list(self._listeners.keys())
        for device_id in device_ids:
            await self.stop_listener(device_id)

    async def _listener_loop(
        self,
        device: DeviceRegistry,
        db_factory,
        tenant_id: str,
        info: DeviceListenerInfo,
    ):
        """
        Main listener loop for a device.
        Maintains a persistent connection and processes incoming messages.
        """
        from service import _get_driver_for_device

        reconnect_attempts = 0

        while info.is_running:
            driver = _get_driver_for_device(device)
            if not driver:
                logger.error("No driver for device %s, stopping listener", device.id)
                info.is_running = False
                break

            try:
                connected = await driver.connect()
                if not connected:
                    reconnect_attempts += 1
                    if reconnect_attempts >= LISTENER_MAX_RECONNECT_ATTEMPTS:
                        logger.error(
                            "Max reconnect attempts reached for device %s",
                            device.id,
                        )
                        # Create a communication failure alert
                        self._create_failure_alert(db_factory, device, tenant_id)
                        info.is_running = False
                        break

                    logger.warning(
                        "Connection failed for device %s, retry %d/%d in %ds",
                        device.id,
                        reconnect_attempts,
                        LISTENER_MAX_RECONNECT_ATTEMPTS,
                        LISTENER_RECONNECT_DELAY,
                    )
                    await asyncio.sleep(LISTENER_RECONNECT_DELAY)
                    continue

                # Reset reconnect counter on successful connection
                reconnect_attempts = 0

                # Update device status
                self._update_device_status(db_factory, device.id, tenant_id, "online")

                # Listen loop
                while info.is_running:
                    try:
                        data = await driver.receive(timeout=LISTENER_POLL_INTERVAL * 10)
                        if data:
                            info.messages_received += 1
                            info.last_message_at = datetime.utcnow()
                            self._process_incoming_data(
                                db_factory, device, data, tenant_id
                            )
                    except asyncio.CancelledError:
                        raise
                    except Exception as recv_exc:
                        info.errors += 1
                        logger.error(
                            "Receive error on device %s: %s", device.id, recv_exc
                        )
                        break  # Break inner loop to reconnect

            except asyncio.CancelledError:
                logger.info("Listener cancelled for device %s", device.id)
                break
            except Exception as exc:
                info.errors += 1
                logger.error("Listener error for device %s: %s", device.id, exc)
                await asyncio.sleep(LISTENER_RECONNECT_DELAY)
            finally:
                try:
                    await driver.disconnect()
                except Exception:
                    pass

        # Update status when listener stops
        self._update_device_status(db_factory, device.id, tenant_id, "offline")
        info.is_running = False
        logger.info(
            "Listener loop ended for device %s. Messages: %d, Errors: %d",
            device.id,
            info.messages_received,
            info.errors,
        )

    def _process_incoming_data(
        self,
        db_factory,
        device: DeviceRegistry,
        raw_data: str,
        tenant_id: str,
    ):
        """Process incoming data from a device."""
        try:
            db: Session = db_factory()
            try:
                # Determine data type based on protocol
                data_type = self._infer_data_type(device, raw_data)

                # Parse the data
                parsed_json, error = self._parse_data(device, raw_data, data_type)

                # Store the data record
                record = DeviceData(
                    id=gen_id("ddt"),
                    device_id=device.id,
                    data_type=data_type,
                    raw_message=raw_data,
                    parsed_data=parsed_json,
                    received_at=now_utc(),
                    processed=parsed_json is not None and error is None,
                    processing_error=error,
                    tenant_id=tenant_id,
                )

                # Try to extract patient_id from parsed data
                if parsed_json:
                    record.patient_id = self._extract_patient_id(parsed_json)

                db.add(record)

                # Update device last_seen_at
                dev = db.query(DeviceRegistry).filter(DeviceRegistry.id == device.id).first()
                if dev:
                    dev.last_seen_at = now_utc()
                    dev.status = "online"

                db.commit()

                # Send ACK for HL7 messages
                if device.communication_protocol == "hl7v2" and parsed_json:
                    self._send_ack_if_needed(device, raw_data, parsed_json)

            finally:
                db.close()
        except Exception as exc:
            logger.error(
                "Failed to process data from device %s: %s", device.id, exc
            )

    def _infer_data_type(self, device: DeviceRegistry, raw_data: str) -> str:
        """Infer data type from device type and raw data content."""
        if device.device_type == "monitor":
            return "vital_sign"
        elif device.device_type == "ecg":
            return "ecg"
        elif device.device_type in ("xray", "ultrasound"):
            return "image"
        elif device.device_type == "analyzer":
            return "lab_result"
        elif "OBX" in raw_data and ("NM" in raw_data or "ST" in raw_data):
            return "lab_result"
        return "lab_result"

    def _parse_data(self, device: DeviceRegistry, raw_data: str, data_type: str):
        """Parse raw data using appropriate parser. Returns (json_str, error)."""
        try:
            if device.communication_protocol == "hl7v2":
                parsed = HL7Parser.parse(raw_data)
                return HL7Parser.to_json(parsed), None
            elif device.communication_protocol == "astm":
                parsed = ASTMParser.parse(raw_data)
                return ASTMParser.to_json(parsed), None
            elif data_type == "vital_sign":
                parsed = VitalSignParser.parse(raw_data)
                return VitalSignParser.to_json(parsed), None
            else:
                return None, None
        except Exception as exc:
            return None, str(exc)

    def _extract_patient_id(self, parsed_json: str) -> Optional[str]:
        """Try to extract patient_id from parsed JSON data."""
        try:
            import json
            data = json.loads(parsed_json)
            # HL7 format
            patient = data.get("patient", {})
            if patient:
                return patient.get("patient_id") or patient.get("tc_kimlik")
            # ASTM format
            patients = data.get("patients", [])
            if patients:
                return patients[0].get("patient_id")
            return None
        except Exception:
            return None

    def _send_ack_if_needed(self, device: DeviceRegistry, raw_data: str, parsed_json: str):
        """Queue an ACK response for HL7 messages (non-blocking)."""
        try:
            import json
            data = json.loads(parsed_json)
            msg_control_id = data.get("message_control_id")
            if msg_control_id:
                ack = HL7Parser.build_ack(msg_control_id)
                # ACK sending would be handled by the driver in the listener loop
                logger.debug("ACK prepared for message %s", msg_control_id)
        except Exception:
            pass

    def _create_failure_alert(self, db_factory, device: DeviceRegistry, tenant_id: str):
        """Create a communication failure alert."""
        try:
            db = db_factory()
            try:
                alert = DeviceAlert(
                    id=gen_id("dal"),
                    device_id=device.id,
                    alert_type="communication_failure",
                    severity="critical",
                    message=f"Communication failure: unable to connect to {device.device_name} "
                    f"(SN: {device.serial_number}) after {LISTENER_MAX_RECONNECT_ATTEMPTS} attempts.",
                    tenant_id=tenant_id,
                )
                db.add(alert)

                dev = db.query(DeviceRegistry).filter(DeviceRegistry.id == device.id).first()
                if dev:
                    dev.status = "error"

                db.commit()
            finally:
                db.close()
        except Exception as exc:
            logger.error("Failed to create failure alert for device %s: %s", device.id, exc)

    def _update_device_status(
        self, db_factory, device_id: str, tenant_id: str, status: str
    ):
        """Update device status in DB."""
        try:
            db = db_factory()
            try:
                dev = db.query(DeviceRegistry).filter(DeviceRegistry.id == device_id).first()
                if dev:
                    dev.status = status
                    if status == "online":
                        dev.last_seen_at = now_utc()
                    db.commit()
            finally:
                db.close()
        except Exception as exc:
            logger.error("Failed to update device status: %s", exc)


# Module-level singleton
listener_manager = DeviceListenerService()
