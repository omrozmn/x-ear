"""
Property-Based Tests for Audit Log Completeness

Tests Property 11: Audit Log Completeness
*For any* AI request that is processed, the resulting audit log entry SHALL contain 
all required fields: user_id, tenant_id, intent, action_plan, risk_level, outcome, 
model_id, model_version, prompt_template_version, policy_version.

**Validates: Requirements 9.1, 9.2, 11.6**

Requirements:
- 9.1: Log all requests, decisions, and actions to AI_Audit_Storage (append-only)
- 9.2: Include user_id, tenant_id, intent, action_plan, risk_level, outcome,
       model_id, model_version, prompt_template_version, policy_version
- 11.6: EACH audit record SHALL include model_id and model_version for A/B test traceability
"""

import os
import sys
from pathlib import Path

# Add the api directory to the path for imports
_api_dir = Path(__file__).resolve().parent.parent.parent
if str(_api_dir) not in sys.path:
    sys.path.insert(0, str(_api_dir))

import pytest
from hypothesis import given, strategies as st, settings, assume
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4


# =============================================================================
# Strategies for Property-Based Testing
# =============================================================================

@st.composite
def tenant_id_strategy(draw):
    """Generate valid tenant IDs."""
    return f"tenant_{draw(st.text(alphabet='abcdefghijklmnopqrstuvwxyz0123456789', min_size=4, max_size=16))}"


@st.composite
def user_id_strategy(draw):
    """Generate valid user IDs."""
    return f"user_{draw(st.text(alphabet='abcdefghijklmnopqrstuvwxyz0123456789', min_size=4, max_size=16))}"


@st.composite
def request_id_strategy(draw):
    """Generate valid request IDs."""
    return f"req_{uuid4().hex[:16]}"


@st.composite
def model_context_strategy(draw):
    """Generate valid model context."""
    from ai.services.audit_service import ModelContext
    
    model_id = draw(st.sampled_from(["qwen2.5-7b-instruct", "mistral-7b", "llama-3-8b"]))
    model_version = draw(st.sampled_from(["v1.0.0", "v1.1.0", "v2.0.0"]))
    prompt_template_id = draw(st.sampled_from(["intent_refiner_v1", "action_planner_v1", "executor_v1"]))
    prompt_template_version = draw(st.sampled_from(["1.0", "1.1", "2.0"]))
    prompt_template_hash = f"sha256_{uuid4().hex}"
    
    return ModelContext(
        model_id=model_id,
        model_version=model_version,
        prompt_template_id=prompt_template_id,
        prompt_template_version=prompt_template_version,
        prompt_template_hash=prompt_template_hash,
    )


@st.composite
def policy_context_strategy(draw):
    """Generate valid policy context."""
    from ai.services.audit_service import PolicyContext
    
    policy_version = draw(st.sampled_from(["1.0.0", "1.1.0", "2.0.0"]))
    policy_rule_id = draw(st.sampled_from(["rbac_check", "compliance_check", "risk_threshold", None]))
    policy_decision = draw(st.sampled_from(["allow", "block", "require_approval", None]))
    
    return PolicyContext(
        policy_version=policy_version,
        policy_rule_id=policy_rule_id,
        policy_decision=policy_decision,
    )


@st.composite
def audit_context_strategy(draw):
    """Generate valid audit context."""
    from ai.services.audit_service import AuditContext
    
    return AuditContext(
        tenant_id=draw(tenant_id_strategy()),
        user_id=draw(user_id_strategy()),
        request_id=draw(request_id_strategy()),
        action_id=f"action_{uuid4().hex[:16]}" if draw(st.booleans()) else None,
        session_id=f"session_{uuid4().hex[:16]}" if draw(st.booleans()) else None,
    )


@st.composite
def intent_strategy(draw):
    """Generate valid intent data."""
    intent_type = draw(st.sampled_from([
        "query", "action", "config_update", "report_generate", "feature_toggle"
    ]))
    confidence = draw(st.floats(min_value=0.0, max_value=1.0))
    return intent_type, confidence


@st.composite
def risk_level_strategy(draw):
    """Generate valid risk levels."""
    return draw(st.sampled_from(["low", "medium", "high", "critical"]))


