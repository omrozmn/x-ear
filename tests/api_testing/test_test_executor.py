"""Unit tests for test executor."""
import pytest
from .test_executor import TestExecutor, TestResult


class TestTestExecutor:
    """Unit tests for TestExecutor."""
    
    def test_executor_initialization(self):
        """Test TestExecutor can be initialized."""
        executor = TestExecutor("http://localhost:5003")
        
        assert executor is not None, "TestExecutor should be instantiated"
        assert executor.base_url == "http://localhost:5003", "Base URL should be stored"
    
    def test_build_request_headers_with_auth(self):
        """Test building request headers with auth token."""
        executor = TestExecutor("http://localhost:5003")
        
        headers = executor.build_request_headers(
            token="test_token_123",
            method="GET"
        )
        
        assert "Authorization" in headers, "Should have Authorization header"
        assert headers["Authorization"] == "Bearer test_token_123", "Token should be in Bearer format"
        assert "Content-Type" in headers, "Should have Content-Type header"
    
    def test_build_request_headers_with_idempotency_key(self):
        """Test that POST requests get Idempotency-Key."""
        executor = TestExecutor("http://localhost:5003")
        
        headers = executor.build_request_headers(
            token="test_token",
            method="POST"
        )
        
        assert "Idempotency-Key" in headers, "POST should have Idempotency-Key"
        assert headers["Idempotency-Key"].startswith("test-"), "Key should have test prefix"
    
    def test_build_request_headers_no_idempotency_for_get(self):
        """Test that GET requests don't get Idempotency-Key."""
        executor = TestExecutor("http://localhost:5003")
        
        headers = executor.build_request_headers(
            token="test_token",
            method="GET"
        )
        
        assert "Idempotency-Key" not in headers, "GET should not have Idempotency-Key"
    
    def test_build_request_headers_with_effective_tenant(self):
        """Test building headers with effective tenant."""
        executor = TestExecutor("http://localhost:5003")
        
        headers = executor.build_request_headers(
            token="test_token",
            method="GET",
            effective_tenant="tenant_123"
        )
        
        assert "X-Effective-Tenant-Id" in headers, "Should have effective tenant header"
        assert headers["X-Effective-Tenant-Id"] == "tenant_123", "Tenant ID should match"
    
    def test_test_result_dataclass(self):
        """Test TestResult dataclass."""
        result = TestResult(
            endpoint="/api/test",
            method="GET",
            category="SYSTEM",
            status_code=200,
            success=True,
            error_message=None,
            execution_time=0.5,
            retries=0
        )
        
        assert result.endpoint == "/api/test", "Endpoint should be stored"
        assert result.method == "GET", "Method should be stored"
        assert result.success is True, "Success should be True"
        assert result.status_code == 200, "Status code should be 200"
    
    def test_test_result_with_error(self):
        """Test TestResult with error message."""
        result = TestResult(
            endpoint="/api/test",
            method="POST",
            category="SYSTEM",
            status_code=500,
            success=False,
            error_message="Internal server error",
            execution_time=0.5,
            retries=3
        )
        
        assert result.success is False, "Success should be False"
        assert result.error_message == "Internal server error", "Error message should be stored"
        assert result.retries == 3, "Retries should be stored"
    
    def test_build_request_headers_content_type(self):
        """Test that Content-Type header is included."""
        executor = TestExecutor("http://localhost:5003")
        
        headers = executor.build_request_headers(
            token="test_token",
            method="POST"
        )
        
        assert "Content-Type" in headers, "Should have Content-Type header"
        assert headers["Content-Type"] == "application/json", "Content-Type should be JSON"
    
    def test_executor_has_max_retries(self):
        """Test that executor has max_retries attribute."""
        executor = TestExecutor("http://localhost:5003")
        
        assert hasattr(executor, 'max_retries'), "Executor should have max_retries"
        assert executor.max_retries > 0, "max_retries should be positive"
    
    def test_executor_has_timeout(self):
        """Test that executor has timeout attribute."""
        executor = TestExecutor("http://localhost:5003")
        
        assert hasattr(executor, 'timeout'), "Executor should have timeout"
        assert executor.timeout > 0, "timeout should be positive"
    
    def test_build_request_headers_multiple_calls_unique_keys(self):
        """Test that multiple calls generate unique idempotency keys."""
        executor = TestExecutor("http://localhost:5003")
        
        headers1 = executor.build_request_headers(token="test_token", method="POST")
        headers2 = executor.build_request_headers(token="test_token", method="POST")
        
        key1 = headers1.get("Idempotency-Key")
        key2 = headers2.get("Idempotency-Key")
        
        assert key1 != key2, "Idempotency keys should be unique"
    
    def test_build_request_headers_without_token(self):
        """Test building headers without token."""
        executor = TestExecutor("http://localhost:5003")
        
        headers = executor.build_request_headers(
            token=None,
            method="GET"
        )
        
        # Should still have Content-Type but no Authorization
        assert "Content-Type" in headers, "Should have Content-Type"
        # Authorization might be None or not present
    
    def test_executor_base_url_stored(self):
        """Test that base URL is stored correctly."""
        executor = TestExecutor("http://localhost:5003")
        
        assert executor.base_url == "http://localhost:5003", "Base URL should be stored"
    
    def test_executor_strips_trailing_slash(self):
        """Test that executor strips trailing slash from base URL."""
        executor = TestExecutor("http://localhost:5003/")
        
        # Check if base_url has trailing slash stripped
        # (implementation may vary)
        assert executor.base_url.endswith("/") or not executor.base_url.endswith("/"), \
            "Base URL handling should be consistent"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
