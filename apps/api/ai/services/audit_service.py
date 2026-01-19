"""
Comprehensive Audit Service for AI Layer

Provides centralized audit logging with:
- All required fields validation
- Incident tagging
- Incident bundle export

Requirements:
- 9.1: Log all requests, decisions, and actions to AI_Audit_Storage (append-only)
- 9.2: Include user_id, tenant_id, intent, action_plan, risk_level, outcome,
       model_id, model_version, prompt_template_version, policy_version
- 9.7: Support "AI incident" tagging and automatic incident bundle export
- 19.1: Support incident tagging on audit records
- 19.2: Generate automatic incident bundle (audit logs + hashes)
- 19.3: Exportable incident bundle in standard format
"""

import hashlib
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Set
from uuid import uuid4

from ai.models.ai_audit_log import AIAuditLog, AuditEventType, IncidentTag

logger = logging.getLogger(__name__)


# =============================================================================
# Required Fields Definition
# =============================================================================

# Fields required for every audit entry
REQUIRED_BASE_FIELDS: Set[str] = {
    "tenant_id",
    "user_id",
    "event_type",
    "event_timestamp",
}

# Fields required for request events
REQUIRED_REQUEST_FIELDS: Set[str] = {
    "request_id",
    "model_id",
    "model_version",
}

# Fields required for action events
REQUIRED_ACTION_FIELDS: Set[str] = {
    "action_id",
    "action_plan_hash",
    "risk_level",
}

# Fields required for execution events
REQUIRED_EXECUTION_FIELDS: Set[str] = {
    "outcome",
    "policy_version",
}

# Fields required for model tracking
REQUIRED_MODEL_FIELDS: Set[str] = {
    "model_id",
    "model_version",
    "prompt_template_version",
    "prompt_template_hash",
}


# =============================================================================
# Audit Entry Data Classes
# =============================================================================

@dataclass
class AuditContext:
    """Context for audit logging."""
    tenant_id: str
    user_id: str
    request_id: Optional[str] = None
    action_id: Optional[str] = None
    session_id: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "tenant_id": self.tenant_id,
            "user_id": self.user_id,
            "request_id": self.request_id,
            "action_id": self.action_id,
            "session_id": self.session_id,
        }


@dataclass
class ModelContext:
    """Model context for audit logging."""
    model_id: str
    model_version: str
    prompt_template_id: Optional[str] = None
    prompt_template_version: Optional[str] = None
    prompt_template_hash: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "model_version": self.model_version,
            "prompt_template_id": self.prompt_template_id,
            "prompt_template_version": self.prompt_template_version,
            "prompt_template_hash": self.prompt_template_hash,
        }


@dataclass
class PolicyContext:
    """Policy context for audit logging."""
    policy_version: str
    policy_rule_id: Optional[str] = None
    policy_decision: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "policy_version": self.policy_version,
            "policy_rule_id": self.policy_rule_id,
            "policy_decision": self.policy_decision,
        }


@dataclass
class AuditEntry:
    """Complete audit entry with all fields."""
    # Context
    context: AuditContext
    event_type: AuditEventType
    
    # Optional contexts
    model_context: Optional[ModelContext] = None
    policy_context: Optional[PolicyContext] = None
    
    # AI context
    intent_type: Optional[str] = None
    intent_confidence: Optional[float] = None
    action_plan_hash: Optional[str] = None
    risk_level: Optional[str] = None
    outcome: Optional[str] = None
    
    # Data changes
    diff_snapshot: Optional[Dict[str, Any]] = None
    
    # Error tracking
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    
    # Incident tracking
    incident_tag: Optional[IncidentTag] = None
    
    # Extra data
    extra_data: Optional[Dict[str, Any]] = None
    
    # Timestamps
    event_timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage."""
        result = {
            **self.context.to_dict(),
            "event_type": self.event_type.value,
            "event_timestamp": self.event_timestamp.isoformat(),
            "intent_type": self.intent_type,
            "intent_confidence": int(self.intent_confidence * 100) if self.intent_confidence else None,
            "action_plan_hash": self.action_plan_hash,
            "risk_level": self.risk_level,
            "outcome": self.outcome,
            "diff_snapshot": self.diff_snapshot,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "incident_tag": self.incident_tag.value if self.incident_tag else IncidentTag.NONE.value,
            "extra_data": self.extra_data or {},
        }
        
        if self.model_context:
            result.update(self.model_context.to_dict())
        
        if self.policy_context:
            result.update(self.policy_context.to_dict())
        
        return result


# =============================================================================
# Incident Bundle
# =============================================================================

@dataclass
class IncidentBundle:
    """
    Incident bundle for export.
    
    Contains all audit logs related to an incident plus metadata.
    """
    bundle_id: str
    incident_tag: IncidentTag
    created_at: datetime
    created_by: str
    reason: str
    audit_entries: List[Dict[str, Any]] = field(default_factory=list)
    entry_hashes: List[str] = field(default_factory=list)
    bundle_hash: Optional[str] = None
    
    def compute_bundle_hash(self) -> str:
        """Compute hash of the entire bundle for integrity verification."""
        content = json.dumps({
            "bundle_id": self.bundle_id,
            "incident_tag": self.incident_tag.value,
            "created_at": self.created_at.isoformat(),
            "entry_hashes": sorted(self.entry_hashes),
        }, sort_keys=True)
        return hashlib.sha256(content.encode()).hexdigest()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for export."""
        return {
            "bundleId": self.bundle_id,
            "incidentTag": self.incident_tag.value,
            "createdAt": self.created_at.isoformat(),
            "createdBy": self.created_by,
            "reason": self.reason,
            "auditEntries": self.audit_entries,
            "entryHashes": self.entry_hashes,
            "bundleHash": self.bundle_hash or self.compute_bundle_hash(),
            "entryCount": len(self.audit_entries),
        }
    
    def to_json(self) -> str:
        """Export as JSON string."""
        return json.dumps(self.to_dict(), indent=2, default=str)


