"""Tests for email monitoring utilities."""

import pytest
from utils.email_monitoring import (
    EmailMetrics,
    mask_email,
    mask_password,
    mask_smtp_config,
)


class TestEmailMetrics:
    """Test EmailMetrics class."""
    
    def test_record_success(self):
        """Test recording successful email send."""
        metrics = EmailMetrics()
        
        metrics.record_success(duration_ms=250.5, retry_count=0)
        
        result = metrics.get_metrics()
        assert result["emails_sent"] == 1
        assert result["emails_failed"] == 0
        assert result["emails_retried"] == 0
        assert result["average_send_duration_ms"] == 250.5
        assert result["failure_rate_percent"] == 0.0
    
    def test_record_success_with_retries(self):
        """Test recording successful email send after retries."""
        metrics = EmailMetrics()
        
        metrics.record_success(duration_ms=500.0, retry_count=2)
        
        result = metrics.get_metrics()
        assert result["emails_sent"] == 1
        assert result["emails_retried"] == 2
    
    def test_record_failure(self):
        """Test recording failed email send."""
        metrics = EmailMetrics()
        
        metrics.record_failure("SMTPConnectError")
        
        result = metrics.get_metrics()
        assert result["emails_sent"] == 0
        assert result["emails_failed"] == 1
        assert result["failure_by_type"]["SMTPConnectError"] == 1
    
    def test_failure_rate_calculation(self):
        """Test failure rate percentage calculation."""
        metrics = EmailMetrics()
        
        # 7 successful, 3 failed = 30% failure rate
        for _ in range(7):
            metrics.record_success(duration_ms=200.0)
        for _ in range(3):
            metrics.record_failure("SMTPConnectError")
        
        result = metrics.get_metrics()
        assert result["emails_sent"] == 7
        assert result["emails_failed"] == 3
        assert result["failure_rate_percent"] == 30.0
    
    def test_average_duration_calculation(self):
        """Test average send duration calculation."""
        metrics = EmailMetrics()
        
        metrics.record_success(duration_ms=100.0)
        metrics.record_success(duration_ms=200.0)
        metrics.record_success(duration_ms=300.0)
        
        result = metrics.get_metrics()
        assert result["average_send_duration_ms"] == 200.0
    
    def test_check_failure_rate_alert_below_threshold(self):
        """Test failure rate alert when below threshold."""
        metrics = EmailMetrics()
        
        # 95 successful, 5 failed = 5% failure rate (below 10% threshold)
        for _ in range(95):
            metrics.record_success(duration_ms=200.0)
        for _ in range(5):
            metrics.record_failure("SMTPConnectError")
        
        assert not metrics.check_failure_rate_alert(threshold_percent=10.0)
    
    def test_check_failure_rate_alert_above_threshold(self):
        """Test failure rate alert when above threshold."""
        metrics = EmailMetrics()
        
        # 85 successful, 15 failed = 15% failure rate (above 10% threshold)
        for _ in range(85):
            metrics.record_success(duration_ms=200.0)
        for _ in range(15):
            metrics.record_failure("SMTPConnectError")
        
        assert metrics.check_failure_rate_alert(threshold_percent=10.0)
    
    def test_check_failure_rate_alert_insufficient_samples(self):
        """Test failure rate alert with insufficient sample size."""
        metrics = EmailMetrics()
        
        # Only 5 attempts (below minimum of 10)
        for _ in range(3):
            metrics.record_success(duration_ms=200.0)
        for _ in range(2):
            metrics.record_failure("SMTPConnectError")
        
        # Should not trigger alert due to insufficient samples
        assert not metrics.check_failure_rate_alert(threshold_percent=10.0)
    
    def test_reset_metrics(self):
        """Test resetting metrics."""
        metrics = EmailMetrics()
        
        metrics.record_success(duration_ms=200.0)
        metrics.record_failure("SMTPConnectError")
        
        metrics.reset()
        
        result = metrics.get_metrics()
        assert result["emails_sent"] == 0
        assert result["emails_failed"] == 0
        assert result["emails_retried"] == 0
        assert result["average_send_duration_ms"] == 0.0
        assert result["failure_rate_percent"] == 0.0
        assert result["failure_by_type"] == {}
    
    def test_thread_safety(self):
        """Test thread-safe operations."""
        import threading
        
        metrics = EmailMetrics()
        
        def record_successes():
            for _ in range(100):
                metrics.record_success(duration_ms=200.0)
        
        def record_failures():
            for _ in range(50):
                metrics.record_failure("SMTPConnectError")
        
        # Run concurrent operations
        threads = [
            threading.Thread(target=record_successes),
            threading.Thread(target=record_failures),
            threading.Thread(target=record_successes),
        ]
        
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        
        result = metrics.get_metrics()
        assert result["emails_sent"] == 200
        assert result["emails_failed"] == 50


