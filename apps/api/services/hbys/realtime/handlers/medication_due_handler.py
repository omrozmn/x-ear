"""
Medication Due Handler
Creates notifications when medications are due for administration.
"""
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from database import gen_id
from ..models.clinical_notification import ClinicalNotification

logger = logging.getLogger(__name__)


async def handle_medication_due(
    db: Session,
    tenant_id: str,
    *,
    patient_id: str,
    medication_name: str,
    dose: str,
    route: Optional[str] = None,
    scheduled_time: Optional[datetime] = None,
    prescription_id: Optional[str] = None,
    ward_id: Optional[str] = None,
    nurse_id: Optional[str] = None,
) -> list[ClinicalNotification]:
    """
    Create medication-due notification for the assigned nurse and/or ward.

    Sent to:
      1. Assigned nurse (target_type=user) if nurse_id provided
      2. Ward nurses (target_type=ward) as fallback or additional
    """
    sched_str = scheduled_time.isoformat() if scheduled_time else None

    data_payload = json.dumps({
        "medicationName": medication_name,
        "dose": dose,
        "route": route,
        "scheduledTime": sched_str,
        "prescriptionId": prescription_id,
    }, ensure_ascii=False)

    title = f"Ilac Zamani: {medication_name}"
    message = f"{medication_name} {dose}"
    if route:
        message += f" ({route})"
    message += " uygulanma zamani gelmistir."
    if scheduled_time:
        message += f" Planlanan saat: {scheduled_time.strftime('%H:%M')}"

    notifications: list[ClinicalNotification] = []
    expires = datetime.now(timezone.utc) + timedelta(hours=1)

    # Notify assigned nurse
    if nurse_id:
        notif = ClinicalNotification(
            id=gen_id("cno"),
            notification_type="medication_due",
            priority="high",
            title=title,
            message=message,
            data=data_payload,
            source_type="prescription",
            source_id=prescription_id,
            patient_id=patient_id,
            target_type="user",
            target_id=nurse_id,
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
            notification_type="medication_due",
            priority="high",
            title=title,
            message=message,
            data=data_payload,
            source_type="prescription",
            source_id=prescription_id,
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
            "Medication-due notifications: count=%d patient=%s med=%s",
            len(notifications), patient_id, medication_name,
        )

    return notifications
