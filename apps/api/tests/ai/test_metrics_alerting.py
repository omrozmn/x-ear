"""
Tests for AI Layer Metrics and Alerting Services

Tests:
- SLA metrics collection (p50/p95 latency, error rate, timeout rate)
- Approval metrics tracking
- Alert threshold checking
- Alert emission and suppression
"""

import pytest
import time
from datetime import datetime, timezone, timedelta

from ai.services.metrics import (
    MetricsCollector,
    MetricType,
    LatencyStats,
    RateStats,
    ApprovalStats,
    QuotaStats,
    SLAMetrics,
    get_metrics_collector,
    record_inference_latency,
    record_intent_latency,
    record_planning_latency,
    record_execution_latency,
    record_success,
    record_error,
    record_timeout,
    record_approval_granted,
    record_approval_rejected,
    record_auto_approved,
    record_quota_rejected,
    record_rate_limited,
    TimingContext,
)

from ai.services.alerting import (
    AlertingService,
    AlertSeverity,
    AlertType,
    AlertThresholds,
    Alert,
    get_alerting_service,
    check_and_alert,
    emit_circuit_breaker_alert,
)


class TestMetricsCollector:
    """Tests for MetricsCollector."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset metrics collector before each test."""
        MetricsCollector.reset()
        yield
        MetricsCollector.reset()
    
    def test_singleton_instance(self):
        """Test that MetricsCollector is a singleton."""
        collector1 = get_metrics_collector()
        collector2 = get_metrics_collector()
        assert collector1 is collector2
    
    def test_record_latency(self):
        """Test recording latency metrics."""
        collector = get_metrics_collector()
        
        # Record some latencies
        collector.record_latency(MetricType.INFERENCE_LATENCY, 100.0)
        collector.record_latency(MetricType.INFERENCE_LATENCY, 200.0)
        collector.record_latency(MetricType.INFERENCE_LATENCY, 300.0)
        
        metrics = collector.get_sla_metrics()
        
        assert metrics.inference_latency.count == 3
        assert metrics.inference_latency.min_ms == 100.0
        assert metrics.inference_latency.max_ms == 300.0
        assert metrics.inference_latency.mean_ms == 200.0
    
    def test_record_events(self):
        """Test recording discrete events."""
        collector = get_metrics_collector()
        
        # Record events
        for _ in range(10):
            record_success()
        for _ in range(2):
            record_error()
        for _ in range(1):
            record_timeout()
        
        metrics = collector.get_sla_metrics()
        
        assert metrics.rates.total_count == 13
        assert metrics.rates.success_count == 10
        assert metrics.rates.error_count == 2
        assert metrics.rates.timeout_count == 1
        assert abs(metrics.rates.error_rate - 2/13) < 0.001
        assert abs(metrics.rates.timeout_rate - 1/13) < 0.001
    
    def test_percentile_calculation(self):
        """Test p50/p95/p99 percentile calculations."""
        collector = get_metrics_collector()
        
        # Record 100 latencies from 1 to 100
        for i in range(1, 101):
            collector.record_latency(MetricType.INFERENCE_LATENCY, float(i))
        
        metrics = collector.get_sla_metrics()
        
        # p50 should be around 50
        assert 49 <= metrics.inference_latency.p50_ms <= 51
        # p95 should be around 95
        assert 94 <= metrics.inference_latency.p95_ms <= 96
        # p99 should be around 99
        assert 98 <= metrics.inference_latency.p99_ms <= 100
    
    def test_approval_metrics(self):
        """Test approval metrics tracking."""
        collector = get_metrics_collector()
        
        # Record approvals
        for _ in range(5):
            record_approval_granted(latency_ms=1000.0)
        for _ in range(3):
            record_approval_rejected(latency_ms=500.0)
        for _ in range(2):
            record_auto_approved()
        
        metrics = collector.get_sla_metrics()
        
        assert metrics.approvals.total_approvals_requested == 10
        assert metrics.approvals.approvals_granted == 5
        assert metrics.approvals.approvals_rejected == 3
        assert metrics.approvals.auto_approved == 2
        assert abs(metrics.approvals.human_approval_rate - 5/8) < 0.001
        assert abs(metrics.approvals.human_rejection_rate - 3/8) < 0.001
        assert abs(metrics.approvals.auto_approval_rate - 2/10) < 0.001
    
    def test_quota_metrics(self):
        """Test quota-related metrics."""
        collector = get_metrics_collector()
        
        # Record quota events
        for _ in range(10):
            record_success()
        for _ in range(2):
            record_quota_rejected()
        for _ in range(1):
            record_rate_limited()
        
        metrics = collector.get_sla_metrics()
        
        assert metrics.quota.total_requests == 13
        assert metrics.quota.quota_rejections == 2
        assert metrics.quota.rate_limited == 1
        assert abs(metrics.quota.quota_rejection_rate - 2/13) < 0.001
        assert abs(metrics.quota.rate_limit_rate - 1/13) < 0.001
    
    def test_timing_context(self):
        """Test TimingContext for automatic latency recording."""
        collector = get_metrics_collector()
        
        with TimingContext(MetricType.INFERENCE_LATENCY) as timer:
            time.sleep(0.01)  # 10ms
        
        assert timer.elapsed_ms >= 10
        
        metrics = collector.get_sla_metrics()
        assert metrics.inference_latency.count == 1
        assert metrics.inference_latency.min_ms >= 10
    
    def test_convenience_functions(self):
        """Test convenience functions for recording metrics."""
        MetricsCollector.reset()
        
        record_inference_latency(100.0, tenant_id="tenant1")
        record_intent_latency(50.0, tenant_id="tenant1")
        record_planning_latency(200.0, tenant_id="tenant1")
        record_execution_latency(500.0, tenant_id="tenant1")
        
        metrics = get_metrics_collector().get_sla_metrics()
        
        assert metrics.inference_latency.count == 1
        assert metrics.intent_latency.count == 1
        assert metrics.planning_latency.count == 1
        assert metrics.execution_latency.count == 1
    
    def test_metrics_to_dict(self):
        """Test that metrics can be serialized to dict."""
        collector = get_metrics_collector()
        
        record_inference_latency(100.0)
        record_success()
        
        metrics = collector.get_sla_metrics()
        metrics_dict = metrics.to_dict()
        
        assert "timestamp" in metrics_dict
        assert "windowMinutes" in metrics_dict
        assert "inferenceLatency" in metrics_dict
        assert "rates" in metrics_dict
        assert "approvals" in metrics_dict
        assert "quota" in metrics_dict