class TestPIIMasking:
    """Test PII masking functions."""
    
    def test_mask_email_standard(self):
        """Test masking standard email addresses."""
        assert mask_email("user@example.com") == "u***@example.com"
        assert mask_email("john.doe@company.org") == "j***@company.org"
        assert mask_email("admin@test.co.uk") == "a***@test.co.uk"
    
    def test_mask_email_single_char(self):
        """Test masking email with single character local part."""
        assert mask_email("a@b.com") == "a***@b.com"
    
    def test_mask_email_invalid(self):
        """Test masking invalid email addresses."""
        assert mask_email("not-an-email") == "***"
        assert mask_email("") == "***"
        assert mask_email(None) == "***"
    
    def test_mask_password(self):
        """Test password masking."""
        assert mask_password("secret123") == "***REDACTED***"
        assert mask_password("") == "***REDACTED***"
        assert mask_password("very-long-password-12345") == "***REDACTED***"
    
    def test_mask_smtp_config(self):
        """Test masking SMTP configuration."""
        config = {
            "host": "mail.example.com",
            "port": 465,
            "username": "user@example.com",
            "password": "secret123",
            "from_email": "info@example.com"
        }
        
        masked = mask_smtp_config(config)
        
        # Original should not be modified
        assert config["password"] == "secret123"
        
        # Masked copy should have password redacted
        assert masked["password"] == "***REDACTED***"
        assert masked["host"] == "mail.example.com"
        assert masked["username"] == "user@example.com"
    
    def test_mask_smtp_config_no_password(self):
        """Test masking SMTP config without password field."""
        config = {
            "host": "mail.example.com",
            "port": 465,
        }
        
        masked = mask_smtp_config(config)
        
        assert "password" not in masked
        assert masked["host"] == "mail.example.com"


class TestLogEmailOperation:
    """Test log_email_operation context manager."""
    
    def test_successful_operation(self, caplog):
        """Test logging successful email operation."""
        from utils.email_monitoring import log_email_operation
        
        with log_email_operation(
            operation="send",
            tenant_id="tenant_123",
            recipient="user@example.com",
            scenario="password_reset",
            request_id="req_456"
        ):
            pass  # Simulate successful operation
        
        # Check logs
        assert "Email operation started: send" in caplog.text
        assert "Email operation completed: send" in caplog.text
        
        # Check that log records contain the extra fields
        records = [r for r in caplog.records if "Email operation" in r.message]
        assert len(records) >= 2
        
        # Check first record (started)
        start_record = records[0]
        assert start_record.recipient == "u***@example.com"  # Masked
        assert start_record.tenant_id == "tenant_123"
        assert start_record.request_id == "req_456"
    
    def test_failed_operation(self, caplog):
        """Test logging failed email operation."""
        from utils.email_monitoring import log_email_operation
        
        with pytest.raises(ValueError):
            with log_email_operation(
                operation="send",
                tenant_id="tenant_123",
                recipient="user@example.com",
                scenario="password_reset"
            ):
                raise ValueError("Test error")
        
        # Check logs
        assert "Email operation started: send" in caplog.text
        assert "Email operation failed: send" in caplog.text
        assert "ValueError" in caplog.text
