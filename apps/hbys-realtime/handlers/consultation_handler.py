"""
Consultation Request Handler
Creates notifications when a physician requests a consultation from another department/specialist.
"""
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from hbys_common.database import gen_id
from models.clinical_notification import ClinicalNotification

logger = logging.getLogger(__name__)


async def handle_consultation_request(
    db: Session,
    tenant_id: str,
    *,
    patient_id: str,
    requesting_physician_id: str,
    target_physician_id: Optional[str] = None,
    target_department: Optional[str] = None,
    reason: str,
    urgency: str = "routine",
    encounter_id: Optional[str] = None,
) -> list[ClinicalNotification]:
    """
    Create consultation-request notifications.

    If target_physician_id is provided, a direct user notification is sent.
    If target_department is provided, a role-based notification is sent to that department.
    """
    priority_map = {
        "routine": "medium",
        "urgent": "high",
        "stat": "critical",
    }
    priority = priority_map.get(urgency, "medium")

    data_payload = json.dumps({
        "requestingPhysicianId": requesting_physician_id,
        "targetPhysicianId": target_physician_id,
        "targetDepartment": target_department,
        "reason": reason,
        "urgency": urgency,
        "encounterId": encounter_id,
    }, ensure_ascii=False)

    title = "Konsultasyon Talebi"
    message = f"Konsultasyon talebi: {reason}"
    if urgency == "stat":
        title = "ACIL Konsultasyon Talebi"
        message = f"ACIL konsultasyon talebi: {reason}"

    notifications: list[ClinicalNotification] = []
    expires = datetime.now(timezone.utc) + timedelta(hours=8)

    # Direct notification to target physician
    if target_physician_id:
        notif = ClinicalNotification(
            id=gen_id("cno"),
            notification_type="consultation_request",
            priority=priority,
            title=title,
            message=message,
            data=data_payload,
            source_type="consultation",
            source_id=encounter_id,
            patient_id=patient_id,
            target_type="user",
            target_id=target_physician_id,
            status="pending",
            expires_at=expires,
            channel="websocket",
            tenant_id=tenant_id,
        )
        db.add(notif)
        notifications.append(notif)

    # Department-level notification
    if target_department:
        notif_dept = ClinicalNotification(
            id=gen_id("cno"),
            notification_type="consultation_request",
            priority=priority,
            title=title,
            message=message,
            data=data_payload,
            source_type="consultation",
            source_id=encounter_id,
            patient_id=patient_id,
            target_type="role",
            target_id=target_department,
            status="pending",
            expires_at=expires,
            channel="websocket",
            tenant_id=tenant_id,
        )
        db.add(notif_dept)
        notifications.append(notif_dept)

    if notifications:
        db.commit()
        for n in notifications:
            db.refresh(n)
        logger.info(
            "Consultation notifications: count=%d patient=%s reason=%s",
            len(notifications), patient_id, reason,
        )

    return notifications
