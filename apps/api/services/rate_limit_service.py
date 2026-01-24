"""Rate Limiting Service with IP Warm-up Support.

This service enforces email sending rate limits with progressive warm-up schedule
to maintain sender reputation and prevent blacklisting.

CRITICAL: IP warm-up is NON-NEGOTIABLE for production email delivery.
Sending too many emails too quickly WILL result in blacklisting.
"""

import os
import logging
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

logger = logging.getLogger(__name__)


class WarmupPhase(Enum):
    """14-day IP warm-up schedule phases."""
    DAY_1_2 = (1, 2, 50, 10)      # Days 1-2: 50/day, 10/hour
    DAY_3_4 = (3, 4, 100, 20)     # Days 3-4: 100/day, 20/hour
    DAY_5_6 = (5, 6, 250, 50)     # Days 5-6: 250/day, 50/hour
    DAY_7_8 = (7, 8, 500, 100)    # Days 7-8: 500/day, 100/hour
    DAY_9_10 = (9, 10, 1000, 200) # Days 9-10: 1000/day, 200/hour
    DAY_11_12 = (11, 12, 2500, 500) # Days 11-12: 2500/day, 500/hour
    DAY_13_14 = (13, 14, 5000, 1000) # Days 13-14: 5000/day, 1000/hour
    POST_WARMUP = (15, 999, 10000, 2000) # Day 15+: 10000/day, 2000/hour
    
    def __init__(self, start_day: int, end_day: int, daily_limit: int, hourly_limit: int):
        self.start_day = start_day
        self.end_day = end_day
        self.daily_limit = daily_limit
        self.hourly_limit = hourly_limit


