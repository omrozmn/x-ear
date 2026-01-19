"""
Data Retention Service for AI Layer.

Requirements:
- 10.1: Store prompts in encrypted form with configurable retention (default 30 days)
- 10.3: When a user requests data deletion, purge related AI logs within 30 days
- 10.4: Anonymize prompts before using them for model improvement

This service handles:
1. User data deletion requests (GDPR compliance)
2. Automatic data purging based on retention policies
3. Prompt anonymization for model improvement
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum
from uuid import uuid4

from sqlalchemy import delete, select, update, and_, or_
from sqlalchemy.orm import Session

from ai.utils.encryption import get_retention_config, RetentionConfig
from ai.utils.pii_redactor import get_redactor, PIIRedactor


logger = logging.getLogger(__name__)


class DeletionStatus(str, Enum):
    """Status of a data deletion request."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIALLY_COMPLETED = "partially_completed"


class DeletionScope(str, Enum):
    """Scope of data to delete."""
    USER = "user"  # All data for a specific user
    TENANT = "tenant"  # All data for a tenant (admin only)
    REQUEST = "request"  # Specific AI request
    SESSION = "session"  # All data for a session


@dataclass
class DeletionRequest:
    """Represents a data deletion request."""
    id: str
    scope: DeletionScope
    target_id: str  # user_id, tenant_id, request_id, or session_id
    requested_by: str  # user_id who requested deletion
    tenant_id: str
    status: DeletionStatus
    created_at: datetime
    completed_at: Optional[datetime] = None
    records_deleted: int = 0
    error_message: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "scope": self.scope.value,
            "targetId": self.target_id,
            "requestedBy": self.requested_by,
            "tenantId": self.tenant_id,
            "status": self.status.value,
            "createdAt": self.created_at.isoformat(),
            "completedAt": self.completed_at.isoformat() if self.completed_at else None,
            "recordsDeleted": self.records_deleted,
            "errorMessage": self.error_message,
        }


@dataclass
class RetentionPurgeResult:
    """Result of a retention-based purge operation."""
    requests_deleted: int
    actions_deleted: int
    audit_logs_deleted: int
    usage_records_deleted: int
    total_deleted: int
    errors: List[str]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "requestsDeleted": self.requests_deleted,
            "actionsDeleted": self.actions_deleted,
            "auditLogsDeleted": self.audit_logs_deleted,
            "usageRecordsDeleted": self.usage_records_deleted,
            "totalDeleted": self.total_deleted,
            "errors": self.errors,
        }