@st.composite
def outcome_strategy(draw):
    """Generate valid outcomes."""
    return draw(st.sampled_from(["success", "failure", "blocked", "timeout", "rejected"]))


# =============================================================================
# Helper Functions
# =============================================================================

def reset_audit_service():
    """Reset the audit service for testing."""
    from ai.services.audit_service import AuditService
    AuditService.reset()


# =============================================================================
# Property Tests
# =============================================================================

class TestAuditLogCompletenessProperty:
    """
    Property 11: Audit Log Completeness
    
    **Feature: ai-layer-architecture, Property 11: Audit Log Completeness**
    **Validates: Requirements 9.1, 9.2, 11.6**
    """
    
    @settings(max_examples=100, deadline=None)
    @given(
        audit_context=audit_context_strategy(),
        model_context=model_context_strategy(),
        intent_data=intent_strategy(),
    )
    def test_request_audit_contains_required_fields(
        self,
        audit_context,
        model_context,
        intent_data,
    ):
        """
        Property: Request audit entries contain all required base and model fields.
        
        For any AI request that is logged, the audit entry SHALL contain:
        - tenant_id
        - user_id
        - event_type
        - event_timestamp
        - model_id
        - model_version
        """
        reset_audit_service()
        from ai.services.audit_service import AuditService
        from ai.models.ai_audit_log import AuditEventType
        
        service = AuditService.get()
        intent_type, intent_confidence = intent_data
        
        # Log a request event
        entry_id = service.log_request(
            context=audit_context,
            model_context=model_context,
            intent_type=intent_type,
            intent_confidence=intent_confidence,
        )
        
        # Retrieve the entry
        entry = service.get_entry(entry_id)
        
        # Verify required base fields
        assert entry is not None, "Entry should exist"
        assert entry.get("tenant_id") == audit_context.tenant_id
        assert entry.get("user_id") == audit_context.user_id
        assert entry.get("event_type") == AuditEventType.REQUEST_RECEIVED.value
        assert entry.get("event_timestamp") is not None
        
        # Verify model tracking fields (Requirement 11.6)
        assert entry.get("model_id") == model_context.model_id
        assert entry.get("model_version") == model_context.model_version
    
    @settings(max_examples=100, deadline=None)
    @given(
        audit_context=audit_context_strategy(),
        model_context=model_context_strategy(),
        policy_context=policy_context_strategy(),
        risk_level=risk_level_strategy(),
    )
    def test_action_audit_contains_required_fields(
        self,
        audit_context,
        model_context,
        policy_context,
        risk_level,
    ):
        """
        Property: Action audit entries contain all required fields.
        
        For any action plan that is logged, the audit entry SHALL contain:
        - All base fields
        - action_plan_hash
        - risk_level
        - policy_version
        """
        reset_audit_service()
        from ai.services.audit_service import AuditService
        from ai.models.ai_audit_log import AuditEventType
        
        service = AuditService.get()
        action_plan_hash = f"sha256_{uuid4().hex}"
        
        # Ensure action_id is set for action events
        audit_context.action_id = f"action_{uuid4().hex[:16]}"
        
        # Log an action planned event
        entry_id = service.log_action_planned(
            context=audit_context,
            model_context=model_context,
            policy_context=policy_context,
            action_plan_hash=action_plan_hash,
            risk_level=risk_level,
        )
        
        # Retrieve the entry
        entry = service.get_entry(entry_id)
        
        # Verify required fields
        assert entry is not None, "Entry should exist"
        assert entry.get("tenant_id") == audit_context.tenant_id
        assert entry.get("user_id") == audit_context.user_id
        assert entry.get("action_plan_hash") == action_plan_hash
        assert entry.get("risk_level") == risk_level
        assert entry.get("policy_version") == policy_context.policy_version
        
        # Verify model tracking fields
        assert entry.get("model_id") == model_context.model_id
        assert entry.get("model_version") == model_context.model_version
        assert entry.get("prompt_template_version") == model_context.prompt_template_version
        assert entry.get("prompt_template_hash") == model_context.prompt_template_hash

    
    @settings(max_examples=100, deadline=None)
    @given(
        audit_context=audit_context_strategy(),
        model_context=model_context_strategy(),
        policy_context=policy_context_strategy(),
        risk_level=risk_level_strategy(),
        outcome=outcome_strategy(),
    )
    def test_execution_audit_contains_required_fields(
        self,
        audit_context,
        model_context,
        policy_context,
        risk_level,
        outcome,
    ):
        """
        Property: Execution audit entries contain all required fields.
        
        For any execution that is logged, the audit entry SHALL contain:
        - All base fields
        - outcome
        - policy_version
        - model_id and model_version
        """
        reset_audit_service()
        from ai.services.audit_service import AuditService
        from ai.models.ai_audit_log import AuditEventType
        
        service = AuditService.get()
        action_plan_hash = f"sha256_{uuid4().hex}"
        
        # Ensure action_id is set for execution events
        audit_context.action_id = f"action_{uuid4().hex[:16]}"
        
        # Log an execution event
        entry_id = service.log_execution(
            context=audit_context,
            model_context=model_context,
            policy_context=policy_context,
            action_plan_hash=action_plan_hash,
            risk_level=risk_level,
            outcome=outcome,
        )
        
        # Retrieve the entry
        entry = service.get_entry(entry_id)
        
        # Verify required fields
        assert entry is not None, "Entry should exist"
        assert entry.get("tenant_id") == audit_context.tenant_id
        assert entry.get("user_id") == audit_context.user_id
        assert entry.get("outcome") == outcome
        assert entry.get("policy_version") == policy_context.policy_version
        
        # Verify model tracking fields (Requirement 11.6)
        assert entry.get("model_id") == model_context.model_id
        assert entry.get("model_version") == model_context.model_version
    
    @settings(max_examples=100, deadline=None)
    @given(
        audit_context=audit_context_strategy(),
        model_context=model_context_strategy(),
    )
    def test_audit_entries_have_unique_ids(
        self,
        audit_context,
        model_context,
    ):
        """
        Property: Each audit entry has a unique ID.
        
        For any set of audit entries, each entry SHALL have a unique ID.
        """
        reset_audit_service()
        from ai.services.audit_service import AuditService
        
        service = AuditService.get()
        
        # Log multiple entries
        entry_ids = []
        for _ in range(5):
            entry_id = service.log_request(
                context=audit_context,
                model_context=model_context,
            )
            entry_ids.append(entry_id)
        
        # Verify all IDs are unique
        assert len(entry_ids) == len(set(entry_ids)), "All entry IDs should be unique"
    
    @settings(max_examples=100, deadline=None)
    @given(
        audit_context=audit_context_strategy(),
        model_context=model_context_strategy(),
    )
    def test_audit_entries_have_entry_hash(
        self,
        audit_context,
        model_context,
    ):
        """
        Property: Each audit entry has a computed hash for integrity.
        
        For any audit entry, the entry SHALL have a computed hash.
        """
        reset_audit_service()
        from ai.services.audit_service import AuditService
        
        service = AuditService.get()
        
        # Log an entry
        entry_id = service.log_request(
            context=audit_context,
            model_context=model_context,
        )
        
        # Retrieve the entry
        entry = service.get_entry(entry_id)
        
        # Verify hash exists and is valid SHA-256 format
        assert entry is not None
        entry_hash = entry.get("_entry_hash")
        assert entry_hash is not None, "Entry should have a hash"
        assert len(entry_hash) == 64, "Hash should be SHA-256 (64 hex chars)"



