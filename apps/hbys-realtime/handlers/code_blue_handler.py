"""
Code Blue Handler
Creates highest-priority broadcast notification for cardiac/respiratory arrest.
Code Blue alerts are broadcast to the entire tenant (all connected staff).
"""
import json
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from hbys_common.database import gen_id
from models.clinical_notification import ClinicalNotification

logger = logging.getLogger(__name__)


async def handle_code_blue(
    db: Session,
    tenant_id: str,
    *,
    patient_id: Optional[str] = None,
    location: str,
    ward_id: Optional[str] = None,
    triggered_by: Optional[str] = None,
    notes: Optional[str] = None,
) -> ClinicalNotification:
    """
    Create a Code Blue notification broadcast to the entire facility.

    Code Blue is always:
      - priority = critical
      - target_type = all (broadcast)
      - channel = websocket (plus other channels in the dispatch layer)
    """
    data_payload = json.dumps({
        "location": location,
        "wardId": ward_id,
        "triggeredBy": triggered_by,
        "notes": notes,
    }, ensure_ascii=False)

    title = "KOD MAVI - Acil Muedahale"
    message = f"Kod Mavi! Lokasyon: {location}."
    if notes:
        message += f" Not: {notes}"

    notif = ClinicalNotification(
        id=gen_id("cno"),
        notification_type="code_blue",
        priority="critical",
        title=title,
        message=message,
        data=data_payload,
        source_type="code_blue",
        source_id=None,
        patient_id=patient_id,
        target_type="all",
        target_id=None,
        status="pending",
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=30),
        channel="websocket",
        tenant_id=tenant_id,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    logger.critical(
        "CODE BLUE notification created: id=%s location=%s tenant=%s",
        notif.id, location, tenant_id,
    )
    return notif