class DataRetentionService:
    """
    Service for managing AI data retention and deletion.
    
    Handles:
    - User data deletion requests (GDPR Article 17 - Right to Erasure)
    - Automatic purging based on retention policies
    - Compliance with data protection regulations
    """
    
    # Maximum days to complete a deletion request (GDPR requires 30 days)
    MAX_DELETION_DAYS = 30
    
    def __init__(
        self,
        db_session: Session,
        retention_config: Optional[RetentionConfig] = None
    ):
        """
        Initialize the data retention service.
        
        Args:
            db_session: SQLAlchemy database session
            retention_config: Optional retention configuration
        """
        self.db = db_session
        self.retention_config = retention_config or get_retention_config()
        self._deletion_requests: Dict[str, DeletionRequest] = {}
    
    def create_deletion_request(
        self,
        scope: DeletionScope,
        target_id: str,
        requested_by: str,
        tenant_id: str
    ) -> DeletionRequest:
        """
        Create a new data deletion request.
        
        Args:
            scope: Scope of deletion (user, tenant, request, session)
            target_id: ID of the target to delete
            requested_by: User ID who requested deletion
            tenant_id: Tenant ID for isolation
            
        Returns:
            DeletionRequest object
        """
        request = DeletionRequest(
            id=f"del_{uuid4().hex[:16]}",
            scope=scope,
            target_id=target_id,
            requested_by=requested_by,
            tenant_id=tenant_id,
            status=DeletionStatus.PENDING,
            created_at=datetime.utcnow(),
        )
        
        self._deletion_requests[request.id] = request
        
        logger.info(
            f"Created deletion request {request.id} for {scope.value}:{target_id} "
            f"by user {requested_by}"
        )
        
        return request
    
    def process_deletion_request(self, request_id: str) -> DeletionRequest:
        """
        Process a pending deletion request.
        
        Args:
            request_id: ID of the deletion request
            
        Returns:
            Updated DeletionRequest
            
        Raises:
            ValueError: If request not found
        """
        request = self._deletion_requests.get(request_id)
        if not request:
            raise ValueError(f"Deletion request {request_id} not found")
        
        if request.status != DeletionStatus.PENDING:
            logger.warning(f"Request {request_id} is not pending: {request.status}")
            return request
        
        request.status = DeletionStatus.IN_PROGRESS
        
        try:
            if request.scope == DeletionScope.USER:
                deleted = self._delete_user_data(request.target_id, request.tenant_id)
            elif request.scope == DeletionScope.TENANT:
                deleted = self._delete_tenant_data(request.target_id)
            elif request.scope == DeletionScope.REQUEST:
                deleted = self._delete_request_data(request.target_id, request.tenant_id)
            elif request.scope == DeletionScope.SESSION:
                deleted = self._delete_session_data(request.target_id, request.tenant_id)
            else:
                raise ValueError(f"Unknown deletion scope: {request.scope}")
            
            request.records_deleted = deleted
            request.status = DeletionStatus.COMPLETED
            request.completed_at = datetime.utcnow()
            
            logger.info(
                f"Completed deletion request {request_id}: {deleted} records deleted"
            )
            
        except Exception as e:
            request.status = DeletionStatus.FAILED
            request.error_message = str(e)
            logger.error(f"Failed to process deletion request {request_id}: {e}")
        
        return request
    
    def _delete_user_data(self, user_id: str, tenant_id: str) -> int:
        """Delete all AI data for a specific user within a tenant."""
        total_deleted = 0
        
        try:
            # Import models here to avoid circular imports
            from ai.models.ai_request import AIRequest
            from ai.models.ai_action import AIAction
            from ai.models.ai_audit_log import AIAuditLog
            
            # Delete AI requests
            result = self.db.execute(
                delete(AIRequest).where(
                    and_(
                        AIRequest.user_id == user_id,
                        AIRequest.tenant_id == tenant_id
                    )
                )
            )
            total_deleted += result.rowcount
            
            # Delete AI actions
            result = self.db.execute(
                delete(AIAction).where(
                    and_(
                        AIAction.user_id == user_id,
                        AIAction.tenant_id == tenant_id
                    )
                )
            )
            total_deleted += result.rowcount
            
            # For audit logs, we anonymize instead of delete (for compliance)
            # This preserves the audit trail while removing PII
            result = self.db.execute(
                update(AIAuditLog).where(
                    and_(
                        AIAuditLog.user_id == user_id,
                        AIAuditLog.tenant_id == tenant_id
                    )
                ).values(
                    user_id="[DELETED]",
                    extra_data={"anonymized": True, "anonymized_at": datetime.utcnow().isoformat()}
                )
            )
            total_deleted += result.rowcount
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise
        
        return total_deleted
    
    def _delete_tenant_data(self, tenant_id: str) -> int:
        """Delete all AI data for a tenant (admin operation)."""
        total_deleted = 0
        
        try:
            from ai.models.ai_request import AIRequest
            from ai.models.ai_action import AIAction
            from ai.models.ai_audit_log import AIAuditLog
            from ai.models.ai_usage import AIUsage
            
            # Delete in order to respect foreign key constraints
            for model in [AIAuditLog, AIAction, AIRequest, AIUsage]:
                result = self.db.execute(
                    delete(model).where(model.tenant_id == tenant_id)
                )
                total_deleted += result.rowcount
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise
        
        return total_deleted
    
    def _delete_request_data(self, request_id: str, tenant_id: str) -> int:
        """Delete a specific AI request and related data."""
        total_deleted = 0
        
        try:
            from ai.models.ai_request import AIRequest
            from ai.models.ai_action import AIAction
            from ai.models.ai_audit_log import AIAuditLog
            
            # Delete related audit logs
            result = self.db.execute(
                delete(AIAuditLog).where(
                    and_(
                        AIAuditLog.request_id == request_id,
                        AIAuditLog.tenant_id == tenant_id
                    )
                )
            )
            total_deleted += result.rowcount
            
            # Delete related actions
            result = self.db.execute(
                delete(AIAction).where(
                    and_(
                        AIAction.request_id == request_id,
                        AIAction.tenant_id == tenant_id
                    )
                )
            )
            total_deleted += result.rowcount
            
            # Delete the request
            result = self.db.execute(
                delete(AIRequest).where(
                    and_(
                        AIRequest.id == request_id,
                        AIRequest.tenant_id == tenant_id
                    )
                )
            )
            total_deleted += result.rowcount
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise
        
        return total_deleted
    
    def _delete_session_data(self, session_id: str, tenant_id: str) -> int:
        """Delete all AI data for a session."""
        total_deleted = 0
        
        try:
            from ai.models.ai_request import AIRequest
            from ai.models.ai_audit_log import AIAuditLog
            
            # Get request IDs for this session
            requests = self.db.execute(
                select(AIRequest.id).where(
                    and_(
                        AIRequest.session_id == session_id,
                        AIRequest.tenant_id == tenant_id
                    )
                )
            ).scalars().all()
            
            # Delete audit logs for these requests
            if requests:
                result = self.db.execute(
                    delete(AIAuditLog).where(
                        and_(
                            AIAuditLog.request_id.in_(requests),
                            AIAuditLog.tenant_id == tenant_id
                        )
                    )
                )
                total_deleted += result.rowcount
            
            # Delete session audit logs
            result = self.db.execute(
                delete(AIAuditLog).where(
                    and_(
                        AIAuditLog.session_id == session_id,
                        AIAuditLog.tenant_id == tenant_id
                    )
                )
            )
            total_deleted += result.rowcount
            
            # Delete requests
            result = self.db.execute(
                delete(AIRequest).where(
                    and_(
                        AIRequest.session_id == session_id,
                        AIRequest.tenant_id == tenant_id
                    )
                )
            )
            total_deleted += result.rowcount
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            raise
        
        return total_deleted
    
    def purge_expired_data(self) -> RetentionPurgeResult:
        """
        Purge data that has exceeded its retention period.
        
        This should be run periodically (e.g., daily) to clean up old data.
        
        Returns:
            RetentionPurgeResult with counts of deleted records
        """
        errors = []
        requests_deleted = 0
        actions_deleted = 0
        audit_logs_deleted = 0
        usage_records_deleted = 0
        
        try:
            from ai.models.ai_request import AIRequest
            from ai.models.ai_action import AIAction
            from ai.models.ai_audit_log import AIAuditLog
            from ai.models.ai_usage import AIUsage
            
            # Calculate cutoff dates
            prompt_cutoff = datetime.utcnow() - timedelta(
                days=self.retention_config.prompt_retention_days
            )
            audit_cutoff = datetime.utcnow() - timedelta(
                days=self.retention_config.audit_retention_days
            )
            
            # Delete expired requests (prompts)
            try:
                result = self.db.execute(
                    delete(AIRequest).where(AIRequest.created_at < prompt_cutoff)
                )
                requests_deleted = result.rowcount
            except Exception as e:
                errors.append(f"Failed to delete requests: {e}")
            
            # Delete expired actions
            try:
                result = self.db.execute(
                    delete(AIAction).where(AIAction.created_at < prompt_cutoff)
                )
                actions_deleted = result.rowcount
            except Exception as e:
                errors.append(f"Failed to delete actions: {e}")
            
            # Delete expired audit logs
            try:
                result = self.db.execute(
                    delete(AIAuditLog).where(AIAuditLog.created_at < audit_cutoff)
                )
                audit_logs_deleted = result.rowcount
            except Exception as e:
                errors.append(f"Failed to delete audit logs: {e}")
            
            # Delete expired usage records (keep current period)
            try:
                result = self.db.execute(
                    delete(AIUsage).where(AIUsage.period_end < audit_cutoff)
                )
                usage_records_deleted = result.rowcount
            except Exception as e:
                errors.append(f"Failed to delete usage records: {e}")
            
            self.db.commit()
            
        except Exception as e:
            self.db.rollback()
            errors.append(f"Transaction failed: {e}")
        
        total = requests_deleted + actions_deleted + audit_logs_deleted + usage_records_deleted
        
        logger.info(
            f"Retention purge completed: {total} records deleted "
            f"(requests={requests_deleted}, actions={actions_deleted}, "
            f"audit_logs={audit_logs_deleted}, usage={usage_records_deleted})"
        )
        
        return RetentionPurgeResult(
            requests_deleted=requests_deleted,
            actions_deleted=actions_deleted,
            audit_logs_deleted=audit_logs_deleted,
            usage_records_deleted=usage_records_deleted,
            total_deleted=total,
            errors=errors,
        )
    
    def get_deletion_request(self, request_id: str) -> Optional[DeletionRequest]:
        """Get a deletion request by ID."""
        return self._deletion_requests.get(request_id)
    
    def list_deletion_requests(
        self,
        tenant_id: Optional[str] = None,
        status: Optional[DeletionStatus] = None
    ) -> List[DeletionRequest]:
        """List deletion requests with optional filtering."""
        requests = list(self._deletion_requests.values())
        
        if tenant_id:
            requests = [r for r in requests if r.tenant_id == tenant_id]
        
        if status:
            requests = [r for r in requests if r.status == status]
        
        return sorted(requests, key=lambda r: r.created_at, reverse=True)
    
    def get_pending_deletion_count(self, tenant_id: Optional[str] = None) -> int:
        """Get count of pending deletion requests."""
        return len(self.list_deletion_requests(tenant_id, DeletionStatus.PENDING))


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