class TestIncidentTaggingProperty:
    """
    Tests for incident tagging functionality.
    
    **Validates: Requirements 9.7, 19.1, 19.2, 19.3**
    """
    
    @settings(max_examples=100, deadline=None)
    @given(
        audit_context=audit_context_strategy(),
        model_context=model_context_strategy(),
        incident_tag=st.sampled_from([
            "security", "policy_violation", "data_leak", 
            "prompt_injection", "schema_drift", "unauthorized_access"
        ]),
    )
    def test_incident_tagging_persists(
        self,
        audit_context,
        model_context,
        incident_tag,
    ):
        """
        Property: Incident tags are persisted on audit entries.
        
        For any audit entry that is tagged as an incident, the tag SHALL persist.
        """
        reset_audit_service()
        from ai.services.audit_service import AuditService
        from ai.models.ai_audit_log import IncidentTag
        
        service = AuditService.get()
        
        # Log an entry
        entry_id = service.log_request(
            context=audit_context,
            model_context=model_context,
        )
        
        # Tag as incident
        tag = IncidentTag(incident_tag)
        result = service.tag_incident(entry_id, tag, reason="Test incident")
        
        assert result is True, "Tagging should succeed"
        
        # Retrieve and verify
        entry = service.get_entry(entry_id)
        assert entry is not None
        assert entry.get("incident_tag") == incident_tag
    
    @settings(max_examples=100, deadline=None)
    @given(
        audit_context=audit_context_strategy(),
        model_context=model_context_strategy(),
    )
    def test_incident_bundle_creation(
        self,
        audit_context,
        model_context,
    ):
        """
        Property: Incident bundles contain all tagged entries.
        
        For any incident bundle, it SHALL contain all entries with the matching tag.
        """
        reset_audit_service()
        from ai.services.audit_service import AuditService
        from ai.models.ai_audit_log import IncidentTag
        
        service = AuditService.get()
        
        # Log multiple entries with same request_id
        request_id = f"req_{uuid4().hex[:16]}"
        audit_context.request_id = request_id
        
        entry_ids = []
        for _ in range(3):
            entry_id = service.log_request(
                context=audit_context,
                model_context=model_context,
            )
            entry_ids.append(entry_id)
        
        # Tag all entries
        for entry_id in entry_ids:
            service.tag_incident(entry_id, IncidentTag.SECURITY, reason="Test")
        
        # Create incident bundle
        bundle = service.create_incident_bundle(
            tag=IncidentTag.SECURITY,
            created_by="test_user",
            reason="Test bundle",
            request_ids=[request_id],
        )
        
        # Verify bundle contains all entries
        assert bundle is not None
        assert len(bundle.audit_entries) >= len(entry_ids)
        assert bundle.bundle_hash is not None
        assert len(bundle.bundle_hash) == 64  # SHA-256
    
    @settings(max_examples=100, deadline=None)
    @given(
        audit_context=audit_context_strategy(),
        model_context=model_context_strategy(),
    )
    def test_incident_bundle_export(
        self,
        audit_context,
        model_context,
    ):
        """
        Property: Incident bundles can be exported as JSON.
        
        For any incident bundle, it SHALL be exportable in standard JSON format.
        """
        reset_audit_service()
        from ai.services.audit_service import AuditService
        from ai.models.ai_audit_log import IncidentTag
        import json
        
        service = AuditService.get()
        
        # Log an entry
        entry_id = service.log_request(
            context=audit_context,
            model_context=model_context,
        )
        
        # Tag as incident
        service.tag_incident(entry_id, IncidentTag.SECURITY, reason="Test")
        
        # Create bundle
        bundle = service.create_incident_bundle(
            tag=IncidentTag.SECURITY,
            created_by="test_user",
            reason="Test export",
            entry_ids=[entry_id],
        )
        
        # Export as JSON
        json_str = service.export_incident_bundle(bundle.bundle_id)
        
        assert json_str is not None
        
        # Verify it's valid JSON
        parsed = json.loads(json_str)
        assert "bundleId" in parsed
        assert "incidentTag" in parsed
        assert "auditEntries" in parsed
        assert "bundleHash" in parsed



