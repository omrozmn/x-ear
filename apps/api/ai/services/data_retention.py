"""
Data Retention Service for AI Layer.

Requirements:
- 1.2: Run daily to identify AI requests older than 90 days
- 1.3: Permanently delete expired prompts and metadata
- 1.4: Log all deletion operations with request_id and timestamp
- 1.5: Read retention period from AI_RETENTION_DAYS environment variable (default: 90)
- 1.6: Log errors and continue processing remaining requests
- 1.7: Expose Prometheus metric ai_prompts_deleted_total
- 1.8: Suspend deletion for records with legal_hold=True
- 1.9: Use batch deletion to avoid N+1 transaction problems

This service handles:
1. Automatic data purging based on retention policies
2. Legal hold compliance
3. Batch deletion for performance
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from sqlalchemy.orm import Session
from prometheus_client import Counter

from ai.models.ai_request import AIRequest


logger = logging.getLogger(__name__)

# Module-level Prometheus metric (defined once)
ai_prompts_deleted_total = Counter(
    'ai_prompts_deleted_total',
    'Total number of AI prompts deleted by retention policy'
)




class DataRetentionService:
    """
    Service for managing AI data retention and deletion.
    
    Handles:
    - Automatic purging based on retention policies
    - Legal hold compliance
    - Batch deletion for performance
    - Prometheus metrics tracking
    """
    
    def __init__(self, db: Session):
        """
        Initialize the data retention service.
        
        Args:
            db: SQLAlchemy database session
        """
        self.db = db
        self.retention_days = int(os.getenv('AI_RETENTION_DAYS', '90'))
    
    def cleanup_expired_prompts(self) -> Dict[str, Any]:
        """
        Delete AI requests older than retention period using batch deletion.
        
        IMPORTANT: Uses batch delete to avoid N+1 transaction problem.
        Legal holds are respected - records with legal_hold=True are skipped.
        
        Returns:
            dict: {
                "deleted_count": int,
                "error_count": int,
                "retention_days": int,
                "skipped_legal_hold": int
            }
        """
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=self.retention_days)
        
        try:
            # Count legal holds that will be skipped
            legal_hold_count = self.db.query(AIRequest).filter(
                AIRequest.created_at < cutoff_date,
                AIRequest.legal_hold == True
            ).count()
            
            # Query expired requests (excluding legal holds)
            expired_requests = self.db.query(AIRequest).filter(
                AIRequest.created_at < cutoff_date,
                AIRequest.legal_hold == False
            ).all()
            
            # Extract IDs for batch deletion
            expired_ids = [r.id for r in expired_requests]
            deleted_count = len(expired_ids)
            
            if expired_ids:
                # Batch delete (single transaction)
                self.db.query(AIRequest).filter(
                    AIRequest.id.in_(expired_ids)
                ).delete(synchronize_session=False)
                
                self.db.commit()
                
                logger.info(
                    f"Deleted {deleted_count} expired AI requests (batch). "
                    f"Skipped {legal_hold_count} records with legal hold."
                )
                
                # Update Prometheus metric
                ai_prompts_deleted_total.inc(deleted_count)
            else:
                logger.info(
                    f"No expired AI requests to delete. "
                    f"Skipped {legal_hold_count} records with legal hold."
                )
            
            return {
                "deleted_count": deleted_count,
                "error_count": 0,
                "retention_days": self.retention_days,
                "skipped_legal_hold": legal_hold_count
            }
            
        except Exception as e:
            logger.error(f"Batch deletion failed: {e}", exc_info=True)
            self.db.rollback()
            
            return {
                "deleted_count": 0,
                "error_count": 1,
                "retention_days": self.retention_days,
                "skipped_legal_hold": 0
            }


# Singleton instance
_data_retention_service: Optional[DataRetentionService] = None


def get_data_retention_service(db_session: Session) -> DataRetentionService:
    """Get or create the data retention service."""
    global _data_retention_service
    if _data_retention_service is None:
        _data_retention_service = DataRetentionService(db_session)
    return _data_retention_service


def reset_data_retention_service() -> None:
    """Reset the singleton instance (for testing)."""
    global _data_retention_service
    _data_retention_service = None

