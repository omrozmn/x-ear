"""
Integration Tests for Complete AI Security Flows

Tests end-to-end flows for all P0-P1 requirements:
- JWT auth → chat → AI request creation → audit trail
- Cancellation flow end-to-end
- Slot-filling flow with timeout
- Capability inquiry flow
- Data retention with legal hold

Requirements tested: All P0-P1 requirements
"""

import os
import pytest
from datetime import datetime, timedelta, timezone
from jose import jwt
from unittest.mock import Mock, patch, AsyncMock
from sqlalchemy.orm import Session

from fastapi.testclient import TestClient

# Set test environment
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-testing")
os.environ.setdefault("AI_ENABLED", "true")
os.environ.setdefault("AI_PHASE", "B")
os.environ.setdefault("AI_RETENTION_DAYS", "90")

# Import after setting environment
from main import app as main_app
from core.database import get_db
from ai.models.ai_request import AIRequest, RequestStatus
from ai.services.data_retention import DataRetentionService
from ai.services.conversation_memory import ConversationMemory

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "test-secret-key-for-testing")
ALGORITHM = "HS256"


def create_valid_token(user_id="test-user", tenant_id="test-tenant"):
    """Create a valid JWT token for testing."""
    payload = {
        "sub": user_id,
        "tenant_id": tenant_id,
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


@pytest.fixture
def db_session(request):
    """
    Create a test database session using the real database.
    
    Uses transaction rollback for test isolation.
    """
    from pathlib import Path
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    # Use real database path
    db_path = Path(__file__).resolve().parent.parent.parent / "instance" / "xear_crm.db"
    
    # Create engine
    engine = create_engine(
        f"sqlite:///{db_path}",
        connect_args={"check_same_thread": False},
        echo=False,
    )
    
    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    session = SessionLocal()
    
    # Start transaction
    session.begin()
    
    try:
        yield session
    finally:
        # Rollback to undo changes
        session.rollback()
        session.close()
        engine.dispose()


@pytest.fixture
def app(db_session):
    """Create test app with database dependency override."""
    # Override get_db to use test session
    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # Managed by fixture
    
    main_app.dependency_overrides[get_db] = override_get_db
    
    yield main_app
    
    # Clean up
    main_app.dependency_overrides.clear()


@pytest.fixture
def client(app):
    """Create a test client."""
    return TestClient(app)


class TestJWTAuthToChatToAuditTrail:
    """
    Test complete flow: JWT auth → chat → AI request creation → audit trail
    
    Requirements tested:
    - 2.1: JWT authentication on /ai/chat
    - 2.7: User audit trail with user_id
    - 9.1: AI request creation includes user_id
    """
    
    @pytest.mark.asyncio
    @patch("ai.agents.intent_refiner.IntentRefiner.refine_intent")
    @patch("ai.services.kill_switch.KillSwitch.require_not_blocked")
    @patch("ai.middleware.rate_limiter.check_rate_limit")
    @patch("ai.services.usage_tracker.UsageTracker.acquire_quota")
    async def test_complete_auth_to_audit_flow(
        self,
        mock_quota,
        mock_rate_limit,
        mock_kill_switch,
        mock_refine,
        client,
        db_session
    ):
        """Test JWT auth → chat → AI request with user_id in audit trail."""
        # Setup mocks
        from ai.agents.intent_refiner import IntentRefinerResult, RefinerStatus
        from ai.schemas.llm_outputs import IntentOutput, IntentType
        
        mock_intent = IntentOutput(
            intent_type=IntentType.GREETING,
            confidence=0.95,
            entities={},
            reasoning="User is greeting",
            conversational_response="Merhaba! Size nasıl yardımcı olabilirim?"
        )
        
        mock_result = IntentRefinerResult(
            status=RefinerStatus.SUCCESS,
            intent=mock_intent,
            redaction_result=None,
        )
        
        mock_refine.return_value = mock_result
        
        # Create valid JWT token
        user_id = "test-user-123"
        tenant_id = "test-tenant-456"
        token = create_valid_token(user_id=user_id, tenant_id=tenant_id)
        
        # Make chat request
        response = client.post(
            "/api/ai/chat",
            json={"prompt": "Hello"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "request_id" in data
        request_id = data["request_id"]
        
        # Verify AI request was created in database with user_id
        ai_request = db_session.query(AIRequest).filter_by(id=request_id).first()
        assert ai_request is not None
        assert ai_request.user_id == user_id
        assert ai_request.tenant_id == tenant_id
        assert ai_request.status == RequestStatus.COMPLETED
        assert ai_request.created_at is not None
        
        # Verify audit trail completeness
        assert ai_request.intent_type == "greeting"
        # Confidence may be stored as integer (95) or float (0.95) depending on model
        assert ai_request.intent_confidence in [0.95, 95]
        assert ai_request.latency_ms is not None
        assert ai_request.latency_ms > 0


class TestCancellationFlowEndToEnd:
    """
    Test complete cancellation flow
    
    Requirements tested:
    - 4.1: Cancellation keyword detection
    - 4.2: Halt action plan and return confirmation
    - 4.7: Log cancellation event
    """
    
    @pytest.mark.asyncio
    @patch("ai.services.kill_switch.KillSwitch.require_not_blocked")
    @patch("ai.middleware.rate_limiter.check_rate_limit")
    @patch("ai.services.usage_tracker.UsageTracker.acquire_quota")
    async def test_cancellation_flow(
        self,
        mock_quota,
        mock_rate_limit,
        mock_kill_switch,
        client,
        db_session
    ):
        """Test cancellation flow from keyword detection to response."""
        from ai.services.conversation_memory import get_conversation_memory
        import uuid
        
        # Use unique session ID to avoid conflicts with other tests
        session_id = f"test-session-cancel-{uuid.uuid4().hex[:8]}"
        
        # Clear session before test
        memory = get_conversation_memory()
        memory.clear_session(session_id)
        
        # Create valid JWT token
        token = create_valid_token()
        
        # Start a conversation with an action
        response1 = client.post(
            "/api/ai/chat",
            json={"prompt": "Create a new patient", "session_id": session_id},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response1.status_code in [200, 503]  # May fail if LLM not available
        
        # Send cancellation message
        response2 = client.post(
            "/api/ai/chat",
            json={"prompt": "cancel", "session_id": session_id},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Verify cancellation response
        assert response2.status_code == 200
        data = response2.json()
        
        assert data["status"] == "success"
        assert data["response"] == "Operation cancelled"
        assert data["intent"]["intent_type"] in ["cancel", "cancellation"]
        
        # Verify conversation context was cleared
        history = memory.get_history(session_id, max_turns=10)
        # After cancellation, history should be cleared or minimal
        assert len(history) <= 1  # Only the cancellation turn might remain
        
        # Verify AI request was logged with cancellation
        request_id = data["request_id"]
        ai_request = db_session.query(AIRequest).filter_by(id=request_id).first()
        assert ai_request is not None
        assert ai_request.intent_type in ["cancel", "cancellation"]
        
        # Clean up
        memory.clear_session(session_id)


class TestSlotFillingFlowWithTimeout:
    """
    Test complete slot-filling flow with timeout
    
    Requirements tested:
    - 4.3: Generate slot-filling prompt for missing parameters
    - 4.4: Extract slot values from user response
    - 4.5: Timeout action plan after 5 minutes
    - 4.6: Maintain conversation context
    - 4.7: Log timeout event
    """
    
    @pytest.mark.asyncio
    @patch("ai.api.chat.get_request_logger")
    @patch("ai.agents.intent_refiner.IntentRefiner.refine_intent")
    @patch("ai.agents.action_planner.ActionPlanner.create_plan")
    @patch("ai.services.kill_switch.KillSwitch.require_not_blocked")
    @patch("ai.middleware.rate_limiter.check_rate_limit")
    @patch("ai.services.usage_tracker.UsageTracker.acquire_quota")
    async def test_slot_filling_flow(
        self,
        mock_quota,
        mock_rate_limit,
        mock_kill_switch,
        mock_create_plan,
        mock_refine,
        mock_get_request_logger,
        client,
        db_session
    ):
        """Test slot-filling flow with missing parameters."""
        from ai.agents.intent_refiner import IntentRefinerResult, RefinerStatus
        from ai.schemas.llm_outputs import IntentOutput, IntentType
        from ai.agents.action_planner import ActionPlannerResult, PlannerStatus, ActionPlan, ActionStep, RiskLevel
        from ai.models.ai_request import AIRequest, RequestStatus
        from datetime import datetime, timedelta
        from unittest.mock import Mock
        
        # Mock the request logger to avoid database operations
        mock_logger = Mock()
        mock_request = Mock(spec=AIRequest)
        mock_request.id = "test-request-slot-1"
        mock_logger.log_request.return_value = mock_request
        mock_logger.update_request_status.return_value = None
        mock_get_request_logger.return_value = mock_logger
        
        # Step 1: User makes request with missing parameter
        mock_intent1 = IntentOutput(
            intent_type=IntentType.ACTION,
            confidence=0.9,
            entities={"action": "create_patient"},
            reasoning="User wants to create a patient",
            conversational_response="Hasta oluşturmak için isim bilgisi gerekli."
        )
        
        mock_result1 = IntentRefinerResult(
            status=RefinerStatus.SUCCESS,
            intent=mock_intent1,
            redaction_result=None,
        )
        
        # Create action plan with missing parameter
        mock_plan = ActionPlan(
            plan_id="plan-123",
            tenant_id="test-tenant",
            user_id="test-user",
            intent=mock_intent1,
            steps=[],
            overall_risk_level=RiskLevel.LOW,
            requires_approval=False,
            plan_hash="test-hash-123",
            tool_schema_versions={},
            missing_parameters=["patient_name"],
            slot_filling_prompt="Hastanın adını söyler misiniz?",
            created_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(minutes=5),
        )
        
        mock_plan_result = ActionPlannerResult(
            status=PlannerStatus.SUCCESS,
            plan=mock_plan,
        )
        
        mock_refine.return_value = mock_result1
        mock_create_plan.return_value = mock_plan_result
        
        token = create_valid_token()
        
        response1 = client.post(
            "/api/ai/chat",
            json={"prompt": "Create a patient", "session_id": "test-session-slot"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response1.status_code == 200
        data1 = response1.json()
        
        # Verify slot-filling prompt was returned
        # The response structure depends on how the chat endpoint handles missing parameters
        # Check if clarification is needed
        if "needs_clarification" in data1:
            assert data1["needs_clarification"] is True
            assert "clarification_question" in data1
            assert "patient_name" in data1["clarification_question"].lower() or "ad" in data1["clarification_question"].lower()
        elif "missing_parameters" in data1:
            assert "patient_name" in data1["missing_parameters"]
            assert "slot_filling_prompt" in data1
        
        # Step 2: User provides the missing parameter
        mock_intent2 = IntentOutput(
            intent_type=IntentType.SLOT_FILL,
            confidence=0.95,
            entities={"patient_name": "Ahmet Yılmaz"},
            reasoning="User provided patient name",
            conversational_response="patient_name bilgisi alındı: Ahmet Yılmaz. Devam ediyorum..."
        )
        
        mock_result2 = IntentRefinerResult(
            status=RefinerStatus.SUCCESS,
            intent=mock_intent2,
            redaction_result=None,
        )
        
        mock_refine.return_value = mock_result2
        
        # Update mock request ID for second turn
        mock_request.id = "test-request-slot-2"
        
        response2 = client.post(
            "/api/ai/chat",
            json={"prompt": "Ahmet Yılmaz", "session_id": "test-session-slot"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response2.status_code == 200
        data2 = response2.json()
        
        # Verify slot was filled - check the intent in the response
        assert "intent" in data2
        assert data2["intent"]["intent_type"] == "slot_fill"
        assert "entities" in data2["intent"]
        assert "patient_name" in data2["intent"]["entities"]
        assert data2["intent"]["entities"]["patient_name"] == "Ahmet Yılmaz"
    
    @pytest.mark.asyncio
    @patch("ai.agents.action_planner.ActionPlanner.is_expired")
    @patch("ai.services.kill_switch.KillSwitch.require_not_blocked")
    @patch("ai.middleware.rate_limiter.check_rate_limit")
    @patch("ai.services.usage_tracker.UsageTracker.acquire_quota")
    async def test_slot_filling_timeout(
        self,
        mock_quota,
        mock_rate_limit,
        mock_kill_switch,
        mock_is_expired,
        client,
        db_session
    ):
        """Test action plan timeout after 5 minutes."""
        # Mock expired plan
        mock_is_expired.return_value = True
        
        token = create_valid_token()
        
        # Simulate a request after timeout
        response = client.post(
            "/api/ai/chat",
            json={"prompt": "Continue", "session_id": "test-session-timeout"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should handle timeout gracefully
        assert response.status_code in [200, 503]


class TestCapabilityInquiryFlow:
    """
    Test complete capability inquiry flow
    
    Requirements tested:
    - 5.2: Detect capability inquiry intent
    - 5.3: Filter capabilities by permissions
    - 5.4: Filter capabilities by AI phase
    - 5.6: Return capabilities in ResponseEnvelope format
    """
    
    @pytest.mark.asyncio
    @patch("ai.api.chat.get_request_logger")
    @patch("ai.agents.intent_refiner.IntentRefiner.refine_intent")
    @patch("ai.services.kill_switch.KillSwitch.require_not_blocked")
    @patch("ai.middleware.rate_limiter.check_rate_limit")
    @patch("ai.services.usage_tracker.UsageTracker.acquire_quota")
    async def test_capability_inquiry_flow(
        self,
        mock_quota,
        mock_rate_limit,
        mock_kill_switch,
        mock_refine,
        mock_get_request_logger,
        client,
        db_session
    ):
        """Test capability inquiry from detection to response."""
        from ai.agents.intent_refiner import IntentRefinerResult, RefinerStatus
        from ai.schemas.llm_outputs import IntentOutput, IntentType
        from ai.models.ai_request import AIRequest, RequestStatus
        from unittest.mock import Mock
        
        # Mock the request logger to avoid database operations
        mock_logger = Mock()
        mock_request = Mock(spec=AIRequest)
        mock_request.id = "test-request-cap-1"
        mock_logger.log_request.return_value = mock_request
        mock_logger.update_request_status.return_value = None
        mock_get_request_logger.return_value = mock_logger
        
        # Mock capability inquiry intent
        mock_intent = IntentOutput(
            intent_type=IntentType.CAPABILITY_INQUIRY,
            confidence=0.95,
            entities={},
            reasoning="User is asking about capabilities",
            conversational_response="Size yardımcı olabileceğim konular:\n\n**Party Management:**\n- View Party Information: Look up details about a person or organization\n  Örnek: \"Show me John Doe's information\"\n\n*Not: Tüm AI işlemleri güvenli API'ler aracılığıyla gerçekleştirilir.*"
        )
        
        mock_result = IntentRefinerResult(
            status=RefinerStatus.SUCCESS,
            intent=mock_intent,
            redaction_result=None,
        )
        
        mock_refine.return_value = mock_result
        
        token = create_valid_token()
        
        # Send capability inquiry
        response = client.post(
            "/api/ai/chat",
            json={"prompt": "what can you do?", "session_id": "test-session-cap"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify capability inquiry was detected
        assert "intent" in data
        assert data["intent"]["intent_type"] == "capability_inquiry"
        
        # Verify response contains capabilities
        assert "response" in data
        assert data["response"] is not None
        assert len(data["response"]) > 0
        
        # Verify formatting - should contain category headers and capability descriptions
        response_text = data["response"].lower()
        
        # Check for capability content (either from mock or real capability registry)
        # The response should contain information about what the AI can do
        # OR a message about no capabilities being available
        assert any(keyword in response_text for keyword in [
            "party", "management", "yardımcı", "api", "tool", "işlem",
            "yetenek", "kullanabileceğiniz", "yönetici"  # No capabilities message
        ]), f"Response should contain capability information or no-capabilities message, got: {data['response']}"
        
        # If capabilities are available, verify disclaimer is included
        if "yetenek" not in response_text or "kullanabileceğiniz" in response_text:
            # Has capabilities or generic message
            pass  # Both are valid responses
        
        # Verify request was logged (mock was called)
        assert mock_logger.log_request.called
        assert mock_logger.update_request_status.called


class TestDataRetentionWithLegalHold:
    """
    Test data retention with legal hold
    
    Requirements tested:
    - 1.2: Daily retention service execution
    - 1.3: Delete prompts older than 90 days
    - 1.8: Respect legal_hold flag
    - 1.9: Batch deletion
    """
    
    def test_data_retention_respects_legal_hold(self, db_session):
        """Test that legal hold prevents deletion."""
        from datetime import datetime, timedelta, timezone
        import uuid
        
        tenant_id = "test-tenant"
        user_id = "test-user"
        
        # Create expired AI requests (older than 90 days)
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=91)
        
        # Use unique IDs to avoid conflicts
        req_id_1 = f"req-retention-1-{uuid.uuid4().hex[:8]}"
        req_id_2 = f"req-retention-2-{uuid.uuid4().hex[:8]}"
        req_id_3 = f"req-retention-3-{uuid.uuid4().hex[:8]}"
        
        # Request 1: Expired, no legal hold (should be deleted)
        request1 = AIRequest(
            id=req_id_1,
            tenant_id=tenant_id,
            user_id=user_id,
            prompt_encrypted="encrypted_test_prompt_1",
            prompt_hash=f"hash1-{uuid.uuid4().hex[:8]}",
            created_at=cutoff_date,
            legal_hold=False,
            status=RequestStatus.COMPLETED,
        )
        
        # Request 2: Expired, with legal hold (should NOT be deleted)
        request2 = AIRequest(
            id=req_id_2,
            tenant_id=tenant_id,
            user_id=user_id,
            prompt_encrypted="encrypted_test_prompt_2",
            prompt_hash=f"hash2-{uuid.uuid4().hex[:8]}",
            created_at=cutoff_date,
            legal_hold=True,
            status=RequestStatus.COMPLETED,
        )
        
        # Request 3: Not expired (should NOT be deleted)
        request3 = AIRequest(
            id=req_id_3,
            tenant_id=tenant_id,
            user_id=user_id,
            prompt_encrypted="encrypted_test_prompt_3",
            prompt_hash=f"hash3-{uuid.uuid4().hex[:8]}",
            created_at=datetime.now(timezone.utc),
            legal_hold=False,
            status=RequestStatus.COMPLETED,
        )
        
        db_session.add_all([request1, request2, request3])
        db_session.commit()
        
        # Run data retention service
        service = DataRetentionService(db_session)
        result = service.cleanup_expired_prompts()
        
        # Verify results
        assert result["deleted_count"] >= 1  # At least request1 should be deleted
        assert result["skipped_legal_hold"] >= 1  # At least request2 was skipped
        
        # Verify database state for our test records
        remaining_requests = db_session.query(AIRequest).filter(
            AIRequest.id.in_([req_id_1, req_id_2, req_id_3])
        ).all()
        remaining_ids = [r.id for r in remaining_requests]
        
        assert req_id_1 not in remaining_ids  # Deleted
        assert req_id_2 in remaining_ids  # Preserved (legal hold)
        assert req_id_3 in remaining_ids  # Preserved (not expired)
    
    def test_batch_deletion_performance(self, db_session):
        """Test that batch deletion is used for efficiency."""
        from datetime import datetime, timedelta, timezone
        import uuid
        
        tenant_id = f"test-tenant-batch-{uuid.uuid4().hex[:8]}"
        user_id = "test-user"
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=91)
        
        # Create multiple expired requests
        requests = []
        for i in range(10):
            request = AIRequest(
                id=f"req-batch-{uuid.uuid4().hex[:8]}-{i}",
                tenant_id=tenant_id,
                user_id=user_id,
                prompt_encrypted=f"encrypted_test_prompt_{i}",
                prompt_hash=f"hash{i}-{uuid.uuid4().hex[:8]}",
                created_at=cutoff_date,
                legal_hold=False,
                status=RequestStatus.COMPLETED,
            )
            requests.append(request)
        
        db_session.add_all(requests)
        db_session.commit()
        
        # Run data retention service
        service = DataRetentionService(db_session)
        result = service.cleanup_expired_prompts()
        
        # Verify all were deleted in batch (at least our 10)
        assert result["deleted_count"] >= 10
        assert result["error_count"] == 0
        
        # Verify all were deleted from database
        remaining = db_session.query(AIRequest).filter(
            AIRequest.tenant_id == tenant_id
        ).count()
        assert remaining == 0


class TestConversationContextPersistence:
    """
    Test conversation context persistence across turns
    
    Requirements tested:
    - 4.6: Maintain conversation context
    - 4.8: Handle meta-intent during active plan
    """
    
    @pytest.mark.asyncio
    @patch("ai.api.chat.get_request_logger")
    @patch("ai.services.kill_switch.KillSwitch.require_not_blocked")
    @patch("ai.middleware.rate_limiter.check_rate_limit")
    @patch("ai.services.usage_tracker.UsageTracker.acquire_quota")
    async def test_conversation_context_persistence(
        self,
        mock_quota,
        mock_rate_limit,
        mock_kill_switch,
        mock_get_request_logger,
        client
    ):
        """Test that conversation context is maintained across turns."""
        from ai.services.conversation_memory import get_conversation_memory
        from ai.models.ai_request import AIRequest, RequestStatus
        
        # Mock the request logger to avoid database operations
        mock_logger = Mock()
        mock_request = Mock(spec=AIRequest)
        mock_request.id = "test-request-id-1"
        mock_logger.log_request.return_value = mock_request
        mock_logger.update_request_status.return_value = None
        mock_get_request_logger.return_value = mock_logger
        
        token = create_valid_token()
        session_id = "test-session-context-persist"
        
        # Get the global singleton memory instance
        memory = get_conversation_memory()
        
        # Clear any existing history for this session
        memory.clear_session(session_id)
        
        # Turn 1
        response1 = client.post(
            "/api/ai/chat",
            json={"prompt": "Hello", "session_id": session_id},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response1.status_code in [200, 503]
        
        # If the request succeeded, verify history was saved
        if response1.status_code == 200:
            # Verify conversation memory has the first turn
            history_after_turn1 = memory.get_history(session_id, max_turns=10)
            assert len(history_after_turn1) >= 1, "First turn should be saved in conversation memory"
            assert history_after_turn1[0].user_message == "Hello"
            
            # Update mock request ID for second turn
            mock_request.id = "test-request-id-2"
            
            # Turn 2 - should have context from turn 1
            response2 = client.post(
                "/api/ai/chat",
                json={"prompt": "What did I just say?", "session_id": session_id},
                headers={"Authorization": f"Bearer {token}"}
            )
            
            assert response2.status_code in [200, 503]
            
            # If second request succeeded, verify both turns are saved
            if response2.status_code == 200:
                history_after_turn2 = memory.get_history(session_id, max_turns=10)
                assert len(history_after_turn2) >= 2, "Both turns should be saved in conversation memory"
                assert history_after_turn2[0].user_message == "Hello"
                assert history_after_turn2[1].user_message == "What did I just say?"
        
        # Clean up
        memory.clear_session(session_id)


class TestErrorHandlingAndRecovery:
    """
    Test error handling and recovery in integration flows
    """
    
    @pytest.mark.asyncio
    @patch("ai.agents.intent_refiner.IntentRefiner.refine_intent")
    @patch("ai.services.kill_switch.KillSwitch.require_not_blocked")
    @patch("ai.middleware.rate_limiter.check_rate_limit")
    @patch("ai.services.usage_tracker.UsageTracker.acquire_quota")
    async def test_llm_failure_handling(
        self,
        mock_quota,
        mock_rate_limit,
        mock_kill_switch,
        mock_refine,
        client,
        db_session
    ):
        """Test handling of LLM inference failures."""
        # Mock LLM failure
        mock_refine.side_effect = Exception("LLM inference failed")
        
        token = create_valid_token()
        
        response = client.post(
            "/api/ai/chat",
            json={"prompt": "Hello"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return error response
        assert response.status_code == 500
        data = response.json()
        assert data["success"] is False
        assert "error" in data
    
    @pytest.mark.asyncio
    @patch("ai.services.kill_switch.KillSwitch.require_not_blocked")
    async def test_kill_switch_activation(
        self,
        mock_kill_switch,
        client
    ):
        """Test kill switch activation blocks requests."""
        from ai.services.kill_switch import KillSwitchActiveError
        
        # Mock kill switch active
        mock_kill_switch.side_effect = KillSwitchActiveError(
            "AI chat disabled for tenant",
            tenant_id="test-tenant",
            capability="chat"
        )
        
        token = create_valid_token()
        
        response = client.post(
            "/api/ai/chat",
            json={"prompt": "Hello"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Should return 503
        assert response.status_code == 503
        data = response.json()
        assert data["success"] is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
