"""Failure analysis and categorization."""
from typing import List, Dict
from collections import defaultdict
from dataclasses import dataclass
from .test_executor import TestResult
from .endpoint_categorizer import EndpointCategory


@dataclass
class CategoryStats:
    """Statistics for an endpoint category."""
    category: EndpointCategory
    passed: int
    failed: int
    total: int
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate percentage."""
        if self.total == 0:
            return 0.0
        return (self.passed / self.total) * 100


class FailureAnalyzer:
    """Analyzes test failures and generates reports."""
    
    def __init__(self):
        """Initialize failure analyzer."""
        self.results: List[TestResult] = []
    
    def add_result(self, result: TestResult):
        """Add a test result for analysis."""
        self.results.append(result)
    
    def categorize_failure(self, result: TestResult) -> str:
        """Categorize failure by status code.
        
        Args:
            result: Test result
            
        Returns:
            Failure category string
        """
        if result.status_code == 401:
            return "Unauthorized (Auth issue)"
        elif result.status_code == 404:
            return "Not Found (Missing resource or unimplemented)"
        elif result.status_code == 422:
            return "Validation Error (Invalid request data)"
        elif result.status_code >= 500:
            return "Internal Server Error (Backend bug)"
        elif result.status_code == 0:
            return "Connection/Timeout Error"
        else:
            return f"HTTP {result.status_code}"
    
    def group_by_category(self) -> Dict[str, CategoryStats]:
        """Group results by endpoint category.
        
        Returns:
            Dictionary mapping category name to stats
        """
        stats = defaultdict(lambda: {"passed": 0, "failed": 0, "total": 0})
        
        for result in self.results:
            cat = result.category
            stats[cat]["total"] += 1
            if result.success:
                stats[cat]["passed"] += 1
            else:
                stats[cat]["failed"] += 1
        
        return {
            cat: CategoryStats(
                category=cat,
                passed=data["passed"],
                failed=data["failed"],
                total=data["total"]
            )
            for cat, data in stats.items()
        }
    
    def calculate_success_rate(self) -> float:
        """Calculate overall success rate.
        
        Returns:
            Success rate percentage (0-100)
        """
        if not self.results:
            return 0.0
        passed = sum(1 for r in self.results if r.success)
        return (passed / len(self.results)) * 100
    
    def get_failed_tests(self) -> List[TestResult]:
        """Get list of failed tests.
        
        Returns:
            List of failed TestResult objects
        """
        return [r for r in self.results if not r.success]
    
    def identify_patterns(self) -> Dict[str, int]:
        """Identify common failure patterns.
        
        Returns:
            Dictionary mapping pattern to count
        """
        patterns = defaultdict(int)
        
        for result in self.get_failed_tests():
            category = self.categorize_failure(result)
            patterns[category] += 1
        
        return dict(patterns)

    def analyze(self, results: List[TestResult]) -> Dict:
        """Analyze test results and generate analysis report.
        
        Args:
            results: List of test results
            
        Returns:
            Dictionary with analysis data
        """
        self.results = results
        
        # Calculate overall stats
        total = len(results)
        passed = sum(1 for r in results if r.success)
        failed = sum(1 for r in results if not r.success)
        success_rate = self.calculate_success_rate()
        
        # Group by category
        category_stats = self.group_by_category()
        
        # Categorize failures
        failure_categories = defaultdict(list)
        for result in results:
            if not result.success:
                category = self.categorize_failure(result)
                failure_categories[category].append(result)
        
        return {
            "total": total,
            "passed": passed,
            "failed": failed,
            "success_rate": success_rate,
            "category_stats": category_stats,
            "failure_categories": failure_categories,
            "failed_tests": self.get_failed_tests()
        }
