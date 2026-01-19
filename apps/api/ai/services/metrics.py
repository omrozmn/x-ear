"""
SLA Metrics Collection Service for AI Layer

Implements comprehensive metrics collection for:
- p50/p95 inference latency
- Error rate, timeout rate
- Approval metrics (latency, rejection rate, auto-approval rate)
- Quota rejection tracking

Requirements:
- 23.1: Track and expose p50/p95 inference latency, error rate, timeout rate
- 23.2: Track approval metrics: approval_latency, human_rejection_rate, auto_approval_rate
"""

import logging
import statistics
import time
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from enum import Enum
from threading import Lock
from typing import Any, Callable, Dict, List, Optional, TypeVar
from functools import wraps

logger = logging.getLogger(__name__)

T = TypeVar('T')


class MetricType(str, Enum):
    """Types of metrics tracked."""
    INFERENCE_LATENCY = "inference_latency"
    INTENT_LATENCY = "intent_latency"
    PLANNING_LATENCY = "planning_latency"
    EXECUTION_LATENCY = "execution_latency"
    APPROVAL_LATENCY = "approval_latency"
    ERROR = "error"
    TIMEOUT = "timeout"
    SUCCESS = "success"
    APPROVAL_GRANTED = "approval_granted"
    APPROVAL_REJECTED = "approval_rejected"
    AUTO_APPROVED = "auto_approved"
    QUOTA_REJECTED = "quota_rejected"
    RATE_LIMITED = "rate_limited"
    CIRCUIT_BREAKER_OPEN = "circuit_breaker_open"


@dataclass
class MetricDataPoint:
    """A single metric data point."""
    metric_type: MetricType
    value: float
    timestamp: datetime
    tenant_id: Optional[str] = None
    user_id: Optional[str] = None
    model_id: Optional[str] = None
    extra_labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class LatencyStats:
    """Statistics for latency metrics."""
    count: int
    min_ms: float
    max_ms: float
    mean_ms: float
    p50_ms: float
    p95_ms: float
    p99_ms: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "count": self.count,
            "minMs": round(self.min_ms, 2),
            "maxMs": round(self.max_ms, 2),
            "meanMs": round(self.mean_ms, 2),
            "p50Ms": round(self.p50_ms, 2),
            "p95Ms": round(self.p95_ms, 2),
            "p99Ms": round(self.p99_ms, 2),
        }


@dataclass
class RateStats:
    """Statistics for rate metrics (errors, timeouts, etc.)."""
    total_count: int
    success_count: int
    error_count: int
    timeout_count: int
    error_rate: float
    timeout_rate: float
    success_rate: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "totalCount": self.total_count,
            "successCount": self.success_count,
            "errorCount": self.error_count,
            "timeoutCount": self.timeout_count,
            "errorRate": round(self.error_rate, 4),
            "timeoutRate": round(self.timeout_rate, 4),
            "successRate": round(self.success_rate, 4),
        }


@dataclass
class ApprovalStats:
    """Statistics for approval metrics."""
    total_approvals_requested: int
    approvals_granted: int
    approvals_rejected: int
    auto_approved: int
    human_approval_rate: float
    human_rejection_rate: float
    auto_approval_rate: float
    avg_approval_latency_ms: float
    p50_approval_latency_ms: float
    p95_approval_latency_ms: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "totalApprovalsRequested": self.total_approvals_requested,
            "approvalsGranted": self.approvals_granted,
            "approvalsRejected": self.approvals_rejected,
            "autoApproved": self.auto_approved,
            "humanApprovalRate": round(self.human_approval_rate, 4),
            "humanRejectionRate": round(self.human_rejection_rate, 4),
            "autoApprovalRate": round(self.auto_approval_rate, 4),
            "avgApprovalLatencyMs": round(self.avg_approval_latency_ms, 2),
            "p50ApprovalLatencyMs": round(self.p50_approval_latency_ms, 2),
            "p95ApprovalLatencyMs": round(self.p95_approval_latency_ms, 2),
        }


@dataclass
class QuotaStats:
    """Statistics for quota-related metrics."""
    total_requests: int
    quota_rejections: int
    rate_limited: int
    quota_rejection_rate: float
    rate_limit_rate: float
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "totalRequests": self.total_requests,
            "quotaRejections": self.quota_rejections,
            "rateLimited": self.rate_limited,
            "quotaRejectionRate": round(self.quota_rejection_rate, 4),
            "rateLimitRate": round(self.rate_limit_rate, 4),
        }


