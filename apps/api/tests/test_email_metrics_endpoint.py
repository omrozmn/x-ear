"""Integration tests for email metrics endpoint."""

import pytest
from utils.email_monitoring import email_metrics


class TestEmailMetricsIntegration:
    """Test email metrics integration."""
    
    def test_metrics_reset_and_record(self):
        """Test resetting and recording metrics."""
        email_metrics.reset()
        
        # Record some operations
        email_metrics.record_success(duration_ms=250.0, retry_count=0)
        email_metrics.record_success(duration_ms=300.0, retry_count=1)
        email_metrics.record_failure("SMTPConnectError")
        
        metrics = email_metrics.get_metrics()
        
        assert metrics["emails_sent"] == 2
        assert metrics["emails_failed"] == 1
        assert metrics["emails_retried"] == 1
        assert metrics["average_send_duration_ms"] == 275.0
        assert metrics["failure_by_type"]["SMTPConnectError"] == 1
    
    def test_metrics_calculation_accuracy(self):
        """Test that metrics calculations are accurate."""
        email_metrics.reset()
        
        # Add 90 successful, 10 failed = 10% failure rate
        for _ in range(90):
            email_metrics.record_success(duration_ms=200.0)
        for _ in range(10):
            email_metrics.record_failure("SMTPConnectError")
        
        metrics = email_metrics.get_metrics()
        
        assert metrics["emails_sent"] == 90
        assert metrics["emails_failed"] == 10
        assert metrics["failure_rate_percent"] == 10.0
    
    def test_metrics_multiple_failure_types(self):
        """Test metrics with multiple failure types."""
        email_metrics.reset()
        
        email_metrics.record_failure("SMTPConnectError")
        email_metrics.record_failure("SMTPConnectError")
        email_metrics.record_failure("SMTPAuthenticationError")
        email_metrics.record_failure("SMTPRecipientsRefused")
        
        metrics = email_metrics.get_metrics()
        
        assert metrics["emails_failed"] == 4
        assert metrics["failure_by_type"]["SMTPConnectError"] == 2
        assert metrics["failure_by_type"]["SMTPAuthenticationError"] == 1
        assert metrics["failure_by_type"]["SMTPRecipientsRefused"] == 1
    
    def test_failure_rate_alert_threshold(self):
        """Test failure rate alert triggers correctly."""
        email_metrics.reset()
        
        # Below threshold (5%)
        for _ in range(95):
            email_metrics.record_success(duration_ms=200.0)
        for _ in range(5):
            email_metrics.record_failure("SMTPConnectError")
        
        assert not email_metrics.check_failure_rate_alert(threshold_percent=10.0)
        
        # Above threshold (15%)
        email_metrics.reset()
        for _ in range(85):
            email_metrics.record_success(duration_ms=200.0)
        for _ in range(15):
            email_metrics.record_failure("SMTPConnectError")
        
        assert email_metrics.check_failure_rate_alert(threshold_percent=10.0)
    
    def test_metrics_persistence_across_operations(self):
        """Test that metrics persist across multiple operations."""
        email_metrics.reset()
        
        # First batch
        email_metrics.record_success(duration_ms=100.0)
        email_metrics.record_failure("SMTPConnectError")
        
        # Second batch
        email_metrics.record_success(duration_ms=200.0)
        email_metrics.record_failure("SMTPAuthenticationError")
        
        # Third batch
        email_metrics.record_success(duration_ms=300.0)
        
        metrics = email_metrics.get_metrics()
        
        assert metrics["emails_sent"] == 3
        assert metrics["emails_failed"] == 2
        assert metrics["failure_by_type"]["SMTPConnectError"] == 1
        assert metrics["failure_by_type"]["SMTPAuthenticationError"] == 1
        assert metrics["average_send_duration_ms"] == 200.0  # (100+200+300)/3