class TestAlertingService:
    """Tests for AlertingService."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset services before each test."""
        MetricsCollector.reset()
        AlertingService.reset()
        yield
        MetricsCollector.reset()
        AlertingService.reset()
    
    def test_singleton_instance(self):
        """Test that AlertingService is a singleton."""
        service1 = get_alerting_service()
        service2 = get_alerting_service()
        assert service1 is service2
    
    def test_error_rate_alert(self):
        """Test alert emission for high error rate."""
        collector = get_metrics_collector()
        alerting = get_alerting_service()
        
        # Set low thresholds for testing
        thresholds = AlertThresholds(
            error_rate_warning=0.05,
            error_rate_critical=0.10,
            min_samples_for_alert=5,
        )
        alerting.set_thresholds(thresholds)
        alerting.set_suppression_window(0)  # Disable suppression for testing
        
        # Record events with 20% error rate
        for _ in range(8):
            record_success()
        for _ in range(2):
            record_error()
        
        alerts = alerting.check_metrics()
        
        # Should have critical error rate alert
        error_alerts = [a for a in alerts if a.alert_type == AlertType.ERROR_RATE_HIGH]
        assert len(error_alerts) == 1
        assert error_alerts[0].severity == AlertSeverity.CRITICAL
    
    def test_latency_alert(self):
        """Test alert emission for high latency."""
        collector = get_metrics_collector()
        alerting = get_alerting_service()
        
        # Set low thresholds for testing
        thresholds = AlertThresholds(
            inference_p95_warning_ms=100.0,
            inference_p95_critical_ms=200.0,
            min_samples_for_alert=5,
        )
        alerting.set_thresholds(thresholds)
        alerting.set_suppression_window(0)
        
        # Record high latencies
        for _ in range(10):
            record_inference_latency(250.0)
        
        alerts = alerting.check_metrics()
        
        # Should have critical latency alert
        latency_alerts = [a for a in alerts if a.alert_type == AlertType.LATENCY_P95_HIGH]
        assert len(latency_alerts) == 1
        assert latency_alerts[0].severity == AlertSeverity.CRITICAL
    
    def test_alert_suppression(self):
        """Test that duplicate alerts are suppressed."""
        collector = get_metrics_collector()
        alerting = get_alerting_service()
        
        thresholds = AlertThresholds(
            error_rate_warning=0.05,
            error_rate_critical=0.10,
            min_samples_for_alert=5,
        )
        alerting.set_thresholds(thresholds)
        alerting.set_suppression_window(60)  # 60 second suppression
        
        # Record events with high error rate
        for _ in range(8):
            record_success()
        for _ in range(2):
            record_error()
        
        # First check should emit alert
        alerts1 = alerting.check_metrics()
        assert len([a for a in alerts1 if a.alert_type == AlertType.ERROR_RATE_HIGH]) == 1
        
        # Second check should be suppressed
        alerts2 = alerting.check_metrics()
        assert len([a for a in alerts2 if a.alert_type == AlertType.ERROR_RATE_HIGH]) == 0
    
    def test_circuit_breaker_alert(self):
        """Test circuit breaker state change alerts."""
        alerting = get_alerting_service()
        alerting.set_suppression_window(0)
        
        alert = emit_circuit_breaker_alert("inference", "open")
        
        assert alert is not None
        assert alert.alert_type == AlertType.CIRCUIT_BREAKER_OPEN
        assert alert.severity == AlertSeverity.CRITICAL
        assert "inference" in alert.message
    
    def test_acknowledge_alert(self):
        """Test alert acknowledgment."""
        alerting = get_alerting_service()
        alerting.set_suppression_window(0)
        
        # Emit an alert
        alert = emit_circuit_breaker_alert("inference", "open")
        assert alert is not None
        
        # Acknowledge it
        result = alerting.acknowledge_alert(alert.alert_id, "admin_user")
        assert result is True
        
        # Verify acknowledgment
        alerts = alerting.get_alerts()
        acked_alert = next((a for a in alerts if a.alert_id == alert.alert_id), None)
        assert acked_alert is not None
        assert acked_alert.acknowledged is True
        assert acked_alert.acknowledged_by == "admin_user"
    
    def test_get_active_alerts(self):
        """Test getting unacknowledged alerts."""
        alerting = get_alerting_service()
        alerting.set_suppression_window(0)
        
        # Emit alerts
        alert1 = emit_circuit_breaker_alert("inference", "open")
        alerting._suppressed_alerts.clear()  # Clear suppression for second alert
        alert2 = emit_circuit_breaker_alert("planning", "open")
        
        # Acknowledge one
        alerting.acknowledge_alert(alert1.alert_id, "admin")
        
        # Get active alerts
        active = alerting.get_active_alerts()
        
        assert len(active) == 1
        assert active[0].alert_id == alert2.alert_id
    
    def test_alert_to_dict(self):
        """Test alert serialization."""
        alerting = get_alerting_service()
        alerting.set_suppression_window(0)
        
        alert = emit_circuit_breaker_alert("inference", "open")
        alert_dict = alert.to_dict()
        
        assert "alertId" in alert_dict
        assert "alertType" in alert_dict
        assert "severity" in alert_dict
        assert "message" in alert_dict
        assert "timestamp" in alert_dict
        assert "metricValue" in alert_dict
        assert "thresholdValue" in alert_dict
    
    def test_custom_alert_handler(self):
        """Test registering custom alert handlers."""
        alerting = get_alerting_service()
        alerting.set_suppression_window(0)
        
        received_alerts = []
        
        def custom_handler(alert: Alert):
            received_alerts.append(alert)
        
        alerting.register_handler(custom_handler)
        
        emit_circuit_breaker_alert("inference", "open")
        
        assert len(received_alerts) == 1
        assert received_alerts[0].alert_type == AlertType.CIRCUIT_BREAKER_OPEN
        
        # Cleanup
        alerting.unregister_handler(custom_handler)
    
    def test_no_alert_below_threshold(self):
        """Test that no alerts are emitted when metrics are within thresholds."""
        collector = get_metrics_collector()
        alerting = get_alerting_service()
        
        thresholds = AlertThresholds(
            error_rate_warning=0.10,
            error_rate_critical=0.20,
            min_samples_for_alert=5,
        )
        alerting.set_thresholds(thresholds)
        
        # Record events with 5% error rate (below warning threshold)
        for _ in range(19):
            record_success()
        for _ in range(1):
            record_error()
        
        alerts = alerting.check_metrics()
        
        # Should have no error rate alerts
        error_alerts = [a for a in alerts if a.alert_type == AlertType.ERROR_RATE_HIGH]
        assert len(error_alerts) == 0
    
    def test_min_samples_requirement(self):
        """Test that alerts require minimum samples."""
        collector = get_metrics_collector()
        alerting = get_alerting_service()
        
        thresholds = AlertThresholds(
            error_rate_warning=0.05,
            error_rate_critical=0.10,
            min_samples_for_alert=10,  # Require 10 samples
        )
        alerting.set_thresholds(thresholds)
        
        # Record only 5 events (below min_samples)
        for _ in range(4):
            record_success()
        for _ in range(1):
            record_error()  # 20% error rate but only 5 samples
        
        alerts = alerting.check_metrics()
        
        # Should have no alerts due to insufficient samples
        error_alerts = [a for a in alerts if a.alert_type == AlertType.ERROR_RATE_HIGH]
        assert len(error_alerts) == 0


