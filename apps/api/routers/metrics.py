"""Prometheus Metrics Endpoint for Email Deliverability.

Exports email deliverability metrics in Prometheus format.
"""

import logging
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from datetime import datetime, timezone, timedelta

from core.database import get_db
from core.models.email import SMTPEmailLog
from core.models.email_deliverability import EmailBounce, EmailComplaint
from sqlalchemy import func, and_

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/metrics", tags=["monitoring"])


@router.get(
    "/prometheus",
    operation_id="getPrometheusMetrics",
    summary="Get Prometheus metrics",
    description="Export email deliverability metrics in Prometheus format",
    include_in_schema=False  # Don't include in OpenAPI (plain text response)
)
async def get_prometheus_metrics(
    db: Session = Depends(get_db)
) -> Response:
    """
    Export metrics in Prometheus format.
    
    Metrics:
    - emails_sent_total: Total emails sent
    - emails_bounced_total: Total bounces
    - emails_spam_total: Total spam complaints
    - deliverability_rate: Current deliverability rate
    """
    now = datetime.now(timezone.utc)
    last_24h = now - timedelta(hours=24)
    
    # Count sent emails (last 24h)
    sent_count = db.query(func.count(SMTPEmailLog.id)).filter(
        and_(
            SMTPEmailLog.status == "sent",
            SMTPEmailLog.created_at >= last_24h
        )
    ).scalar() or 0
    
    # Count bounces (last 24h)
    bounce_count = db.query(func.count(EmailBounce.id)).filter(
        EmailBounce.created_at >= last_24h
    ).scalar() or 0
    
    # Count spam complaints (last 24h)
    spam_count = db.query(func.count(EmailComplaint.id)).filter(
        EmailComplaint.created_at >= last_24h
    ).scalar() or 0
    
    # Calculate deliverability rate
    deliverability_rate = 0.0
    if sent_count > 0:
        bounce_rate = (bounce_count / sent_count) * 100
        spam_rate = (spam_count / sent_count) * 100
        deliverability_rate = 100.0 - bounce_rate - spam_rate
    
    # Format Prometheus metrics
    metrics_text = f"""# HELP emails_sent_total Total number of emails sent (last 24h)
# TYPE emails_sent_total counter
emails_sent_total {sent_count}

# HELP emails_bounced_total Total number of bounced emails (last 24h)
# TYPE emails_bounced_total counter
emails_bounced_total {bounce_count}

# HELP emails_spam_total Total number of spam complaints (last 24h)
# TYPE emails_spam_total counter
emails_spam_total {spam_count}

# HELP deliverability_rate Current email deliverability rate percentage (last 24h)
# TYPE deliverability_rate gauge
deliverability_rate {deliverability_rate:.2f}

# HELP bounce_rate Current email bounce rate percentage (last 24h)
# TYPE bounce_rate gauge
bounce_rate {(bounce_count / sent_count * 100) if sent_count > 0 else 0:.2f}

# HELP spam_rate Current spam complaint rate percentage (last 24h)
# TYPE spam_rate gauge
spam_rate {(spam_count / sent_count * 100) if sent_count > 0 else 0:.2f}
"""
    
    return Response(
        content=metrics_text,
        media_type="text/plain; version=0.0.4"
    )
