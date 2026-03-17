"""
Critical Lab Result Handler
Processes critical / panic-value lab results and creates urgent notifications
for the ordering physician, ward nurses, and relevant on-call staff.
"""
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from hbys_common.database import gen_id
from models.clinical_notification import ClinicalNotification

logger = logging.getLogger(__name__)


async def handle_critical_lab(
    db: Session,
    tenant_id: str,
    *,
    patient_id: str,
    test_name: str,
    result_value: str,
    result_unit: Optional[str] = None,
    critical_low: Optional[float] = None,
    critical_high: Optional[float] = None,
    lab_order_id: Optional[str] = None,
    lab_test_id: Optional[str] = None,
    ordered_by: Optional[str] = None,
    ward_id: Optional[str] = None,
) -> list[ClinicalNotification]:
    """
    Create notification(s) for a critical lab result.

    Notifications are sent to:
      1. The ordering physician (target_type=user)
      2. The ward staff if ward_id is provided (target_type=ward)

    Returns list of created ClinicalNotification objects.
    """
    data_payload = json.dumps({
        "testName": test_name,
        "resultValue": result_value,
        "resultUnit": result_unit,
        "criticalLow": critical_low,
        "criticalHigh": critical_high,
        "labOrderId": lab_order_id,
        "labTestId": lab_test_id,
    }, ensure_ascii=False)

    title = f"Kritik Lab Sonucu: {test_name}"
    message = f"{test_name} sonucu {result_value}"
    if result_unit:
        message += f" {result_unit}"
    message += " - kritik degerde. Acil degerlendirme gereklidir."

    notifications: list[ClinicalNotification] = []
    expires = datetime.now(timezone.utc) + timedelta(hours=4)

    # Notify ordering physician
    if ordered_by:
        notif = ClinicalNotification(
            id=gen_id("cno"),
            notification_type="critical_lab",
            priority="critical",
            title=title,
            message=message,
            data=data_payload,
            source_type="lab_test",
            source_id=lab_test_id,
            patient_id=patient_id,
            target_type="user",
            target_id=ordered_by,
            status="pending",
            expires_at=expires,
            channel="websocket",
            tenant_id=tenant_id,
        )
        db.add(notif)
        notifications.append(notif)

    # Notify ward staff
    if ward_id:
        notif_ward = ClinicalNotification(
            id=gen_id("cno"),
            notification_type="critical_lab",
            priority="critical",
            title=title,
            message=message,
            data=data_payload,
            source_type="lab_test",
            source_id=lab_test_id,
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
            "Critical lab notifications created: count=%d patient=%s test=%s",
            len(notifications), patient_id, test_name,
        )

    return notifications