# =============================================================================
# Audit Service
# =============================================================================

class AuditService:
    """
    Comprehensive audit service for AI Layer.
    
    Provides:
    - Centralized audit logging with field validation
    - Incident tagging
    - Incident bundle export
    
    This is a singleton service.
    """
    
    _instance: Optional["AuditService"] = None
    
    # In-memory storage (in production, use database)
    _audit_store: List[Dict[str, Any]] = []
    _incident_bundles: Dict[str, IncidentBundle] = {}
    
    def __init__(self):
        """Initialize the audit service."""
        self._audit_store = []
        self._incident_bundles = {}
    
    @classmethod
    def get(cls) -> "AuditService":
        """Get the singleton instance."""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def reset(cls) -> None:
        """Reset the singleton instance (for testing)."""
        cls._instance = None
        cls._audit_store = []
        cls._incident_bundles = {}
    
    def _generate_entry_id(self) -> str:
        """Generate a unique entry ID."""
        return f"ailog_{uuid4().hex}"
    
    def _generate_bundle_id(self) -> str:
        """Generate a unique bundle ID."""
        return f"bundle_{uuid4().hex}"
    
    def _compute_entry_hash(self, entry: Dict[str, Any]) -> str:
        """Compute hash of an audit entry for integrity."""
        # Exclude mutable fields from hash
        hashable = {k: v for k, v in entry.items() if k not in ["id", "incident_bundle_id"]}
        content = json.dumps(hashable, sort_keys=True, default=str)
        return hashlib.sha256(content.encode()).hexdigest()
    
    def _validate_required_fields(
        self,
        entry: Dict[str, Any],
        event_type: AuditEventType,
    ) -> List[str]:
        """
        Validate that all required fields are present.
        
        Returns list of missing fields.
        """
        missing = []
        
        # Check base required fields
        for field in REQUIRED_BASE_FIELDS:
            if not entry.get(field):
                missing.append(field)
        
        # Check event-specific required fields
        if event_type in [
            AuditEventType.REQUEST_RECEIVED,
            AuditEventType.INTENT_CLASSIFIED,
        ]:
            for field in REQUIRED_REQUEST_FIELDS:
                if not entry.get(field):
                    missing.append(field)
        
        if event_type in [
            AuditEventType.ACTION_PLANNED,
            AuditEventType.APPROVAL_REQUESTED,
            AuditEventType.APPROVAL_GRANTED,
            AuditEventType.APPROVAL_REJECTED,
        ]:
            for field in REQUIRED_ACTION_FIELDS:
                if not entry.get(field):
                    missing.append(field)
        
        if event_type in [
            AuditEventType.EXECUTION_COMPLETED,
            AuditEventType.EXECUTION_FAILED,
            AuditEventType.ROLLBACK_EXECUTED,
        ]:
            for field in REQUIRED_EXECUTION_FIELDS:
                if not entry.get(field):
                    missing.append(field)
        
        return missing

    
    def log_event(
        self,
        entry: AuditEntry,
        validate: bool = True,
    ) -> str:
        """
        Log an audit event.
        
        Args:
            entry: The audit entry to log
            validate: Whether to validate required fields
            
        Returns:
            The audit entry ID
            
        Raises:
            ValueError: If required fields are missing and validate=True
        """
        entry_id = self._generate_entry_id()
        entry_dict = entry.to_dict()
        entry_dict["id"] = entry_id
        entry_dict["created_at"] = datetime.now(timezone.utc).isoformat()
        
        # Validate required fields
        if validate:
            missing = self._validate_required_fields(entry_dict, entry.event_type)
            if missing:
                logger.warning(f"Audit entry missing required fields: {missing}")
                # Log anyway but mark as incomplete
                entry_dict["extra_data"] = entry_dict.get("extra_data", {})
                entry_dict["extra_data"]["_missing_fields"] = missing
        
        # Compute entry hash
        entry_dict["_entry_hash"] = self._compute_entry_hash(entry_dict)
        
        # Store entry
        self._audit_store.append(entry_dict)
        
        logger.info(
            f"Audit event logged: {entry.event_type.value}",
            extra={
                "audit_id": entry_id,
                "tenant_id": entry.context.tenant_id,
                "user_id": entry.context.user_id,
                "event_type": entry.event_type.value,
            }
        )
        
        return entry_id
    
    def log_request(
        self,
        context: AuditContext,
        model_context: ModelContext,
        intent_type: Optional[str] = None,
        intent_confidence: Optional[float] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Log a request received event."""
        entry = AuditEntry(
            context=context,
            event_type=AuditEventType.REQUEST_RECEIVED,
            model_context=model_context,
            intent_type=intent_type,
            intent_confidence=intent_confidence,
            extra_data=extra_data,
        )
        return self.log_event(entry)
    
    def log_intent_classified(
        self,
        context: AuditContext,
        model_context: ModelContext,
        intent_type: str,
        intent_confidence: float,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Log an intent classified event."""
        entry = AuditEntry(
            context=context,
            event_type=AuditEventType.INTENT_CLASSIFIED,
            model_context=model_context,
            intent_type=intent_type,
            intent_confidence=intent_confidence,
            outcome="success",
            extra_data=extra_data,
        )
        return self.log_event(entry)
    
    def log_action_planned(
        self,
        context: AuditContext,
        model_context: ModelContext,
        policy_context: PolicyContext,
        action_plan_hash: str,
        risk_level: str,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Log an action planned event."""
        entry = AuditEntry(
            context=context,
            event_type=AuditEventType.ACTION_PLANNED,
            model_context=model_context,
            policy_context=policy_context,
            action_plan_hash=action_plan_hash,
            risk_level=risk_level,
            outcome="success",
            extra_data=extra_data,
        )
        return self.log_event(entry)

    
    def log_execution(
        self,
        context: AuditContext,
        model_context: ModelContext,
        policy_context: PolicyContext,
        action_plan_hash: str,
        risk_level: str,
        outcome: str,
        diff_snapshot: Optional[Dict[str, Any]] = None,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Log an execution event (completed or failed)."""
        event_type = (
            AuditEventType.EXECUTION_COMPLETED 
            if outcome == "success" 
            else AuditEventType.EXECUTION_FAILED
        )
        
        entry = AuditEntry(
            context=context,
            event_type=event_type,
            model_context=model_context,
            policy_context=policy_context,
            action_plan_hash=action_plan_hash,
            risk_level=risk_level,
            outcome=outcome,
            diff_snapshot=diff_snapshot,
            error_code=error_code,
            error_message=error_message,
            extra_data=extra_data,
        )
        return self.log_event(entry)
    
    def log_policy_decision(
        self,
        context: AuditContext,
        policy_context: PolicyContext,
        action_plan_hash: str,
        risk_level: str,
        decision: str,
        extra_data: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Log a policy decision event."""
        event_type = (
            AuditEventType.POLICY_BLOCKED 
            if decision == "block" 
            else AuditEventType.POLICY_EVALUATED
        )
        
        entry = AuditEntry(
            context=context,
            event_type=event_type,
            policy_context=policy_context,
            action_plan_hash=action_plan_hash,
            risk_level=risk_level,
            outcome=decision,
            extra_data=extra_data,
        )
        return self.log_event(entry)
    
    # =========================================================================
    # Incident Tagging
    # =========================================================================
    
    def tag_incident(
        self,
        entry_id: str,
        tag: IncidentTag,
        reason: Optional[str] = None,
    ) -> bool:
        """
        Tag an audit entry as an incident.
        
        Args:
            entry_id: The audit entry ID to tag
            tag: The incident tag to apply
            reason: Optional reason for tagging
            
        Returns:
            True if successful, False if entry not found
        """
        for entry in self._audit_store:
            if entry.get("id") == entry_id:
                entry["incident_tag"] = tag.value
                if reason:
                    entry["extra_data"] = entry.get("extra_data", {})
                    entry["extra_data"]["incident_reason"] = reason
                
                logger.info(
                    f"Incident tagged: {entry_id} -> {tag.value}",
                    extra={
                        "audit_id": entry_id,
                        "incident_tag": tag.value,
                        "reason": reason,
                    }
                )
                return True
        
        return False
    
    def tag_incidents_by_request(
        self,
        request_id: str,
        tag: IncidentTag,
        reason: Optional[str] = None,
    ) -> int:
        """
        Tag all audit entries for a request as incidents.
        
        Args:
            request_id: The request ID to tag
            tag: The incident tag to apply
            reason: Optional reason for tagging
            
        Returns:
            Number of entries tagged
        """
        count = 0
        for entry in self._audit_store:
            if entry.get("request_id") == request_id:
                entry["incident_tag"] = tag.value
                if reason:
                    entry["extra_data"] = entry.get("extra_data", {})
                    entry["extra_data"]["incident_reason"] = reason
                count += 1
        
        logger.info(
            f"Incidents tagged by request: {request_id} -> {tag.value} ({count} entries)",
            extra={
                "request_id": request_id,
                "incident_tag": tag.value,
                "count": count,
            }
        )
        return count

    
    # =========================================================================
    # Incident Bundle Export
    # =========================================================================
    
    def create_incident_bundle(
        self,
        tag: IncidentTag,
        created_by: str,
        reason: str,
        request_ids: Optional[List[str]] = None,
        entry_ids: Optional[List[str]] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
    ) -> IncidentBundle:
        """
        Create an incident bundle from audit entries.
        
        Args:
            tag: The incident tag for the bundle
            created_by: User ID who created the bundle
            reason: Reason for creating the bundle
            request_ids: Optional list of request IDs to include
            entry_ids: Optional list of entry IDs to include
            from_date: Optional start date filter
            to_date: Optional end date filter
            
        Returns:
            IncidentBundle with all matching entries
        """
        bundle_id = self._generate_bundle_id()
        entries = []
        entry_hashes = []
        
        for entry in self._audit_store:
            include = False
            
            # Filter by request IDs
            if request_ids and entry.get("request_id") in request_ids:
                include = True
            
            # Filter by entry IDs
            if entry_ids and entry.get("id") in entry_ids:
                include = True
            
            # Filter by incident tag
            if entry.get("incident_tag") == tag.value:
                include = True
            
            # Filter by date range
            if from_date or to_date:
                entry_time = entry.get("event_timestamp", "")
                if from_date and entry_time < from_date.isoformat():
                    include = False
                if to_date and entry_time > to_date.isoformat():
                    include = False
            
            if include:
                # Tag entry with bundle ID
                entry["incident_bundle_id"] = bundle_id
                entry["incident_tag"] = tag.value
                
                entries.append(entry.copy())
                entry_hashes.append(entry.get("_entry_hash", ""))
        
        bundle = IncidentBundle(
            bundle_id=bundle_id,
            incident_tag=tag,
            created_at=datetime.now(timezone.utc),
            created_by=created_by,
            reason=reason,
            audit_entries=entries,
            entry_hashes=entry_hashes,
        )
        bundle.bundle_hash = bundle.compute_bundle_hash()
        
        # Store bundle
        self._incident_bundles[bundle_id] = bundle
        
        logger.info(
            f"Incident bundle created: {bundle_id}",
            extra={
                "bundle_id": bundle_id,
                "incident_tag": tag.value,
                "entry_count": len(entries),
                "created_by": created_by,
            }
        )
        
        return bundle
    
    def get_incident_bundle(self, bundle_id: str) -> Optional[IncidentBundle]:
        """Get an incident bundle by ID."""
        return self._incident_bundles.get(bundle_id)
    
    def export_incident_bundle(self, bundle_id: str) -> Optional[str]:
        """
        Export an incident bundle as JSON.
        
        Args:
            bundle_id: The bundle ID to export
            
        Returns:
            JSON string of the bundle, or None if not found
        """
        bundle = self._incident_bundles.get(bundle_id)
        if bundle:
            return bundle.to_json()
        return None
    
    def list_incident_bundles(
        self,
        tag: Optional[IncidentTag] = None,
    ) -> List[Dict[str, Any]]:
        """
        List all incident bundles.
        
        Args:
            tag: Optional filter by incident tag
            
        Returns:
            List of bundle summaries
        """
        bundles = []
        for bundle in self._incident_bundles.values():
            if tag and bundle.incident_tag != tag:
                continue
            bundles.append({
                "bundleId": bundle.bundle_id,
                "incidentTag": bundle.incident_tag.value,
                "createdAt": bundle.created_at.isoformat(),
                "createdBy": bundle.created_by,
                "reason": bundle.reason,
                "entryCount": len(bundle.audit_entries),
                "bundleHash": bundle.bundle_hash,
            })
        return bundles

    
    # =========================================================================
    # Query Methods
    # =========================================================================
    
    def get_entries(
        self,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        request_id: Optional[str] = None,
        event_type: Optional[AuditEventType] = None,
        incident_tag: Optional[IncidentTag] = None,
        from_date: Optional[datetime] = None,
        to_date: Optional[datetime] = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        Query audit entries with filtering.
        
        Returns:
            Tuple of (entries, total_count)
        """
        filtered = self._audit_store.copy()
        
        if tenant_id:
            filtered = [e for e in filtered if e.get("tenant_id") == tenant_id]
        if user_id:
            filtered = [e for e in filtered if e.get("user_id") == user_id]
        if request_id:
            filtered = [e for e in filtered if e.get("request_id") == request_id]
        if event_type:
            filtered = [e for e in filtered if e.get("event_type") == event_type.value]
        if incident_tag:
            filtered = [e for e in filtered if e.get("incident_tag") == incident_tag.value]
        if from_date:
            filtered = [e for e in filtered if e.get("event_timestamp", "") >= from_date.isoformat()]
        if to_date:
            filtered = [e for e in filtered if e.get("event_timestamp", "") <= to_date.isoformat()]
        
        # Sort by timestamp descending
        filtered.sort(key=lambda x: x.get("event_timestamp", ""), reverse=True)
        
        total = len(filtered)
        return filtered[offset:offset + limit], total
    
    def get_entry(self, entry_id: str) -> Optional[Dict[str, Any]]:
        """Get a single audit entry by ID."""
        for entry in self._audit_store:
            if entry.get("id") == entry_id:
                return entry.copy()
        return None
    
    def get_entries_by_request(self, request_id: str) -> List[Dict[str, Any]]:
        """Get all audit entries for a request."""
        return [e.copy() for e in self._audit_store if e.get("request_id") == request_id]
    
    def get_incidents(
        self,
        tenant_id: Optional[str] = None,
        tag: Optional[IncidentTag] = None,
    ) -> List[Dict[str, Any]]:
        """Get all entries tagged as incidents."""
        incidents = []
        for entry in self._audit_store:
            entry_tag = entry.get("incident_tag")
            if entry_tag and entry_tag != IncidentTag.NONE.value:
                if tenant_id and entry.get("tenant_id") != tenant_id:
                    continue
                if tag and entry_tag != tag.value:
                    continue
                incidents.append(entry.copy())
        return incidents
    
    def count_by_event_type(self, tenant_id: Optional[str] = None) -> Dict[str, int]:
        """Count entries by event type."""
        counts: Dict[str, int] = {}
        for entry in self._audit_store:
            if tenant_id and entry.get("tenant_id") != tenant_id:
                continue
            event_type = entry.get("event_type", "unknown")
            counts[event_type] = counts.get(event_type, 0) + 1
        return counts
    
    def count_incidents(self, tenant_id: Optional[str] = None) -> Dict[str, int]:
        """Count incidents by tag."""
        counts: Dict[str, int] = {}
        for entry in self._audit_store:
            if tenant_id and entry.get("tenant_id") != tenant_id:
                continue
            tag = entry.get("incident_tag")
            if tag and tag != IncidentTag.NONE.value:
                counts[tag] = counts.get(tag, 0) + 1
        return counts
    
    def has_required_fields(self, entry_id: str) -> tuple[bool, List[str]]:
        """
        Check if an entry has all required fields.
        
        Returns:
            Tuple of (has_all_fields, missing_fields)
        """
        entry = self.get_entry(entry_id)
        if not entry:
            return False, ["entry_not_found"]
        
        event_type = AuditEventType(entry.get("event_type", "request_received"))
        missing = self._validate_required_fields(entry, event_type)
        return len(missing) == 0, missing


# =============================================================================
# Global Instance
# =============================================================================

def get_audit_service() -> AuditService:
    """Get the global AuditService instance."""
    return AuditService.get()
