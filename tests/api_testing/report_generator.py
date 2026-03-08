"""Test report generation."""
from datetime import datetime
from pathlib import Path
from .failure_analyzer import FailureAnalyzer


class ReportGenerator:
    """Generates test execution reports."""
    
    def __init__(self, analyzer: FailureAnalyzer):
        """Initialize report generator.
        
        Args:
            analyzer: FailureAnalyzer with test results
        """
        self.analyzer = analyzer
    
    def generate_report(self, output_file: str = "test_report.txt") -> str:
        """Generate comprehensive test report.
        
        Args:
            output_file: Output file path
            
        Returns:
            Report content as string
        """
        lines = []
        lines.append("=" * 80)
        lines.append("API TEST EXECUTION REPORT")
        lines.append("=" * 80)
        lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        # Overall statistics
        total = len(self.analyzer.results)
        passed = sum(1 for r in self.analyzer.results if r.success)
        failed = total - passed
        success_rate = self.analyzer.calculate_success_rate()
        
        lines.append("OVERALL STATISTICS")
        lines.append("-" * 80)
        lines.append(f"Total Tests:    {total}")
        lines.append(f"Passed:         {passed}")
        lines.append(f"Failed:         {failed}")
        lines.append(f"Success Rate:   {success_rate:.1f}%")
        lines.append("")
        
        # Category statistics
        lines.append("CATEGORY STATISTICS")
        lines.append("-" * 80)
        category_stats = self.analyzer.group_by_category()
        for cat_name, stats in sorted(category_stats.items()):
            lines.append(f"{cat_name:20} | Passed: {stats.passed:3} | Failed: {stats.failed:3} | Total: {stats.total:3} | Success: {stats.success_rate:5.1f}%")
        lines.append("")
        
        # Failure patterns
        patterns = self.analyzer.identify_patterns()
        if patterns:
            lines.append("FAILURE PATTERNS")
            lines.append("-" * 80)
            for pattern, count in sorted(patterns.items(), key=lambda x: x[1], reverse=True):
                lines.append(f"{pattern:40} | Count: {count}")
            lines.append("")
        
        # Failed tests detail
        failed_tests = self.analyzer.get_failed_tests()
        if failed_tests:
            lines.append("FAILED TESTS DETAIL")
            lines.append("-" * 80)
            for result in failed_tests[:50]:  # Limit to first 50
                lines.append(f"{result.method:6} {result.endpoint:50} | {result.status_code} | {result.error_message[:50]}")
            
            if len(failed_tests) > 50:
                lines.append(f"... and {len(failed_tests) - 50} more failures")
            lines.append("")
        
        # Execution time statistics
        if self.analyzer.results:
            avg_time = sum(r.execution_time for r in self.analyzer.results) / len(self.analyzer.results)
            max_time = max(r.execution_time for r in self.analyzer.results)
            lines.append("EXECUTION TIME STATISTICS")
            lines.append("-" * 80)
            lines.append(f"Average:  {avg_time:.2f}s")
            lines.append(f"Maximum:  {max_time:.2f}s")
            lines.append("")
        
        lines.append("=" * 80)
        
        report_content = "\n".join(lines)
        
        # Write to file
        Path(output_file).write_text(report_content, encoding='utf-8')
        
        return report_content