@dataclass
class SLAMetrics:
    """Complete SLA metrics snapshot."""
    timestamp: datetime
    window_minutes: int
    inference_latency: LatencyStats
    intent_latency: LatencyStats
    planning_latency: LatencyStats
    execution_latency: LatencyStats
    rates: RateStats
    approvals: ApprovalStats
    quota: QuotaStats
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "windowMinutes": self.window_minutes,
            "inferenceLatency": self.inference_latency.to_dict(),
            "intentLatency": self.intent_latency.to_dict(),
            "planningLatency": self.planning_latency.to_dict(),
            "executionLatency": self.execution_latency.to_dict(),
            "rates": self.rates.to_dict(),
            "approvals": self.approvals.to_dict(),
            "quota": self.quota.to_dict(),
        }


class MetricsCollector:
    """
    Collects and aggregates SLA metrics for the AI Layer.
    
    This is a singleton service that tracks:
    - Latency metrics (p50/p95 for inference, intent, planning, execution)
    - Error and timeout rates
    - Approval metrics (latency, rejection rate, auto-approval rate)
    - Quota rejection tracking
    
    Metrics are stored in a sliding window for aggregation.
    """
    
    _instance: Optional["MetricsCollector"] = None
    
    # Default window size for metrics aggregation (15 minutes)
    DEFAULT_WINDOW_MINUTES = 15
    
    # Maximum data points to keep per metric type
    MAX_DATA_POINTS = 10000
    
    def __init__(self):
        """Initialize the metrics collector."""
        self._lock = Lock()
        self._data_points: Dict[MetricType, List[MetricDataPoint]] = defaultdict(list)
        self._latency_values: Dict[MetricType, List[float]] = defaultdict(list)
        self._counters: Dict[MetricType, int] = defaultdict(int)
        self._approval_latencies: List[float] = []
        self._window_minutes = self.DEFAULT_WINDOW_MINUTES
    
    @classmethod
    def get(cls) -> "MetricsCollector":
        """Get the singleton MetricsCollector instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (for testing)."""
        cls._instance = None
    
    def set_window_minutes(self, minutes: int) -> None:
        """Set the aggregation window size."""
        self._window_minutes = minutes
    
    def _prune_old_data(self, metric_type: MetricType) -> None:
        """Remove data points outside the current window."""
        cutoff = datetime.now(timezone.utc) - timedelta(minutes=self._window_minutes)
        
        # Prune data points
        if metric_type in self._data_points:
            self._data_points[metric_type] = [
                dp for dp in self._data_points[metric_type]
                if dp.timestamp >= cutoff
            ]
            
            # Limit total data points
            if len(self._data_points[metric_type]) > self.MAX_DATA_POINTS:
                self._data_points[metric_type] = self._data_points[metric_type][-self.MAX_DATA_POINTS:]
    
    def record_latency(
        self,
        metric_type: MetricType,
        latency_ms: float,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        model_id: Optional[str] = None,
        extra_labels: Optional[Dict[str, str]] = None,
    ) -> None:
        """
        Record a latency measurement.
        
        Args:
            metric_type: Type of latency metric
            latency_ms: Latency in milliseconds
            tenant_id: Optional tenant identifier
            user_id: Optional user identifier
            model_id: Optional model identifier
            extra_labels: Optional additional labels
        """
        with self._lock:
            data_point = MetricDataPoint(
                metric_type=metric_type,
                value=latency_ms,
                timestamp=datetime.now(timezone.utc),
                tenant_id=tenant_id,
                user_id=user_id,
                model_id=model_id,
                extra_labels=extra_labels or {},
            )
            self._data_points[metric_type].append(data_point)
            self._latency_values[metric_type].append(latency_ms)
            self._prune_old_data(metric_type)
        
        logger.debug(
            f"Recorded latency: {metric_type.value}={latency_ms:.2f}ms",
            extra={"metric_type": metric_type.value, "latency_ms": latency_ms}
        )
    
    def record_event(
        self,
        metric_type: MetricType,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        extra_labels: Optional[Dict[str, str]] = None,
    ) -> None:
        """
        Record a discrete event (error, timeout, success, etc.).
        
        Args:
            metric_type: Type of event
            tenant_id: Optional tenant identifier
            user_id: Optional user identifier
            extra_labels: Optional additional labels
        """
        with self._lock:
            self._counters[metric_type] += 1
            data_point = MetricDataPoint(
                metric_type=metric_type,
                value=1.0,
                timestamp=datetime.now(timezone.utc),
                tenant_id=tenant_id,
                user_id=user_id,
                extra_labels=extra_labels or {},
            )
            self._data_points[metric_type].append(data_point)
            self._prune_old_data(metric_type)
        
        logger.debug(
            f"Recorded event: {metric_type.value}",
            extra={"metric_type": metric_type.value}
        )
    
    def record_approval_latency(
        self,
        latency_ms: float,
        tenant_id: Optional[str] = None,
    ) -> None:
        """Record approval latency (time from request to approval/rejection)."""
        with self._lock:
            self._approval_latencies.append(latency_ms)
            # Keep only recent values
            if len(self._approval_latencies) > self.MAX_DATA_POINTS:
                self._approval_latencies = self._approval_latencies[-self.MAX_DATA_POINTS:]
        
        self.record_latency(
            MetricType.APPROVAL_LATENCY,
            latency_ms,
            tenant_id=tenant_id,
        )
    
    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate a percentile from a list of values."""
        if not values:
            return 0.0
        sorted_values = sorted(values)
        index = int(len(sorted_values) * percentile / 100)
        index = min(index, len(sorted_values) - 1)
        return sorted_values[index]
    
    def _get_latency_stats(self, metric_type: MetricType) -> LatencyStats:
        """Calculate latency statistics for a metric type."""
        with self._lock:
            # Get values within window
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=self._window_minutes)
            values = [
                dp.value for dp in self._data_points.get(metric_type, [])
                if dp.timestamp >= cutoff
            ]
        
        if not values:
            return LatencyStats(
                count=0,
                min_ms=0.0,
                max_ms=0.0,
                mean_ms=0.0,
                p50_ms=0.0,
                p95_ms=0.0,
                p99_ms=0.0,
            )
        
        return LatencyStats(
            count=len(values),
            min_ms=min(values),
            max_ms=max(values),
            mean_ms=statistics.mean(values),
            p50_ms=self._calculate_percentile(values, 50),
            p95_ms=self._calculate_percentile(values, 95),
            p99_ms=self._calculate_percentile(values, 99),
        )
    
    def _get_rate_stats(self) -> RateStats:
        """Calculate rate statistics (error rate, timeout rate, etc.)."""
        with self._lock:
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=self._window_minutes)
            
            success_count = len([
                dp for dp in self._data_points.get(MetricType.SUCCESS, [])
                if dp.timestamp >= cutoff
            ])
            error_count = len([
                dp for dp in self._data_points.get(MetricType.ERROR, [])
                if dp.timestamp >= cutoff
            ])
            timeout_count = len([
                dp for dp in self._data_points.get(MetricType.TIMEOUT, [])
                if dp.timestamp >= cutoff
            ])
        
        total_count = success_count + error_count + timeout_count
        
        if total_count == 0:
            return RateStats(
                total_count=0,
                success_count=0,
                error_count=0,
                timeout_count=0,
                error_rate=0.0,
                timeout_rate=0.0,
                success_rate=0.0,
            )
        
        return RateStats(
            total_count=total_count,
            success_count=success_count,
            error_count=error_count,
            timeout_count=timeout_count,
            error_rate=error_count / total_count,
            timeout_rate=timeout_count / total_count,
            success_rate=success_count / total_count,
        )
    
    def _get_approval_stats(self) -> ApprovalStats:
        """Calculate approval statistics."""
        with self._lock:
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=self._window_minutes)
            
            granted = len([
                dp for dp in self._data_points.get(MetricType.APPROVAL_GRANTED, [])
                if dp.timestamp >= cutoff
            ])
            rejected = len([
                dp for dp in self._data_points.get(MetricType.APPROVAL_REJECTED, [])
                if dp.timestamp >= cutoff
            ])
            auto_approved = len([
                dp for dp in self._data_points.get(MetricType.AUTO_APPROVED, [])
                if dp.timestamp >= cutoff
            ])
            
            approval_latencies = [
                dp.value for dp in self._data_points.get(MetricType.APPROVAL_LATENCY, [])
                if dp.timestamp >= cutoff
            ]
        
        total_requested = granted + rejected + auto_approved
        human_decisions = granted + rejected
        
        if total_requested == 0:
            return ApprovalStats(
                total_approvals_requested=0,
                approvals_granted=0,
                approvals_rejected=0,
                auto_approved=0,
                human_approval_rate=0.0,
                human_rejection_rate=0.0,
                auto_approval_rate=0.0,
                avg_approval_latency_ms=0.0,
                p50_approval_latency_ms=0.0,
                p95_approval_latency_ms=0.0,
            )
        
        human_approval_rate = granted / human_decisions if human_decisions > 0 else 0.0
        human_rejection_rate = rejected / human_decisions if human_decisions > 0 else 0.0
        auto_approval_rate = auto_approved / total_requested
        
        avg_latency = statistics.mean(approval_latencies) if approval_latencies else 0.0
        p50_latency = self._calculate_percentile(approval_latencies, 50)
        p95_latency = self._calculate_percentile(approval_latencies, 95)
        
        return ApprovalStats(
            total_approvals_requested=total_requested,
            approvals_granted=granted,
            approvals_rejected=rejected,
            auto_approved=auto_approved,
            human_approval_rate=human_approval_rate,
            human_rejection_rate=human_rejection_rate,
            auto_approval_rate=auto_approval_rate,
            avg_approval_latency_ms=avg_latency,
            p50_approval_latency_ms=p50_latency,
            p95_approval_latency_ms=p95_latency,
        )
    
    def _get_quota_stats(self) -> QuotaStats:
        """Calculate quota-related statistics."""
        with self._lock:
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=self._window_minutes)
            
            success_count = len([
                dp for dp in self._data_points.get(MetricType.SUCCESS, [])
                if dp.timestamp >= cutoff
            ])
            quota_rejections = len([
                dp for dp in self._data_points.get(MetricType.QUOTA_REJECTED, [])
                if dp.timestamp >= cutoff
            ])
            rate_limited = len([
                dp for dp in self._data_points.get(MetricType.RATE_LIMITED, [])
                if dp.timestamp >= cutoff
            ])
        
        total_requests = success_count + quota_rejections + rate_limited
        
        if total_requests == 0:
            return QuotaStats(
                total_requests=0,
                quota_rejections=0,
                rate_limited=0,
                quota_rejection_rate=0.0,
                rate_limit_rate=0.0,
            )
        
        return QuotaStats(
            total_requests=total_requests,
            quota_rejections=quota_rejections,
            rate_limited=rate_limited,
            quota_rejection_rate=quota_rejections / total_requests,
            rate_limit_rate=rate_limited / total_requests,
        )
    
    def get_sla_metrics(self, window_minutes: Optional[int] = None) -> SLAMetrics:
        """
        Get complete SLA metrics snapshot.
        
        Args:
            window_minutes: Optional override for aggregation window
            
        Returns:
            SLAMetrics with all statistics
        """
        if window_minutes:
            original_window = self._window_minutes
            self._window_minutes = window_minutes
        
        try:
            return SLAMetrics(
                timestamp=datetime.now(timezone.utc),
                window_minutes=self._window_minutes,
                inference_latency=self._get_latency_stats(MetricType.INFERENCE_LATENCY),
                intent_latency=self._get_latency_stats(MetricType.INTENT_LATENCY),
                planning_latency=self._get_latency_stats(MetricType.PLANNING_LATENCY),
                execution_latency=self._get_latency_stats(MetricType.EXECUTION_LATENCY),
                rates=self._get_rate_stats(),
                approvals=self._get_approval_stats(),
                quota=self._get_quota_stats(),
            )
        finally:
            if window_minutes:
                self._window_minutes = original_window
    
    def get_metric_count(self, metric_type: MetricType) -> int:
        """Get the count of a specific metric type within the window."""
        with self._lock:
            cutoff = datetime.now(timezone.utc) - timedelta(minutes=self._window_minutes)
            return len([
                dp for dp in self._data_points.get(metric_type, [])
                if dp.timestamp >= cutoff
            ])
    
    def clear(self) -> None:
        """Clear all metrics (for testing)."""
        with self._lock:
            self._data_points.clear()
            self._latency_values.clear()
            self._counters.clear()
            self._approval_latencies.clear()


# =============================================================================
# Convenience Functions
# =============================================================================

def get_metrics_collector() -> MetricsCollector:
    """Get the singleton MetricsCollector instance."""
    return MetricsCollector.get()


def record_inference_latency(
    latency_ms: float,
    tenant_id: Optional[str] = None,
    model_id: Optional[str] = None,
) -> None:
    """Record inference latency."""
    get_metrics_collector().record_latency(
        MetricType.INFERENCE_LATENCY,
        latency_ms,
        tenant_id=tenant_id,
        model_id=model_id,
    )


def record_intent_latency(latency_ms: float, tenant_id: Optional[str] = None) -> None:
    """Record intent classification latency."""
    get_metrics_collector().record_latency(
        MetricType.INTENT_LATENCY,
        latency_ms,
        tenant_id=tenant_id,
    )


def record_planning_latency(latency_ms: float, tenant_id: Optional[str] = None) -> None:
    """Record action planning latency."""
    get_metrics_collector().record_latency(
        MetricType.PLANNING_LATENCY,
        latency_ms,
        tenant_id=tenant_id,
    )


def record_execution_latency(latency_ms: float, tenant_id: Optional[str] = None) -> None:
    """Record execution latency."""
    get_metrics_collector().record_latency(
        MetricType.EXECUTION_LATENCY,
        latency_ms,
        tenant_id=tenant_id,
    )


def record_success(tenant_id: Optional[str] = None) -> None:
    """Record a successful request."""
    get_metrics_collector().record_event(MetricType.SUCCESS, tenant_id=tenant_id)


def record_error(tenant_id: Optional[str] = None, error_type: Optional[str] = None) -> None:
    """Record an error."""
    get_metrics_collector().record_event(
        MetricType.ERROR,
        tenant_id=tenant_id,
        extra_labels={"error_type": error_type} if error_type else None,
    )


def record_timeout(tenant_id: Optional[str] = None) -> None:
    """Record a timeout."""
    get_metrics_collector().record_event(MetricType.TIMEOUT, tenant_id=tenant_id)


def record_approval_granted(tenant_id: Optional[str] = None, latency_ms: Optional[float] = None) -> None:
    """Record an approval granted."""
    collector = get_metrics_collector()
    collector.record_event(MetricType.APPROVAL_GRANTED, tenant_id=tenant_id)
    if latency_ms is not None:
        collector.record_approval_latency(latency_ms, tenant_id=tenant_id)


def record_approval_rejected(tenant_id: Optional[str] = None, latency_ms: Optional[float] = None) -> None:
    """Record an approval rejected."""
    collector = get_metrics_collector()
    collector.record_event(MetricType.APPROVAL_REJECTED, tenant_id=tenant_id)
    if latency_ms is not None:
        collector.record_approval_latency(latency_ms, tenant_id=tenant_id)


def record_auto_approved(tenant_id: Optional[str] = None) -> None:
    """Record an auto-approved action."""
    get_metrics_collector().record_event(MetricType.AUTO_APPROVED, tenant_id=tenant_id)


def record_quota_rejected(tenant_id: Optional[str] = None) -> None:
    """Record a quota rejection."""
    get_metrics_collector().record_event(MetricType.QUOTA_REJECTED, tenant_id=tenant_id)


def record_rate_limited(tenant_id: Optional[str] = None) -> None:
    """Record a rate limit hit."""
    get_metrics_collector().record_event(MetricType.RATE_LIMITED, tenant_id=tenant_id)


def record_circuit_breaker_open(tenant_id: Optional[str] = None) -> None:
    """Record a circuit breaker open event."""
    get_metrics_collector().record_event(MetricType.CIRCUIT_BREAKER_OPEN, tenant_id=tenant_id)


# =============================================================================
# Timing Decorator
# =============================================================================

def timed_operation(metric_type: MetricType):
    """
    Decorator to automatically record latency for an operation.
    
    Usage:
        @timed_operation(MetricType.INFERENCE_LATENCY)
        async def run_inference(prompt: str) -> str:
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def async_wrapper(*args, **kwargs) -> T:
            start_time = time.perf_counter()
            try:
                result = await func(*args, **kwargs)
                record_success()
                return result
            except TimeoutError:
                record_timeout()
                raise
            except Exception:
                record_error()
                raise
            finally:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                get_metrics_collector().record_latency(metric_type, elapsed_ms)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs) -> T:
            start_time = time.perf_counter()
            try:
                result = func(*args, **kwargs)
                record_success()
                return result
            except TimeoutError:
                record_timeout()
                raise
            except Exception:
                record_error()
                raise
            finally:
                elapsed_ms = (time.perf_counter() - start_time) * 1000
                get_metrics_collector().record_latency(metric_type, elapsed_ms)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    
    return decorator


class TimingContext:
    """
    Context manager for timing operations.
    
    Usage:
        with TimingContext(MetricType.INFERENCE_LATENCY) as timer:
            result = run_inference(prompt)
        print(f"Took {timer.elapsed_ms}ms")
    """
    
    def __init__(
        self,
        metric_type: MetricType,
        tenant_id: Optional[str] = None,
        auto_record: bool = True,
    ):
        self.metric_type = metric_type
        self.tenant_id = tenant_id
        self.auto_record = auto_record
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.elapsed_ms: float = 0.0
    
    def __enter__(self) -> "TimingContext":
        self.start_time = time.perf_counter()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        self.end_time = time.perf_counter()
        self.elapsed_ms = (self.end_time - self.start_time) * 1000
        
        if self.auto_record:
            get_metrics_collector().record_latency(
                self.metric_type,
                self.elapsed_ms,
                tenant_id=self.tenant_id,
            )
            
            if exc_type is not None:
                if exc_type == TimeoutError:
                    record_timeout(self.tenant_id)
                else:
                    record_error(self.tenant_id)
            else:
                record_success(self.tenant_id)
