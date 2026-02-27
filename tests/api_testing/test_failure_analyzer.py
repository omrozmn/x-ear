"""Unit tests for failure analyzer."""
import pytest
from .failure_analyzer import FailureAnalyzer, CategoryStats
from .test_executor import TestResult


class TestCategoryStats:
    """Unit tests for CategoryStats."""
    
    def test_category_stats_initialization(self):
        """Test CategoryStats can be initialized."""
        stats = CategoryStats(
            category="SYSTEM",
            passed=10,
            failed=5,
            total=15
        )
        
        assert stats.category == "SYSTEM", "Category should be stored"
        assert stats.passed == 10, "Passed count should be stored"
        assert stats.failed == 5, "Failed count should be stored"
        assert stats.total == 15, "Total count should be stored"
    
    def test_success_rate_calculation(self):
        """Test success rate calculation."""
        stats = CategoryStats(
            category="SYSTEM",
            passed=10,
            failed=5,
            total=15
        )
        
        expected_rate = (10 / 15) * 100
        assert abs(stats.success_rate - expected_rate) < 0.01, \
            f"Success rate should be {expected_rate}%"
    
    def test_success_rate_zero_total(self):
        """Test success rate when total is zero."""
        stats = CategoryStats(
            category="SYSTEM",
            passed=0,
            failed=0,
            total=0
        )
        
        assert stats.success_rate == 0.0, "Success rate should be 0 when total is 0"
    
    def test_success_rate_all_passed(self):
        """Test success rate when all tests passed."""
        stats = CategoryStats(
            category="SYSTEM",
            passed=20,
            failed=0,
            total=20
        )
        
        assert stats.success_rate == 100.0, "Success rate should be 100% when all passed"
    
    def test_success_rate_all_failed(self):
        """Test success rate when all tests failed."""
        stats = CategoryStats(
            category="SYSTEM",
            passed=0,
            failed=20,
            total=20
        )
        
        assert stats.success_rate == 0.0, "Success rate should be 0% when all failed"


