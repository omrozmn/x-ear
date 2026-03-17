"""
Vital Signs Alert Handler
Detects out-of-range vital signs and creates notifications for clinical staff.
"""
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from database import gen_id
from ..models.clinical_notification import ClinicalNotification

logger = logging.getLogger(__name__)

# Normal ranges for common vital signs
VITAL_RANGES = {
    "heart_rate": {"low": 50, "high": 120, "unit": "bpm"},
    "systolic_bp": {"low": 80, "high": 180, "unit": "mmHg"},
    "diastolic_bp": {"low": 50, "high": 110, "unit": "mmHg"},
    "temperature": {"low": 35.0, "high": 39.0, "unit": "°C"},
    "spo2": {"low": 90, "high": 100, "unit": "%"},
    "respiratory_rate": {"low": 10, "high": 30, "unit": "/dk"},
}


async def handle_vital_alert(
    db: Session,
    tenant_id: str,
    *,
    patient_id: str,
    vital_type: str,
    value: float,
    unit: Optional[str] = None,
    encounter_id: Optional[str] = None,
    ward_id: Optional[str] = None,
    attending_physician_id: Optional[str] = None,
) -> list[ClinicalNotification]:
    """
    Evaluate a vital-sign reading against known ranges and create alerts if abnormal.

    Notifications sent to:
      1. Attending physician (target_type=user)
      2. Ward nurses (target_type=ward)
    """
    ranges = VITAL_RANGES.get(vital_type)
    if not ranges:
        logger.debug("No defined range for vital_type=%s, skipping", vital_type)
        return []

    is_low = value < ranges["low"]
    is_high = value > ranges["high"]
    if not is_low and not is_high:
        return []

    direction = "dusuk" if is_low else "yuksek"
    display_unit = unit or ranges.get("unit", "")

    title = f"Vital Uyarisi: {vital_type.replace('_', ' ').title()}"
    message = (
        f"{vital_type.replace('_', ' ').title()} degeri {value} {display_unit} "
        f"- normal aralik disinda ({direction}). Acil degerlendirme gerekli."
    )

    data_payload = json.dumps({
        "vitalType": vital_type,
        "value": value,
        "unit": display_unit,
        "normalLow": ranges["low"],
        "normalHigh": ranges["high"],
        "direction": direction,
        "encounterId": encounter_id,
    }, ensure_ascii=False)

    notifications: list[ClinicalNotification] = []
    expires = datetime.now(timezone.utc) + timedelta(hours=2)

    # Notify attending physician
    if attending_physician_id:
        notif = ClinicalNotification(
            id=gen_id("cno"),
            notification_type="vital_alert",
            priority="high",
            title=title,
            message=message,
            data=data_payload,
            source_type="vital_sign",
            source_id=encounter_id,
            patient_id=patient_id,
            target_type="user",
            target_id=attending_physician_id,
            status="pending",
            expires_at=expires,
            channel="websocket",
            tenant_id=tenant_id,
        )
        db.add(notif)
        notifications.append(notif)

    # Notify ward
    if ward_id:
        notif_ward = ClinicalNotification(
            id=gen_id("cno"),
            notification_type="vital_alert",
            priority="high",
            title=title,
            message=message,
            data=data_payload,
            source_type="vital_sign",
            source_id=encounter_id,
            patient_id=patient_id,
            target_type="ward",
            target_id=ward_id,
            status="pending",
            expires_at=expires,
            channel="websocket",
            tenant_id=tenant_id,
        )
        db.add(notif_ward)
        notifications.append(notif_ward)

    if notifications:
        db.commit()
        for n in notifications:
            db.refresh(n)
        logger.info(
            "Vital alert notifications created: count=%d patient=%s vital=%s value=%s",
            len(notifications), patient_id, vital_type, value,
        )

    return notifications