class TestAuditServiceUnit:
    """Unit tests for AuditService functionality."""
    
    def test_service_singleton(self):
        """AuditService is a singleton."""
        reset_audit_service()
        from ai.services.audit_service import AuditService
        
        service1 = AuditService.get()
        service2 = AuditService.get()
        
        assert service1 is service2
    
    def test_log_intent_classified(self):
        """Log intent classified event."""
        reset_audit_service()
        from ai.services.audit_service import AuditService, AuditContext, ModelContext
        from ai.models.ai_audit_log import AuditEventType
        
        service = AuditService.get()
        
        context = AuditContext(
            tenant_id="tenant_123",
            user_id="user_456",
            request_id="req_789",
        )
        model_context = ModelContext(
            model_id="qwen2.5-7b-instruct",
            model_version="v1.0.0",
            prompt_template_version="1.0",
            prompt_template_hash="abc123",
        )
        
        entry_id = service.log_intent_classified(
            context=context,
            model_context=model_context,
            intent_type="query",
            intent_confidence=0.95,
        )
        
        entry = service.get_entry(entry_id)
        assert entry is not None
        assert entry.get("event_type") == AuditEventType.INTENT_CLASSIFIED.value
        assert entry.get("intent_type") == "query"
        assert entry.get("intent_confidence") == 95  # Stored as int 0-100
    
    def test_log_policy_decision(self):
        """Log policy decision event."""
        reset_audit_service()
        from ai.services.audit_service import AuditService, AuditContext, PolicyContext
        from ai.models.ai_audit_log import AuditEventType
        
        service = AuditService.get()
        
        context = AuditContext(
            tenant_id="tenant_123",
            user_id="user_456",
            request_id="req_789",
        )
        policy_context = PolicyContext(
            policy_version="1.0.0",
            policy_rule_id="rbac_check",
            policy_decision="block",
        )
        
        entry_id = service.log_policy_decision(
            context=context,
            policy_context=policy_context,
            action_plan_hash="hash123",
            risk_level="high",
            decision="block",
        )
        
        entry = service.get_entry(entry_id)
        assert entry is not None
        assert entry.get("event_type") == AuditEventType.POLICY_BLOCKED.value
        assert entry.get("policy_version") == "1.0.0"
        assert entry.get("policy_rule_id") == "rbac_check"
    
    def test_get_entries_by_request(self):
        """Get all entries for a request."""
        reset_audit_service()
        from ai.services.audit_service import AuditService, AuditContext, ModelContext
        
        service = AuditService.get()
        
        request_id = "req_test123"
        context = AuditContext(
            tenant_id="tenant_123",
            user_id="user_456",
            request_id=request_id,
        )
        model_context = ModelContext(
            model_id="qwen2.5-7b-instruct",
            model_version="v1.0.0",
        )
        
        # Log multiple entries for same request
        service.log_request(context=context, model_context=model_context)
        service.log_intent_classified(
            context=context,
            model_context=model_context,
            intent_type="query",
            intent_confidence=0.9,
        )
        
        # Get entries by request
        entries = service.get_entries_by_request(request_id)
        
        assert len(entries) == 2
        for entry in entries:
            assert entry.get("request_id") == request_id
    
    def test_count_by_event_type(self):
        """Count entries by event type."""
        reset_audit_service()
        from ai.services.audit_service import AuditService, AuditContext, ModelContext
        from ai.models.ai_audit_log import AuditEventType
        
        service = AuditService.get()
        
        context = AuditContext(
            tenant_id="tenant_123",
            user_id="user_456",
        )
        model_context = ModelContext(
            model_id="qwen2.5-7b-instruct",
            model_version="v1.0.0",
        )
        
        # Log different event types
        service.log_request(context=context, model_context=model_context)
        service.log_request(context=context, model_context=model_context)
        service.log_intent_classified(
            context=context,
            model_context=model_context,
            intent_type="query",
            intent_confidence=0.9,
        )
        
        counts = service.count_by_event_type()
        
        assert counts.get(AuditEventType.REQUEST_RECEIVED.value) == 2
        assert counts.get(AuditEventType.INTENT_CLASSIFIED.value) == 1
    
    def test_has_required_fields_validation(self):
        """Validate required fields check."""
        reset_audit_service()
        from ai.services.audit_service import AuditService, AuditContext, ModelContext
        
        service = AuditService.get()
        
        # Log with all required fields
        context = AuditContext(
            tenant_id="tenant_123",
            user_id="user_456",
            request_id="req_789",
        )
        model_context = ModelContext(
            model_id="qwen2.5-7b-instruct",
            model_version="v1.0.0",
        )
        
        entry_id = service.log_request(
            context=context,
            model_context=model_context,
        )
        
        has_all, missing = service.has_required_fields(entry_id)
        
        assert has_all is True
        assert len(missing) == 0
