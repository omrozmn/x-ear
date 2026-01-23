"""Email monitoring utilities for observability and PII masking."""

import logging
import re
import time
from collections import defaultdict
from contextlib import contextmanager
from datetime import datetime, timezone
from threading import Lock
from typing import Dict, Optional

logger = logging.getLogger(__name__)


class EmailMetrics:
    """Thread-safe metrics collector for email operations."""
    
    def __init__(self):
        self._lock = Lock()
        self._metrics = {
            "emails_sent": 0,
            "emails_failed": 0,
            "emails_retried": 0,
            "total_send_duration_ms": 0,
            "send_count": 0,
            "failure_by_type": defaultdict(int),
            "last_reset": datetime.now(timezone.utc)
        }
    
    def record_success(self, duration_ms: float, retry_count: int = 0):
        """Record successful email send."""
        with self._lock:
            self._metrics["emails_sent"] += 1
            self._metrics["total_send_duration_ms"] += duration_ms
            self._metrics["send_count"] += 1
            if retry_count > 0:
                self._metrics["emails_retried"] += retry_count
    
    def record_failure(self, error_type: str):
        """Record failed email send."""
        with self._lock:
            self._metrics["emails_failed"] += 1
            self._metrics["failure_by_type"][error_type] += 1
    
    def get_metrics(self) -> Dict:
        """Get current metrics snapshot."""
        with self._lock:
            avg_duration = (
                self._metrics["total_send_duration_ms"] / self._metrics["send_count"]
                if self._metrics["send_count"] > 0
                else 0
            )
            
            total_attempts = self._metrics["emails_sent"] + self._metrics["emails_failed"]
            failure_rate = (
                (self._metrics["emails_failed"] / total_attempts * 100)
                if total_attempts > 0
                else 0
            )
            
            return {
                "emails_sent": self._metrics["emails_sent"],
                "emails_failed": self._metrics["emails_failed"],
                "emails_retried": self._metrics["emails_retried"],
                "average_send_duration_ms": round(avg_duration, 2),
                "failure_rate_percent": round(failure_rate, 2),
                "failure_by_type": dict(self._metrics["failure_by_type"]),
                "last_reset": self._metrics["last_reset"].isoformat()
            }
    
    def reset(self):
        """Reset all metrics."""
        with self._lock:
            self._metrics = {
                "emails_sent": 0,
                "emails_failed": 0,
                "emails_retried": 0,
                "total_send_duration_ms": 0,
                "send_count": 0,
                "failure_by_type": defaultdict(int),
                "last_reset": datetime.now(timezone.utc)
            }
    
    def check_failure_rate_alert(self, threshold_percent: float = 10.0) -> bool:
        """Check if failure rate exceeds threshold.
        
        Returns True if alert should be triggered.
        """
        with self._lock:
            total_attempts = self._metrics["emails_sent"] + self._metrics["emails_failed"]
            if total_attempts < 10:  # Need minimum sample size
                return False
            
            failure_rate = (self._metrics["emails_failed"] / total_attempts * 100)
            return failure_rate > threshold_percent


# Global metrics instance
email_metrics = EmailMetrics()


def mask_email(email: str) -> str:
    """Mask email address for PII protection.
    
    Examples:
        user@example.com -> u***@example.com
        john.doe@company.org -> j***@company.org
        a@b.com -> a***@b.com
    """
    if not email or "@" not in email:
        return "***"
    
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        masked_local = local[0] + "***"
    else:
        masked_local = local[0] + "***"
    
    return f"{masked_local}@{domain}"


def mask_password(password: str) -> str:
    """Mask password completely for security.
    
    Never log passwords in any form.
    """
    return "***REDACTED***"


def mask_smtp_config(config: Dict) -> Dict:
    """Mask sensitive fields in SMTP configuration for logging.
    
    Returns a copy with password masked.
    """
    masked = config.copy()
    if "password" in masked:
        masked["password"] = mask_password(masked["password"])
    return masked


@contextmanager
def log_email_operation(
    operation: str,
    tenant_id: str,
    recipient: str,
    scenario: str,
    request_id: Optional[str] = None,
    extra: Optional[Dict] = None
):
    """Context manager for logging email operations with timing and PII masking.
    
    Usage:
        with log_email_operation("send", tenant_id, recipient, "password_reset", request_id):
            # ... send email ...
    """
    start_time = time.time()
    
    log_extra = {
        "operation": operation,
        "tenant_id": tenant_id,
        "recipient": mask_email(recipient),
        "scenario": scenario,
        **({"request_id": request_id} if request_id else {}),
        **(extra or {})
    }
    
    logger.info(
        f"Email operation started: {operation}",
        extra=log_extra
    )
    
    try:
        yield
        duration_ms = (time.time() - start_time) * 1000
        
        logger.info(
            f"Email operation completed: {operation}",
            extra={
                **log_extra,
                "duration_ms": round(duration_ms, 2),
                "status": "success"
            }
        )
    except Exception as e:
        duration_ms = (time.time() - start_time) * 1000
        
        logger.error(
            f"Email operation failed: {operation}",
            extra={
                **log_extra,
                "duration_ms": round(duration_ms, 2),
                "status": "failed",
                "error_type": type(e).__name__,
                "error_message": str(e)
            },
            exc_info=True
        )
        raise


def log_smtp_connection_stats(
    host: str,
    port: int,
    connection_time_ms: float,
    success: bool,
    request_id: Optional[str] = None
):
    """Log SMTP connection pool statistics."""
    log_extra = {
        "smtp_host": host,
        "smtp_port": port,
        "connection_time_ms": round(connection_time_ms, 2),
        "connection_success": success,
        **({"request_id": request_id} if request_id else {})
    }
    
    if success:
        logger.info("SMTP connection established", extra=log_extra)
    else:
        logger.warning("SMTP connection failed", extra=log_extra)


def log_metrics_summary(request_id: Optional[str] = None):
    """Log current email metrics summary."""
    metrics = email_metrics.get_metrics()
    
    logger.info(
        "Email metrics summary",
        extra={
            **metrics,
            **({"request_id": request_id} if request_id else {})
        }
    )
    
    # Check for failure rate alert
    if email_metrics.check_failure_rate_alert(threshold_percent=10.0):
        logger.error(
            "ALERT: Email failure rate exceeds 10% threshold",
            extra={
                "failure_rate_percent": metrics["failure_rate_percent"],
                "emails_failed": metrics["emails_failed"],
                "emails_sent": metrics["emails_sent"],
                **({"request_id": request_id} if request_id else {})
            }
        )