class TestFailureAnalyzer:
    """Unit tests for FailureAnalyzer."""
    
    def test_analyzer_initialization(self):
        """Test FailureAnalyzer can be initialized."""
        analyzer = FailureAnalyzer()
        
        assert analyzer is not None, "Analyzer should be instantiated"
        assert len(analyzer.results) == 0, "Results should be empty initially"
    
    def test_add_result(self):
        """Test adding a result to analyzer."""
        analyzer = FailureAnalyzer()
        
        result = TestResult(
            endpoint="/api/test",
            method="GET",
            category="SYSTEM",
            status_code=200,
            success=True,
            error_message=None,
            execution_time=0.1,
            retries=0
        )
        
        analyzer.add_result(result)
        
        assert len(analyzer.results) == 1, "Should have 1 result"
        assert analyzer.results[0] == result, "Result should be stored"
    
    def test_categorize_failure_401(self):
        """Test categorizing 401 Unauthorized failure."""
        analyzer = FailureAnalyzer()
        
        result = TestResult(
            endpoint="/api/test",
            method="GET",
            category="SYSTEM",
            status_code=401,
            success=False,
            error_message="Unauthorized",
            execution_time=0.1,
            retries=0
        )
        
        category = analyzer.categorize_failure(result)
        
        assert category == "Unauthorized (Auth issue)", \
            "401 should be categorized as auth issue"
    
    def test_categorize_failure_404(self):
        """Test categorizing 404 Not Found failure."""
        analyzer = FailureAnalyzer()
        
        result = TestResult(
            endpoint="/api/test",
            method="GET",
            category="SYSTEM",
            status_code=404,
            success=False,
            error_message="Not found",
            execution_time=0.1,
            retries=0
        )
        
        category = analyzer.categorize_failure(result)
        
        assert category == "Not Found (Missing resource or unimplemented)", \
            "404 should be categorized as not found"
    
    def test_categorize_failure_422(self):
        """Test categorizing 422 Validation Error failure."""
        analyzer = FailureAnalyzer()
        
        result = TestResult(
            endpoint="/api/test",
            method="POST",
            category="SYSTEM",
            status_code=422,
            success=False,
            error_message="Validation error",
            execution_time=0.1,
            retries=0
        )
        
        category = analyzer.categorize_failure(result)
        
        assert category == "Validation Error (Invalid request data)", \
            "422 should be categorized as validation error"
    
    def test_categorize_failure_500(self):
        """Test categorizing 500 Internal Server Error failure."""
        analyzer = FailureAnalyzer()
        
        result = TestResult(
            endpoint="/api/test",
            method="GET",
            category="SYSTEM",
            status_code=500,
            success=False,
            error_message="Internal error",
            execution_time=0.1,
            retries=0
        )
        
        category = analyzer.categorize_failure(result)
        
        assert category == "Internal Server Error (Backend bug)", \
            "500 should be categorized as backend bug"
    
    def test_categorize_failure_timeout(self):
        """Test categorizing timeout/connection failure."""
        analyzer = FailureAnalyzer()
        
        result = TestResult(
            endpoint="/api/test",
            method="GET",
            category="SYSTEM",
            status_code=0,
            success=False,
            error_message="Connection timeout",
            execution_time=15.0,
            retries=3
        )
        
        category = analyzer.categorize_failure(result)
        
        assert category == "Connection/Timeout Error", \
            "Status 0 should be categorized as connection/timeout"
    
    def test_categorize_failure_other_status(self):
        """Test categorizing other HTTP status codes."""
        analyzer = FailureAnalyzer()
        
        result = TestResult(
            endpoint="/api/test",
            method="GET",
            category="SYSTEM",
            status_code=403,
            success=False,
            error_message="Forbidden",
            execution_time=0.1,
            retries=0
        )
        
        category = analyzer.categorize_failure(result)
        
        assert category == "HTTP 403", \
            "Other status codes should be formatted as HTTP XXX"
    
    def test_calculate_success_rate_empty(self):
        """Test success rate calculation with no results."""
        analyzer = FailureAnalyzer()
        
        rate = analyzer.calculate_success_rate()
        
        assert rate == 0.0, "Success rate should be 0 with no results"
    
    def test_calculate_success_rate_all_passed(self):
        """Test success rate calculation when all tests passed."""
        analyzer = FailureAnalyzer()
        
        for i in range(10):
            analyzer.add_result(TestResult(
                endpoint=f"/api/test/{i}",
                method="GET",
                category="SYSTEM",
                status_code=200,
                success=True,
                error_message=None,
                execution_time=0.1,
                retries=0
            ))
        
        rate = analyzer.calculate_success_rate()
        
        assert rate == 100.0, "Success rate should be 100% when all passed"
    
    def test_calculate_success_rate_all_failed(self):
        """Test success rate calculation when all tests failed."""
        analyzer = FailureAnalyzer()
        
        for i in range(10):
            analyzer.add_result(TestResult(
                endpoint=f"/api/test/{i}",
                method="GET",
                category="SYSTEM",
                status_code=500,
                success=False,
                error_message="Error",
                execution_time=0.1,
                retries=0
            ))
        
        rate = analyzer.calculate_success_rate()
        
        assert rate == 0.0, "Success rate should be 0% when all failed"
    
    def test_calculate_success_rate_mixed(self):
        """Test success rate calculation with mixed results."""
        analyzer = FailureAnalyzer()
        
        # Add 7 passed
        for i in range(7):
            analyzer.add_result(TestResult(
                endpoint=f"/api/test/{i}",
                method="GET",
                category="SYSTEM",
                status_code=200,
                success=True,
                error_message=None,
                execution_time=0.1,
                retries=0
            ))
        
        # Add 3 failed
        for i in range(3):
            analyzer.add_result(TestResult(
                endpoint=f"/api/test/{i+7}",
                method="GET",
                category="SYSTEM",
                status_code=500,
                success=False,
                error_message="Error",
                execution_time=0.1,
                retries=0
            ))
        
        rate = analyzer.calculate_success_rate()
        
        expected_rate = (7 / 10) * 100
        assert abs(rate - expected_rate) < 0.01, \
            f"Success rate should be {expected_rate}%"
    
    def test_get_failed_tests(self):
        """Test getting list of failed tests."""
        analyzer = FailureAnalyzer()
        
        # Add 5 passed
        for i in range(5):
            analyzer.add_result(TestResult(
                endpoint=f"/api/test/{i}",
                method="GET",
                category="SYSTEM",
                status_code=200,
                success=True,
                error_message=None,
                execution_time=0.1,
                retries=0
            ))
        
        # Add 3 failed
        for i in range(3):
            analyzer.add_result(TestResult(
                endpoint=f"/api/test/{i+5}",
                method="GET",
                category="SYSTEM",
                status_code=500,
                success=False,
                error_message="Error",
                execution_time=0.1,
                retries=0
            ))
        
        failed = analyzer.get_failed_tests()
        
        assert len(failed) == 3, "Should return 3 failed tests"
        assert all(not r.success for r in failed), "All returned tests should be failures"
    
    def test_identify_patterns(self):
        """Test identifying common failure patterns."""
        analyzer = FailureAnalyzer()
        
        # Add various failures
        analyzer.add_result(TestResult(
            endpoint="/api/test1",
            method="GET",
            category="SYSTEM",
            status_code=404,
            success=False,
            error_message="Not found",
            execution_time=0.1,
            retries=0
        ))
        
        analyzer.add_result(TestResult(
            endpoint="/api/test2",
            method="GET",
            category="SYSTEM",
            status_code=404,
            success=False,
            error_message="Not found",
            execution_time=0.1,
            retries=0
        ))
        
        analyzer.add_result(TestResult(
            endpoint="/api/test3",
            method="GET",
            category="SYSTEM",
            status_code=500,
            success=False,
            error_message="Error",
            execution_time=0.1,
            retries=0
        ))
        
        patterns = analyzer.identify_patterns()
        
        assert "Not Found (Missing resource or unimplemented)" in patterns, \
            "Should identify 404 pattern"
        assert patterns["Not Found (Missing resource or unimplemented)"] == 2, \
            "Should count 2 404 errors"
        assert "Internal Server Error (Backend bug)" in patterns, \
            "Should identify 500 pattern"
        assert patterns["Internal Server Error (Backend bug)"] == 1, \
            "Should count 1 500 error"
    
    def test_group_by_category(self):
        """Test grouping results by endpoint category."""
        analyzer = FailureAnalyzer()
        
        # Add SYSTEM results
        analyzer.add_result(TestResult(
            endpoint="/api/test1",
            method="GET",
            category="SYSTEM",
            status_code=200,
            success=True,
            error_message=None,
            execution_time=0.1,
            retries=0
        ))
        
        analyzer.add_result(TestResult(
            endpoint="/api/test2",
            method="GET",
            category="SYSTEM",
            status_code=500,
            success=False,
            error_message="Error",
            execution_time=0.1,
            retries=0
        ))
        
        # Add ADMIN_PANEL results
        analyzer.add_result(TestResult(
            endpoint="/api/admin/test",
            method="GET",
            category="ADMIN_PANEL",
            status_code=200,
            success=True,
            error_message=None,
            execution_time=0.1,
            retries=0
        ))
        
        stats = analyzer.group_by_category()
        
        assert "SYSTEM" in stats, "Should have SYSTEM category"
        assert "ADMIN_PANEL" in stats, "Should have ADMIN_PANEL category"
        
        system_stats = stats["SYSTEM"]
        assert system_stats.total == 2, "SYSTEM should have 2 tests"
        assert system_stats.passed == 1, "SYSTEM should have 1 passed"
        assert system_stats.failed == 1, "SYSTEM should have 1 failed"
        
        admin_stats = stats["ADMIN_PANEL"]
        assert admin_stats.total == 1, "ADMIN_PANEL should have 1 test"
        assert admin_stats.passed == 1, "ADMIN_PANEL should have 1 passed"
        assert admin_stats.failed == 0, "ADMIN_PANEL should have 0 failed"
    
    def test_analyze_comprehensive(self):
        """Test comprehensive analysis of results."""
        analyzer = FailureAnalyzer()
        
        results = [
            TestResult(
                endpoint="/api/test1",
                method="GET",
                category="SYSTEM",
                status_code=200,
                success=True,
                error_message=None,
                execution_time=0.1,
                retries=0
            ),
            TestResult(
                endpoint="/api/test2",
                method="GET",
                category="SYSTEM",
                status_code=404,
                success=False,
                error_message="Not found",
                execution_time=0.1,
                retries=0
            ),
            TestResult(
                endpoint="/api/admin/test",
                method="GET",
                category="ADMIN_PANEL",
                status_code=200,
                success=True,
                error_message=None,
                execution_time=0.1,
                retries=0
            )
        ]
        
        analysis = analyzer.analyze(results)
        
        assert analysis["total"] == 3, "Should have 3 total tests"
        assert analysis["passed"] == 2, "Should have 2 passed"
        assert analysis["failed"] == 1, "Should have 1 failed"
        assert abs(analysis["success_rate"] - 66.67) < 0.1, \
            "Success rate should be ~66.67%"
        assert "category_stats" in analysis, "Should have category stats"
        assert "failure_categories" in analysis, "Should have failure categories"
        assert "failed_tests" in analysis, "Should have failed tests list"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