class TestMetricsIntegration:
    """Integration tests for metrics and alerting."""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Reset services before each test."""
        MetricsCollector.reset()
        AlertingService.reset()
        yield
        MetricsCollector.reset()
        AlertingService.reset()
    
    def test_full_metrics_flow(self):
        """Test complete metrics collection and alerting flow."""
        collector = get_metrics_collector()
        alerting = get_alerting_service()
        
        # Configure thresholds
        thresholds = AlertThresholds(
            error_rate_warning=0.05,
            error_rate_critical=0.10,
            inference_p95_warning_ms=100.0,
            inference_p95_critical_ms=200.0,
            min_samples_for_alert=5,
        )
        alerting.set_thresholds(thresholds)
        alerting.set_suppression_window(0)
        
        # Simulate normal operation
        for _ in range(10):
            record_inference_latency(50.0)
            record_success()
        
        # Check metrics - should be healthy
        metrics = collector.get_sla_metrics()
        assert metrics.rates.error_rate == 0.0
        assert metrics.inference_latency.p95_ms <= 100.0
        
        alerts = alerting.check_metrics()
        assert len(alerts) == 0
        
        # Simulate degradation
        for _ in range(5):
            record_inference_latency(300.0)
            record_error()
        
        # Check metrics - should trigger alerts
        alerts = alerting.check_metrics()
        assert len(alerts) > 0
        
        # Verify alert types
        alert_types = {a.alert_type for a in alerts}
        assert AlertType.ERROR_RATE_HIGH in alert_types or AlertType.LATENCY_P95_HIGH in alert_types
