"""Deliverability Metrics Service for Email Performance Monitoring.

Tracks and calculates email deliverability metrics for monitoring and alerting.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from core.models.email import SMTPEmailLog
from core.models.email_deliverability import EmailBounce, EmailComplaint, DeliverabilityMetrics
from core.models.base import gen_id

logger = logging.getLogger(__name__)


class DeliverabilityMetricsService:
    """Service for calculating and tracking email deliverability metrics."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_metrics(
        self,
        tenant_id: str,
        time_window_hours: int = 24
    ) -> Dict:
        """Calculate deliverability metrics for time window.
        
        Args:
            tenant_id: Tenant ID
            time_window_hours: Time window in hours (default 24)
            
        Returns:
            Dict with metrics: sent_count, bounce_rate, spam_rate, deliverability_rate
        """
        now = datetime.now(timezone.utc)
        start_time = now - timedelta(hours=time_window_hours)
        
        # Count sent emails
        sent_count = self.db.query(func.count(SMTPEmailLog.id)).filter(
            and_(
                SMTPEmailLog.tenant_id == tenant_id,
                SMTPEmailLog.status == "sent",
                SMTPEmailLog.created_at >= start_time
            )
        ).scalar() or 0
        
        # Count bounces
        bounce_count = self.db.query(func.count(EmailBounce.id)).filter(
            and_(
                EmailBounce.tenant_id == tenant_id,
                EmailBounce.created_at >= start_time
            )
        ).scalar() or 0
        
        # Count spam complaints
        spam_count = self.db.query(func.count(EmailComplaint.id)).filter(
            and_(
                EmailComplaint.tenant_id == tenant_id,
                EmailComplaint.created_at >= start_time
            )
        ).scalar() or 0
        
        # Calculate rates
        bounce_rate = (bounce_count / sent_count * 100) if sent_count > 0 else 0.0
        spam_rate = (spam_count / sent_count * 100) if sent_count > 0 else 0.0
        deliverability_rate = 100.0 - bounce_rate - spam_rate
        
        logger.info(
            "Deliverability metrics calculated",
            extra={
                "tenant_id": tenant_id,
                "time_window_hours": time_window_hours,
                "sent_count": sent_count,
                "bounce_rate": round(bounce_rate, 2),
                "spam_rate": round(spam_rate, 2),
                "deliverability_rate": round(deliverability_rate, 2)
            }
        )
        
        return {
            "sent_count": sent_count,
            "bounce_count": bounce_count,
            "spam_count": spam_count,
            "bounce_rate": round(bounce_rate, 2),
            "spam_rate": round(spam_rate, 2),
            "deliverability_rate": round(deliverability_rate, 2),
            "time_window_hours": time_window_hours,
            "calculated_at": now.isoformat()
        }
    
    def store_daily_snapshot(self, tenant_id: str) -> str:
        """Store daily deliverability metrics snapshot.
        
        Args:
            tenant_id: Tenant ID
            
        Returns:
            str: Snapshot ID
        """
        metrics = self.calculate_metrics(tenant_id, time_window_hours=24)
        now = datetime.now(timezone.utc)
        
        snapshot = DeliverabilityMetrics(
            id=gen_id("deliv_metric"),
            tenant_id=tenant_id,
            date=now.date(),
            sent_count=metrics["sent_count"],
            bounce_count=metrics["bounce_count"],
            spam_count=metrics["spam_count"],
            bounce_rate=metrics["bounce_rate"],
            spam_rate=metrics["spam_rate"],
            deliverability_rate=metrics["deliverability_rate"],
            created_at=now,
            updated_at=now
        )
        
        self.db.add(snapshot)
        self.db.commit()
        
        logger.info(
            "Daily metrics snapshot stored",
            extra={
                "tenant_id": tenant_id,
                "snapshot_id": snapshot.id,
                "deliverability_rate": snapshot.deliverability_rate
            }
        )
        
        return snapshot.id
    
    def check_alert_thresholds(
        self,
        tenant_id: str,
        time_window_hours: int = 1
    ) -> Dict:
        """Check if metrics exceed alert thresholds.
        
        Thresholds:
        - Bounce rate > 5%
        - Spam rate > 0.1%
        - Deliverability rate < 95%
        
        Args:
            tenant_id: Tenant ID
            time_window_hours: Time window for alert check (default 1 hour)
            
        Returns:
            Dict with alerts: should_alert, alerts list
        """
        metrics = self.calculate_metrics(tenant_id, time_window_hours)
        
        alerts = []
        
        # Check bounce rate
        if metrics["bounce_rate"] > 5.0:
            alerts.append({
                "type": "HIGH_BOUNCE_RATE",
                "severity": "HIGH",
                "message": f"Bounce rate {metrics['bounce_rate']}% exceeds 5% threshold",
                "value": metrics["bounce_rate"],
                "threshold": 5.0
            })
        
        # Check spam rate
        if metrics["spam_rate"] > 0.1:
            alerts.append({
                "type": "HIGH_SPAM_RATE",
                "severity": "CRITICAL",
                "message": f"Spam complaint rate {metrics['spam_rate']}% exceeds 0.1% threshold",
                "value": metrics["spam_rate"],
                "threshold": 0.1
            })
        
        # Check deliverability rate
        if metrics["deliverability_rate"] < 95.0:
            alerts.append({
                "type": "LOW_DELIVERABILITY",
                "severity": "HIGH",
                "message": f"Deliverability rate {metrics['deliverability_rate']}% below 95% threshold",
                "value": metrics["deliverability_rate"],
                "threshold": 95.0
            })
        
        should_alert = len(alerts) > 0
        
        if should_alert:
            logger.warning(
                "Deliverability alert triggered",
                extra={
                    "tenant_id": tenant_id,
                    "alerts": alerts,
                    "metrics": metrics
                }
            )
        
        return {
            "should_alert": should_alert,
            "alerts": alerts,
            "metrics": metrics
        }
    
    def get_trend(
        self,
        tenant_id: str,
        days: int = 7
    ) -> Dict:
        """Get deliverability trend over time.
        
        Args:
            tenant_id: Tenant ID
            days: Number of days to analyze
            
        Returns:
            Dict with daily metrics
        """
        start_date = datetime.now(timezone.utc).date() - timedelta(days=days)
        
        snapshots = self.db.query(DeliverabilityMetrics).filter(
            and_(
                DeliverabilityMetrics.tenant_id == tenant_id,
                DeliverabilityMetrics.date >= start_date
            )
        ).order_by(DeliverabilityMetrics.date).all()
        
        trend_data = []
        for snapshot in snapshots:
            trend_data.append({
                "date": snapshot.date.isoformat(),
                "sent_count": snapshot.sent_count,
                "bounce_rate": snapshot.bounce_rate,
                "spam_rate": snapshot.spam_rate,
                "deliverability_rate": snapshot.deliverability_rate
            })
        
        return {
            "tenant_id": tenant_id,
            "days": days,
            "data": trend_data
        }


def get_deliverability_metrics_service(db: Session) -> DeliverabilityMetricsService:
    """Get DeliverabilityMetricsService instance."""
    return DeliverabilityMetricsService(db)