class RateLimitService:
    """Service for enforcing rate limits with IP warm-up awareness."""
    
    def __init__(self, db: Session):
        """Initialize rate limit service.
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        
        # Get warm-up start date from environment
        warmup_start_str = os.getenv("WARMUP_START_DATE")
        if warmup_start_str:
            try:
                self.warmup_start_date = datetime.fromisoformat(warmup_start_str).replace(tzinfo=timezone.utc)
            except ValueError:
                logger.warning(f"Invalid WARMUP_START_DATE format: {warmup_start_str}, using current date")
                self.warmup_start_date = datetime.now(timezone.utc)
        else:
            # If not set, use current date (first email triggers warm-up)
            self.warmup_start_date = datetime.now(timezone.utc)
            logger.info("WARMUP_START_DATE not set, using current date for warm-up start")
        
        # Get rate limit overrides from environment
        self.tenant_hourly_limit = int(os.getenv("RATE_LIMIT_TENANT_HOURLY", "100"))
        self.global_hourly_limit = int(os.getenv("RATE_LIMIT_GLOBAL_HOURLY", "1000"))
        self.global_daily_limit = int(os.getenv("RATE_LIMIT_GLOBAL_DAILY", "10000"))
    
    def get_current_warmup_phase(self) -> WarmupPhase:
        """Determine current warm-up phase based on days since start.
        
        Returns:
            WarmupPhase: Current phase with associated limits
            
        Example:
            >>> service = RateLimitService(db)
            >>> phase = service.get_current_warmup_phase()
            >>> print(f"Day {phase.start_day}-{phase.end_day}: {phase.daily_limit}/day")
        """
        # Calculate days since warm-up start
        now = datetime.now(timezone.utc)
        days_since_start = (now - self.warmup_start_date).days + 1  # Day 1 is first day
        
        # Find matching phase
        for phase in WarmupPhase:
            if phase.start_day <= days_since_start <= phase.end_day:
                logger.info(
                    f"Current warm-up phase: Day {days_since_start}",
                    extra={
                        "phase": phase.name,
                        "daily_limit": phase.daily_limit,
                        "hourly_limit": phase.hourly_limit
                    }
                )
                return phase
        
        # Default to POST_WARMUP if beyond day 14
        return WarmupPhase.POST_WARMUP
    
    def _count_emails_last_hour(self, tenant_id: Optional[str] = None) -> int:
        """Count emails sent in the last hour.
        
        Args:
            tenant_id: Optional tenant ID to filter by (None = global count)
            
        Returns:
            int: Number of emails sent in last hour
        """
        from core.models.email import EmailLog
        
        one_hour_ago = datetime.now(timezone.utc) - timedelta(hours=1)
        
        query = self.db.query(func.count(EmailLog.id)).filter(
            EmailLog.created_at >= one_hour_ago
        )
        
        if tenant_id:
            query = query.filter(EmailLog.tenant_id == tenant_id)
        
        count = query.scalar() or 0
        return count
    
    def _count_emails_last_24h(self, tenant_id: Optional[str] = None) -> int:
        """Count emails sent in the last 24 hours.
        
        Args:
            tenant_id: Optional tenant ID to filter by (None = global count)
            
        Returns:
            int: Number of emails sent in last 24 hours
        """
        from core.models.email import EmailLog
        
        twenty_four_hours_ago = datetime.now(timezone.utc) - timedelta(hours=24)
        
        query = self.db.query(func.count(EmailLog.id)).filter(
            EmailLog.created_at >= twenty_four_hours_ago
        )
        
        if tenant_id:
            query = query.filter(EmailLog.tenant_id == tenant_id)
        
        count = query.scalar() or 0
        return count
    
    def check_rate_limit(
        self,
        tenant_id: str,
        scenario: str
    ) -> Tuple[bool, str, Optional[int]]:
        """Check if email can be sent within current rate limits.
        
        Checks three limits:
        1. Tenant hourly limit (per-tenant protection)
        2. Global hourly limit (system-wide protection)
        3. Global daily limit (warm-up phase limit)
        
        Args:
            tenant_id: Tenant identifier
            scenario: Email scenario (for logging)
            
        Returns:
            Tuple[bool, str, Optional[int]]: (can_send, reason, retry_after_seconds)
                - can_send: True if email can be sent
                - reason: Explanation if rate limit exceeded
                - retry_after_seconds: Seconds to wait before retry (None if can send)
                
        Example:
            >>> service = RateLimitService(db)
            >>> can_send, reason, retry_after = service.check_rate_limit("tenant_123", "appointment_reminder")
            >>> if not can_send:
            ...     return 429, {"error": reason, "retryAfter": retry_after}
        """
        # Get current warm-up phase
        phase = self.get_current_warmup_phase()
        
        # Check tenant hourly limit
        tenant_hourly_count = self._count_emails_last_hour(tenant_id)
        if tenant_hourly_count >= self.tenant_hourly_limit:
            logger.warning(
                "Tenant hourly rate limit exceeded",
                extra={
                    "tenant_id": tenant_id,
                    "count": tenant_hourly_count,
                    "limit": self.tenant_hourly_limit
                }
            )
            return False, f"Tenant hourly limit exceeded ({tenant_hourly_count}/{self.tenant_hourly_limit})", 3600
        
        # Check global hourly limit
        global_hourly_count = self._count_emails_last_hour()
        if global_hourly_count >= self.global_hourly_limit:
            logger.warning(
                "Global hourly rate limit exceeded",
                extra={
                    "count": global_hourly_count,
                    "limit": self.global_hourly_limit
                }
            )
            return False, f"Global hourly limit exceeded ({global_hourly_count}/{self.global_hourly_limit})", 3600
        
        # Check global daily limit (warm-up phase)
        global_daily_count = self._count_emails_last_24h()
        if global_daily_count >= phase.daily_limit:
            logger.warning(
                "Warm-up daily limit exceeded",
                extra={
                    "count": global_daily_count,
                    "limit": phase.daily_limit,
                    "phase": phase.name
                }
            )
            return False, f"Daily limit exceeded for warm-up phase ({global_daily_count}/{phase.daily_limit})", 86400
        
        # All checks passed
        logger.debug(
            "Rate limit check passed",
            extra={
                "tenant_id": tenant_id,
                "scenario": scenario,
                "tenant_hourly": f"{tenant_hourly_count}/{self.tenant_hourly_limit}",
                "global_hourly": f"{global_hourly_count}/{self.global_hourly_limit}",
                "global_daily": f"{global_daily_count}/{phase.daily_limit}"
            }
        )
        return True, "Rate limit OK", None


# Dependency injection helper
def get_rate_limit_service(db: Session) -> RateLimitService:
    """Get RateLimitService instance for dependency injection.
    
    Args:
        db: Database session
        
    Returns:
        RateLimitService: Service instance
    """
    return RateLimitService(db)
