"""
AIUsage Model - Usage tracking with atomic increment support.

Requirements:
- 12.1: Track AI request counts per tenant and per subscription plan
- 29.1: Update usage counters atomically (UPSERT with atomic increment)
- 29.2: NOT use read-modify-write patterns for usage updates
- 29.3: Reflect correct total under concurrent requests

This model tracks AI usage for quota enforcement and billing.
"""

from datetime import datetime, date
from enum import Enum
from typing import Optional
from uuid import uuid4

from sqlalchemy import Column, String, Integer, DateTime, Date, Index, UniqueConstraint
from sqlalchemy import text
from sqlalchemy.dialects.postgresql import insert as pg_insert

from database import Base, now_utc


def _gen_id() -> str:
    """Generate a unique ID for usage records."""
    return f"aiuse_{uuid4().hex}"


class UsageType(str, Enum):
    """Types of AI usage to track."""
    ADVISORY = "advisory"  # Read-only suggestions
    BLOCKING = "blocking"  # Policy engine blocking checks
    EXECUTION = "execution"  # Action execution
    CHAT = "chat"  # Chat/conversation
    OCR = "ocr"  # OCR processing


class AIUsage(Base):
    """
    Tracks AI usage for quota enforcement and billing.
    
    Usage is tracked per tenant, per day, per usage type.
    This allows for flexible quota policies (daily, monthly, etc.)
    
    IMPORTANT: All updates MUST use atomic increment operations.
    Never use read-modify-write patterns.
    
    Attributes:
        id: Unique usage record identifier
        tenant_id: Tenant being tracked
        usage_date: Date of usage (for daily aggregation)
        usage_type: Type of AI usage
        
        request_count: Number of requests
        token_count_input: Total input tokens consumed
        token_count_output: Total output tokens generated
        
        quota_limit: Configured quota limit for this type
        quota_exceeded_at: When quota was first exceeded (if any)
        
        created_at: When the record was created
        updated_at: When last updated
    """
    __tablename__ = "ai_usage"
    
    # Primary key
    id = Column(String(64), primary_key=True, default=_gen_id)
    
    # Tracking dimensions
    tenant_id = Column(String(64), nullable=False)
    usage_date = Column(Date, nullable=False)
    usage_type = Column(String(20), nullable=False)
    
    # Usage counters
    request_count = Column(Integer, nullable=False, default=0)
    token_count_input = Column(Integer, nullable=False, default=0)
    token_count_output = Column(Integer, nullable=False, default=0)
    
    # Quota tracking
    quota_limit = Column(Integer, nullable=True)  # NULL = unlimited
    quota_exceeded_at = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, nullable=False, default=now_utc)
    updated_at = Column(DateTime, nullable=False, default=now_utc, onupdate=now_utc)
    
    # Unique constraint for upsert
    __table_args__ = (
        UniqueConstraint("tenant_id", "usage_date", "usage_type", name="uix_ai_usage_tenant_date_type"),
        Index("ix_ai_usage_tenant_date", "tenant_id", "usage_date"),
    )
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API responses."""
        return {
            "id": self.id,
            "tenantId": self.tenant_id,
            "usageDate": self.usage_date.isoformat() if self.usage_date else None,
            "usageType": self.usage_type,
            "requestCount": self.request_count,
            "tokenCountInput": self.token_count_input,
            "tokenCountOutput": self.token_count_output,
            "quotaLimit": self.quota_limit,
            "quotaExceededAt": self.quota_exceeded_at.isoformat() if self.quota_exceeded_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
        }
    
    def is_quota_exceeded(self) -> bool:
        """Check if quota is exceeded."""
        if self.quota_limit is None:
            return False
        return self.request_count >= self.quota_limit
    
    @classmethod
    def increment_usage_atomic(
        cls,
        session,
        tenant_id: str,
        usage_type: UsageType,
        request_count: int = 1,
        tokens_input: int = 0,
        tokens_output: int = 0,
        quota_limit: Optional[int] = None,
    ) -> "AIUsage":
        """
        Atomically increment usage counters using PostgreSQL UPSERT.
        
        This method uses INSERT ... ON CONFLICT DO UPDATE to ensure
        atomic updates without race conditions.
        
        Args:
            session: SQLAlchemy session
            tenant_id: Tenant ID
            usage_type: Type of usage
            request_count: Number of requests to add
            tokens_input: Input tokens to add
            tokens_output: Output tokens to add
            quota_limit: Optional quota limit to set
            
        Returns:
            The updated AIUsage record
        """
        today = date.today()
        
        # PostgreSQL UPSERT with atomic increment
        stmt = pg_insert(cls).values(
            id=_gen_id(),
            tenant_id=tenant_id,
            usage_date=today,
            usage_type=usage_type.value,
            request_count=request_count,
            token_count_input=tokens_input,
            token_count_output=tokens_output,
            quota_limit=quota_limit,
            created_at=now_utc(),
            updated_at=now_utc(),
        ).on_conflict_do_update(
            constraint="uix_ai_usage_tenant_date_type",
            set_={
                "request_count": cls.request_count + request_count,
                "token_count_input": cls.token_count_input + tokens_input,
                "token_count_output": cls.token_count_output + tokens_output,
                "updated_at": now_utc(),
            }
        ).returning(cls)
        
        result = session.execute(stmt)
        return result.fetchone()
    
    @classmethod
    def get_usage_for_tenant(
        cls,
        session,
        tenant_id: str,
        usage_date: Optional[date] = None,
        usage_type: Optional[UsageType] = None,
    ) -> list["AIUsage"]:
        """
        Get usage records for a tenant.
        
        Args:
            session: SQLAlchemy session
            tenant_id: Tenant ID
            usage_date: Optional date filter (defaults to today)
            usage_type: Optional usage type filter
            
        Returns:
            List of AIUsage records
        """
        query = session.query(cls).filter(cls.tenant_id == tenant_id)
        
        if usage_date:
            query = query.filter(cls.usage_date == usage_date)
        
        if usage_type:
            query = query.filter(cls.usage_type == usage_type.value)
        
        return query.all()
    
    @classmethod
    def check_quota(
        cls,
        session,
        tenant_id: str,
        usage_type: UsageType,
    ) -> tuple[bool, Optional[int], Optional[int]]:
        """
        Check if tenant has remaining quota.
        
        Args:
            session: SQLAlchemy session
            tenant_id: Tenant ID
            usage_type: Type of usage to check
            
        Returns:
            Tuple of (has_quota, current_usage, quota_limit)
            has_quota is True if quota is not exceeded or unlimited
        """
        today = date.today()
        
        usage = session.query(cls).filter(
            cls.tenant_id == tenant_id,
            cls.usage_date == today,
            cls.usage_type == usage_type.value,
        ).first()
        
        if not usage:
            return (True, 0, None)
        
        if usage.quota_limit is None:
            return (True, usage.request_count, None)
        
        has_quota = usage.request_count < usage.quota_limit
        return (has_quota, usage.request_count, usage.quota_limit)
