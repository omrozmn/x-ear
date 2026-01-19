"""
Alerting Service for AI Layer

Implements alerting for:
- Failure rate threshold breaches
- SLA metric breaches
- Circuit breaker state changes

Requirements:
- 17.6: Emit alerts when AI failure rate exceeds threshold
- 23.5: Emit alerts when SLA metrics breach configured thresholds
"""

import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from threading import Lock
from typing import Any, Callable, Dict, List, Optional

from ai.services.metrics import (
    MetricsCollector,
    MetricType,
    SLAMetrics,
    get_metrics_collector,
)

logger = logging.getLogger(__name__)


class AlertSeverity(str, Enum):
    """Severity levels for alerts."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertType(str, Enum):
    """Types of alerts."""
    ERROR_RATE_HIGH = "error_rate_high"
    TIMEOUT_RATE_HIGH = "timeout_rate_high"
    LATENCY_P95_HIGH = "latency_p95_high"
    LATENCY_P50_HIGH = "latency_p50_high"
    APPROVAL_LATENCY_HIGH = "approval_latency_high"
    REJECTION_RATE_HIGH = "rejection_rate_high"
    QUOTA_REJECTION_HIGH = "quota_rejection_high"
    CIRCUIT_BREAKER_OPEN = "circuit_breaker_open"
    CIRCUIT_BREAKER_HALF_OPEN = "circuit_breaker_half_open"
    SLA_BREACH = "sla_breach"


@dataclass
class AlertThresholds:
    """Configurable thresholds for alerts."""
    # Error rate thresholds (0.0 - 1.0)
    error_rate_warning: float = 0.05      # 5%
    error_rate_critical: float = 0.10     # 10%
    
    # Timeout rate thresholds (0.0 - 1.0)
    timeout_rate_warning: float = 0.03    # 3%
    timeout_rate_critical: float = 0.08   # 8%
    
    # Latency thresholds (milliseconds)
    inference_p95_warning_ms: float = 3000.0    # 3s
    inference_p95_critical_ms: float = 5000.0   # 5s
    inference_p50_warning_ms: float = 1500.0    # 1.5s
    inference_p50_critical_ms: float = 2500.0   # 2.5s
    
    intent_p95_warning_ms: float = 2000.0       # 2s
    intent_p95_critical_ms: float = 3000.0      # 3s
    
    planning_p95_warning_ms: float = 5000.0     # 5s
    planning_p95_critical_ms: float = 8000.0    # 8s
    
    execution_p95_warning_ms: float = 10000.0   # 10s
    execution_p95_critical_ms: float = 15000.0  # 15s
    
    # Approval thresholds
    approval_latency_p95_warning_ms: float = 300000.0   # 5 minutes
    approval_latency_p95_critical_ms: float = 600000.0  # 10 minutes
    rejection_rate_warning: float = 0.30        # 30%
    rejection_rate_critical: float = 0.50       # 50%
    
    # Quota thresholds
    quota_rejection_rate_warning: float = 0.10  # 10%
    quota_rejection_rate_critical: float = 0.25 # 25%
    
    # Minimum samples required before alerting
    min_samples_for_alert: int = 10


@dataclass
class Alert:
    """An alert instance."""
    alert_id: str
    alert_type: AlertType
    severity: AlertSeverity
    message: str
    timestamp: datetime
    metric_value: float
    threshold_value: float
    tenant_id: Optional[str] = None
    extra_data: Dict[str, Any] = field(default_factory=dict)
    acknowledged: bool = False
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "alertId": self.alert_id,
            "alertType": self.alert_type.value,
            "severity": self.severity.value,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "metricValue": self.metric_value,
            "thresholdValue": self.threshold_value,
            "tenantId": self.tenant_id,
            "extraData": self.extra_data,
            "acknowledged": self.acknowledged,
            "acknowledgedBy": self.acknowledged_by,
            "acknowledgedAt": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
        }


# Type alias for alert handlers
AlertHandler = Callable[[Alert], None]


class AlertingService:
    """
    Alerting service for AI Layer SLA monitoring.
    
    This service:
    - Monitors SLA metrics against configured thresholds
    - Generates alerts when thresholds are breached
    - Supports custom alert handlers (logging, webhooks, etc.)
    - Tracks alert history and acknowledgments
    
    This is a singleton service.
    """
    
    _instance: Optional["AlertingService"] = None
    
    def __init__(self):
        """Initialize the alerting service."""
        self._lock = Lock()
        self._thresholds = AlertThresholds()
        self._handlers: List[AlertHandler] = []
        self._alerts: List[Alert] = []
        self._alert_counter = 0
        self._suppressed_alerts: Dict[str, datetime] = {}
        self._suppression_window_seconds = 300  # 5 minutes
        
        # Register default logging handler
        self._handlers.append(self._default_log_handler)
    
    @classmethod
    def get(cls) -> "AlertingService":
        """Get the singleton AlertingService instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (for testing)."""
        cls._instance = None
    
    def set_thresholds(self, thresholds: AlertThresholds) -> None:
        """Set alert thresholds."""
        with self._lock:
            self._thresholds = thresholds
    
    def get_thresholds(self) -> AlertThresholds:
        """Get current alert thresholds."""
        return self._thresholds
    
    def set_suppression_window(self, seconds: int) -> None:
        """Set the alert suppression window in seconds."""
        self._suppression_window_seconds = seconds
    
    def register_handler(self, handler: AlertHandler) -> None:
        """Register an alert handler."""
        with self._lock:
            self._handlers.append(handler)
    
    def unregister_handler(self, handler: AlertHandler) -> None:
        """Unregister an alert handler."""
        with self._lock:
            if handler in self._handlers:
                self._handlers.remove(handler)
    
    def _generate_alert_id(self) -> str:
        """Generate a unique alert ID."""
        with self._lock:
            self._alert_counter += 1
            return f"alert_{self._alert_counter}_{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}"
    
    def _is_suppressed(self, alert_type: AlertType, tenant_id: Optional[str] = None) -> bool:
        """Check if an alert type is currently suppressed."""
        key = f"{alert_type.value}:{tenant_id or 'global'}"
        with self._lock:
            if key in self._suppressed_alerts:
                suppressed_at = self._suppressed_alerts[key]
                elapsed = (datetime.now(timezone.utc) - suppressed_at).total_seconds()
                if elapsed < self._suppression_window_seconds:
                    return True
                else:
                    del self._suppressed_alerts[key]
        return False
    
    def _suppress_alert(self, alert_type: AlertType, tenant_id: Optional[str] = None) -> None:
        """Suppress an alert type for the suppression window."""
        key = f"{alert_type.value}:{tenant_id or 'global'}"
        with self._lock:
            self._suppressed_alerts[key] = datetime.now(timezone.utc)
    
    def _default_log_handler(self, alert: Alert) -> None:
        """Default handler that logs alerts."""
        log_method = {
            AlertSeverity.INFO: logger.info,
            AlertSeverity.WARNING: logger.warning,
            AlertSeverity.ERROR: logger.error,
            AlertSeverity.CRITICAL: logger.critical,
        }.get(alert.severity, logger.warning)
        
        log_method(
            f"AI Alert [{alert.severity.value.upper()}]: {alert.message}",
            extra={
                "alert_id": alert.alert_id,
                "alert_type": alert.alert_type.value,
                "metric_value": alert.metric_value,
                "threshold_value": alert.threshold_value,
                "tenant_id": alert.tenant_id,
            }
        )
    
    def _emit_alert(
        self,
        alert_type: AlertType,
        severity: AlertSeverity,
        message: str,
        metric_value: float,
        threshold_value: float,
        tenant_id: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> Optional[Alert]:
        """
        Emit an alert if not suppressed.
        
        Returns the alert if emitted, None if suppressed.
        """
        # Check suppression
        if self._is_suppressed(alert_type, tenant_id):
            logger.debug(f"Alert suppressed: {alert_type.value}")
            return None
        
        # Create alert
        alert = Alert(
            alert_id=self._generate_alert_id(),
            alert_type=alert_type,
            severity=severity,
            message=message,
            timestamp=datetime.now(timezone.utc),
            metric_value=metric_value,
            threshold_value=threshold_value,
            tenant_id=tenant_id,
            extra_data=extra_data or {},
        )
        
        # Store alert
        with self._lock:
            self._alerts.append(alert)
            # Keep only last 1000 alerts
            if len(self._alerts) > 1000:
                self._alerts = self._alerts[-1000:]
        
        # Suppress future alerts of this type
        self._suppress_alert(alert_type, tenant_id)
        
        # Call handlers
        for handler in self._handlers:
            try:
                handler(alert)
            except Exception as e:
                logger.error(f"Alert handler failed: {e}")
        
        return alert
    
    def check_metrics(self, metrics: Optional[SLAMetrics] = None) -> List[Alert]:
        """
        Check metrics against thresholds and emit alerts.
        
        Args:
            metrics: Optional SLAMetrics to check. If None, fetches current metrics.
            
        Returns:
            List of alerts emitted
        """
        if metrics is None:
            metrics = get_metrics_collector().get_sla_metrics()
        
        alerts: List[Alert] = []
        thresholds = self._thresholds
        
        # Check error rate
        if metrics.rates.total_count >= thresholds.min_samples_for_alert:
            if metrics.rates.error_rate >= thresholds.error_rate_critical:
                alert = self._emit_alert(
                    AlertType.ERROR_RATE_HIGH,
                    AlertSeverity.CRITICAL,
                    f"Critical: Error rate is {metrics.rates.error_rate:.1%} (threshold: {thresholds.error_rate_critical:.1%})",
                    metrics.rates.error_rate,
                    thresholds.error_rate_critical,
                )
                if alert:
                    alerts.append(alert)
            elif metrics.rates.error_rate >= thresholds.error_rate_warning:
                alert = self._emit_alert(
                    AlertType.ERROR_RATE_HIGH,
                    AlertSeverity.WARNING,
                    f"Warning: Error rate is {metrics.rates.error_rate:.1%} (threshold: {thresholds.error_rate_warning:.1%})",
                    metrics.rates.error_rate,
                    thresholds.error_rate_warning,
                )
                if alert:
                    alerts.append(alert)
        
        # Check timeout rate
        if metrics.rates.total_count >= thresholds.min_samples_for_alert:
            if metrics.rates.timeout_rate >= thresholds.timeout_rate_critical:
                alert = self._emit_alert(
                    AlertType.TIMEOUT_RATE_HIGH,
                    AlertSeverity.CRITICAL,
                    f"Critical: Timeout rate is {metrics.rates.timeout_rate:.1%} (threshold: {thresholds.timeout_rate_critical:.1%})",
                    metrics.rates.timeout_rate,
                    thresholds.timeout_rate_critical,
                )
                if alert:
                    alerts.append(alert)
            elif metrics.rates.timeout_rate >= thresholds.timeout_rate_warning:
                alert = self._emit_alert(
                    AlertType.TIMEOUT_RATE_HIGH,
                    AlertSeverity.WARNING,
                    f"Warning: Timeout rate is {metrics.rates.timeout_rate:.1%} (threshold: {thresholds.timeout_rate_warning:.1%})",
                    metrics.rates.timeout_rate,
                    thresholds.timeout_rate_warning,
                )
                if alert:
                    alerts.append(alert)
        
        # Check inference latency p95
        if metrics.inference_latency.count >= thresholds.min_samples_for_alert:
            if metrics.inference_latency.p95_ms >= thresholds.inference_p95_critical_ms:
                alert = self._emit_alert(
                    AlertType.LATENCY_P95_HIGH,
                    AlertSeverity.CRITICAL,
                    f"Critical: Inference p95 latency is {metrics.inference_latency.p95_ms:.0f}ms (threshold: {thresholds.inference_p95_critical_ms:.0f}ms)",
                    metrics.inference_latency.p95_ms,
                    thresholds.inference_p95_critical_ms,
                    extra_data={"metric": "inference_latency"},
                )
                if alert:
                    alerts.append(alert)
            elif metrics.inference_latency.p95_ms >= thresholds.inference_p95_warning_ms:
                alert = self._emit_alert(
                    AlertType.LATENCY_P95_HIGH,
                    AlertSeverity.WARNING,
                    f"Warning: Inference p95 latency is {metrics.inference_latency.p95_ms:.0f}ms (threshold: {thresholds.inference_p95_warning_ms:.0f}ms)",
                    metrics.inference_latency.p95_ms,
                    thresholds.inference_p95_warning_ms,
                    extra_data={"metric": "inference_latency"},
                )
                if alert:
                    alerts.append(alert)
        
        # Check inference latency p50
        if metrics.inference_latency.count >= thresholds.min_samples_for_alert:
            if metrics.inference_latency.p50_ms >= thresholds.inference_p50_critical_ms:
                alert = self._emit_alert(
                    AlertType.LATENCY_P50_HIGH,
                    AlertSeverity.CRITICAL,
                    f"Critical: Inference p50 latency is {metrics.inference_latency.p50_ms:.0f}ms (threshold: {thresholds.inference_p50_critical_ms:.0f}ms)",
                    metrics.inference_latency.p50_ms,
                    thresholds.inference_p50_critical_ms,
                    extra_data={"metric": "inference_latency"},
                )
                if alert:
                    alerts.append(alert)
            elif metrics.inference_latency.p50_ms >= thresholds.inference_p50_warning_ms:
                alert = self._emit_alert(
                    AlertType.LATENCY_P50_HIGH,
                    AlertSeverity.WARNING,
                    f"Warning: Inference p50 latency is {metrics.inference_latency.p50_ms:.0f}ms (threshold: {thresholds.inference_p50_warning_ms:.0f}ms)",
                    metrics.inference_latency.p50_ms,
                    thresholds.inference_p50_warning_ms,
                    extra_data={"metric": "inference_latency"},
                )
                if alert:
                    alerts.append(alert)
        
        # Check approval latency
        if metrics.approvals.total_approvals_requested >= thresholds.min_samples_for_alert:
            if metrics.approvals.p95_approval_latency_ms >= thresholds.approval_latency_p95_critical_ms:
                alert = self._emit_alert(
                    AlertType.APPROVAL_LATENCY_HIGH,
                    AlertSeverity.CRITICAL,
                    f"Critical: Approval p95 latency is {metrics.approvals.p95_approval_latency_ms/1000:.1f}s (threshold: {thresholds.approval_latency_p95_critical_ms/1000:.1f}s)",
                    metrics.approvals.p95_approval_latency_ms,
                    thresholds.approval_latency_p95_critical_ms,
                )
                if alert:
                    alerts.append(alert)
            elif metrics.approvals.p95_approval_latency_ms >= thresholds.approval_latency_p95_warning_ms:
                alert = self._emit_alert(
                    AlertType.APPROVAL_LATENCY_HIGH,
                    AlertSeverity.WARNING,
                    f"Warning: Approval p95 latency is {metrics.approvals.p95_approval_latency_ms/1000:.1f}s (threshold: {thresholds.approval_latency_p95_warning_ms/1000:.1f}s)",
                    metrics.approvals.p95_approval_latency_ms,
                    thresholds.approval_latency_p95_warning_ms,
                )
                if alert:
                    alerts.append(alert)
        
        # Check rejection rate
        if metrics.approvals.total_approvals_requested >= thresholds.min_samples_for_alert:
            if metrics.approvals.human_rejection_rate >= thresholds.rejection_rate_critical:
                alert = self._emit_alert(
                    AlertType.REJECTION_RATE_HIGH,
                    AlertSeverity.CRITICAL,
                    f"Critical: Human rejection rate is {metrics.approvals.human_rejection_rate:.1%} (threshold: {thresholds.rejection_rate_critical:.1%})",
                    metrics.approvals.human_rejection_rate,
                    thresholds.rejection_rate_critical,
                )
                if alert:
                    alerts.append(alert)
            elif metrics.approvals.human_rejection_rate >= thresholds.rejection_rate_warning:
                alert = self._emit_alert(
                    AlertType.REJECTION_RATE_HIGH,
                    AlertSeverity.WARNING,
                    f"Warning: Human rejection rate is {metrics.approvals.human_rejection_rate:.1%} (threshold: {thresholds.rejection_rate_warning:.1%})",
                    metrics.approvals.human_rejection_rate,
                    thresholds.rejection_rate_warning,
                )
                if alert:
                    alerts.append(alert)
        
        # Check quota rejection rate
        if metrics.quota.total_requests >= thresholds.min_samples_for_alert:
            if metrics.quota.quota_rejection_rate >= thresholds.quota_rejection_rate_critical:
                alert = self._emit_alert(
                    AlertType.QUOTA_REJECTION_HIGH,
                    AlertSeverity.CRITICAL,
                    f"Critical: Quota rejection rate is {metrics.quota.quota_rejection_rate:.1%} (threshold: {thresholds.quota_rejection_rate_critical:.1%})",
                    metrics.quota.quota_rejection_rate,
                    thresholds.quota_rejection_rate_critical,
                )
                if alert:
                    alerts.append(alert)
            elif metrics.quota.quota_rejection_rate >= thresholds.quota_rejection_rate_warning:
                alert = self._emit_alert(
                    AlertType.QUOTA_REJECTION_HIGH,
                    AlertSeverity.WARNING,
                    f"Warning: Quota rejection rate is {metrics.quota.quota_rejection_rate:.1%} (threshold: {thresholds.quota_rejection_rate_warning:.1%})",
                    metrics.quota.quota_rejection_rate,
                    thresholds.quota_rejection_rate_warning,
                )
                if alert:
                    alerts.append(alert)
        
        return alerts
    
    def emit_circuit_breaker_alert(
        self,
        circuit_name: str,
        state: str,
        tenant_id: Optional[str] = None,
    ) -> Optional[Alert]:
        """
        Emit an alert for circuit breaker state change.
        
        Args:
            circuit_name: Name of the circuit breaker
            state: New state (open, half_open, closed)
            tenant_id: Optional tenant identifier
            
        Returns:
            Alert if emitted, None if suppressed
        """
        if state == "open":
            return self._emit_alert(
                AlertType.CIRCUIT_BREAKER_OPEN,
                AlertSeverity.CRITICAL,
                f"Circuit breaker '{circuit_name}' is OPEN - AI inference unavailable",
                1.0,
                1.0,
                tenant_id=tenant_id,
                extra_data={"circuit_name": circuit_name, "state": state},
            )
        elif state == "half_open":
            return self._emit_alert(
                AlertType.CIRCUIT_BREAKER_HALF_OPEN,
                AlertSeverity.WARNING,
                f"Circuit breaker '{circuit_name}' is HALF-OPEN - testing recovery",
                1.0,
                1.0,
                tenant_id=tenant_id,
                extra_data={"circuit_name": circuit_name, "state": state},
            )
        return None
    
    def acknowledge_alert(
        self,
        alert_id: str,
        acknowledged_by: str,
    ) -> bool:
        """
        Acknowledge an alert.
        
        Args:
            alert_id: ID of the alert to acknowledge
            acknowledged_by: User ID acknowledging the alert
            
        Returns:
            True if alert was found and acknowledged
        """
        with self._lock:
            for alert in self._alerts:
                if alert.alert_id == alert_id:
                    alert.acknowledged = True
                    alert.acknowledged_by = acknowledged_by
                    alert.acknowledged_at = datetime.now(timezone.utc)
                    logger.info(
                        f"Alert acknowledged: {alert_id} by {acknowledged_by}",
                        extra={"alert_id": alert_id, "acknowledged_by": acknowledged_by}
                    )
                    return True
        return False
    
    def get_alerts(
        self,
        severity: Optional[AlertSeverity] = None,
        alert_type: Optional[AlertType] = None,
        acknowledged: Optional[bool] = None,
        limit: int = 100,
    ) -> List[Alert]:
        """
        Get alerts with optional filtering.
        
        Args:
            severity: Filter by severity
            alert_type: Filter by alert type
            acknowledged: Filter by acknowledgment status
            limit: Maximum number of alerts to return
            
        Returns:
            List of matching alerts
        """
        with self._lock:
            alerts = self._alerts.copy()
        
        if severity is not None:
            alerts = [a for a in alerts if a.severity == severity]
        if alert_type is not None:
            alerts = [a for a in alerts if a.alert_type == alert_type]
        if acknowledged is not None:
            alerts = [a for a in alerts if a.acknowledged == acknowledged]
        
        # Sort by timestamp descending
        alerts.sort(key=lambda a: a.timestamp, reverse=True)
        
        return alerts[:limit]
    
    def get_active_alerts(self) -> List[Alert]:
        """Get all unacknowledged alerts."""
        return self.get_alerts(acknowledged=False)
    
    def clear_alerts(self) -> None:
        """Clear all alerts (for testing)."""
        with self._lock:
            self._alerts.clear()
            self._suppressed_alerts.clear()


# =============================================================================
# Convenience Functions
# =============================================================================

def get_alerting_service() -> AlertingService:
    """Get the singleton AlertingService instance."""
    return AlertingService.get()


def check_and_alert() -> List[Alert]:
    """Check current metrics and emit any necessary alerts."""
    return get_alerting_service().check_metrics()


def emit_circuit_breaker_alert(
    circuit_name: str,
    state: str,
    tenant_id: Optional[str] = None,
) -> Optional[Alert]:
    """Emit a circuit breaker state change alert."""
    return get_alerting_service().emit_circuit_breaker_alert(
        circuit_name, state, tenant_id
    )
