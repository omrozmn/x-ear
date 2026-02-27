"""Unit tests for report generator."""
import pytest
import tempfile
from pathlib import Path
from .report_generator import ReportGenerator
from .failure_analyzer import FailureAnalyzer
from .test_executor import TestResult


class TestReportGenerator:
    """Unit tests for ReportGenerator."""
    
    def test_report_generator_initialization(self):
        """Test ReportGenerator can be initialized."""
        analyzer = FailureAnalyzer()
        generator = ReportGenerator(analyzer)
        
        assert generator is not None, "Generator should be instantiated"
        assert generator.analyzer is analyzer, "Analyzer should be stored"
    
    def test_generate_report_empty_results(self):
        """Test generating report with no results."""
        analyzer = FailureAnalyzer()
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            report = generator.generate_report(temp_file)
            
            assert "API TEST EXECUTION REPORT" in report, "Should have title"
            assert "OVERALL STATISTICS" in report, "Should have overall stats"
            assert "Total Tests:    0" in report, "Should show 0 total"
            assert "Passed:         0" in report, "Should show 0 passed"
            assert "Failed:         0" in report, "Should show 0 failed"
            
            # Verify file was created
            assert Path(temp_file).exists(), "Report file should be created"
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_generate_report_with_passed_tests(self):
        """Test generating report with passed tests."""
        analyzer = FailureAnalyzer()
        
        # Add passed tests
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
        
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            report = generator.generate_report(temp_file)
            
            assert "Total Tests:    5" in report, "Should show 5 total"
            assert "Passed:         5" in report, "Should show 5 passed"
            assert "Failed:         0" in report, "Should show 0 failed"
            assert "Success Rate:   100.0%" in report, "Should show 100% success"
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_generate_report_with_failed_tests(self):
        """Test generating report with failed tests."""
        analyzer = FailureAnalyzer()
        
        # Add failed tests
        for i in range(3):
            analyzer.add_result(TestResult(
                endpoint=f"/api/test/{i}",
                method="GET",
                category="SYSTEM",
                status_code=500,
                success=False,
                error_message="Internal server error",
                execution_time=0.1,
                retries=0
            ))
        
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            report = generator.generate_report(temp_file)
            
            assert "Total Tests:    3" in report, "Should show 3 total"
            assert "Passed:         0" in report, "Should show 0 passed"
            assert "Failed:         3" in report, "Should show 3 failed"
            assert "Success Rate:   0.0%" in report, "Should show 0% success"
            assert "FAILED TESTS DETAIL" in report, "Should have failed tests section"
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_generate_report_with_mixed_results(self):
        """Test generating report with mixed results."""
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
                status_code=404,
                success=False,
                error_message="Not found",
                execution_time=0.1,
                retries=0
            ))
        
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            report = generator.generate_report(temp_file)
            
            assert "Total Tests:    10" in report, "Should show 10 total"
            assert "Passed:         7" in report, "Should show 7 passed"
            assert "Failed:         3" in report, "Should show 3 failed"
            assert "Success Rate:   70.0%" in report, "Should show 70% success"
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_generate_report_category_statistics(self):
        """Test that report includes category statistics."""
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
        
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            report = generator.generate_report(temp_file)
            
            assert "CATEGORY STATISTICS" in report, "Should have category stats"
            assert "SYSTEM" in report, "Should show SYSTEM category"
            assert "ADMIN_PANEL" in report, "Should show ADMIN_PANEL category"
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_generate_report_failure_patterns(self):
        """Test that report includes failure patterns."""
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
        
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            report = generator.generate_report(temp_file)
            
            assert "FAILURE PATTERNS" in report, "Should have failure patterns"
            assert "Not Found" in report, "Should show 404 pattern"
            assert "Internal Server Error" in report, "Should show 500 pattern"
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_generate_report_execution_time_stats(self):
        """Test that report includes execution time statistics."""
        analyzer = FailureAnalyzer()
        
        # Add results with varying execution times
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
            status_code=200,
            success=True,
            error_message=None,
            execution_time=0.5,
            retries=0
        ))
        
        analyzer.add_result(TestResult(
            endpoint="/api/test3",
            method="GET",
            category="SYSTEM",
            status_code=200,
            success=True,
            error_message=None,
            execution_time=1.0,
            retries=0
        ))
        
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            report = generator.generate_report(temp_file)
            
            assert "EXECUTION TIME STATISTICS" in report, "Should have execution time stats"
            assert "Average:" in report, "Should show average time"
            assert "Maximum:" in report, "Should show maximum time"
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_generate_report_limits_failed_tests(self):
        """Test that report limits failed tests to first 50."""
        analyzer = FailureAnalyzer()
        
        # Add 60 failed tests
        for i in range(60):
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
        
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            report = generator.generate_report(temp_file)
            
            assert "... and 10 more failures" in report, \
                "Should indicate more failures beyond first 50"
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_generate_report_file_creation(self):
        """Test that report file is created."""
        analyzer = FailureAnalyzer()
        analyzer.add_result(TestResult(
            endpoint="/api/test",
            method="GET",
            category="SYSTEM",
            status_code=200,
            success=True,
            error_message=None,
            execution_time=0.1,
            retries=0
        ))
        
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            generator.generate_report(temp_file)
            
            assert Path(temp_file).exists(), "Report file should be created"
            
            # Verify file content
            content = Path(temp_file).read_text(encoding='utf-8')
            assert "API TEST EXECUTION REPORT" in content, \
                "File should contain report content"
        finally:
            Path(temp_file).unlink(missing_ok=True)
    
    def test_generate_report_timestamp(self):
        """Test that report includes timestamp."""
        analyzer = FailureAnalyzer()
        generator = ReportGenerator(analyzer)
        
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            temp_file = f.name
        
        try:
            report = generator.generate_report(temp_file)
            
            assert "Generated:" in report, "Should have timestamp"
            # Check for date format (YYYY-MM-DD)
            import re
            assert re.search(r'\d{4}-\d{2}-\d{2}', report), \
                "Should have date in YYYY-MM-DD format"
        finally:
            Path(temp_file).unlink(missing_ok=True)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
