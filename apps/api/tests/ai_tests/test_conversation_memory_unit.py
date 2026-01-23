"""
Unit Tests for ConversationMemory Service

Tests the conversation memory service for:
- Adding conversation turns
- Retrieving conversation history
- Session management and cleanup
- TTL expiration
- Context summary generation
- Entity accumulation

Requirements tested:
- 4.6: Maintain conversation context across turns
"""

import pytest
import time
from datetime import datetime, timezone

from ai.services.conversation_memory import (
    ConversationMemory,
    ConversationTurn,
    get_conversation_memory,
)


class TestConversationMemoryBasics:
    """Test basic conversation memory operations."""
    
    def test_add_and_retrieve_turn(self):
        """Test adding a turn and retrieving it."""
        memory = ConversationMemory()
        session_id = "test-session-1"
        
        # Add a turn
        memory.add_turn(
            session_id=session_id,
            user_message="Hello",
            ai_response="Hi there!",
            intent_type="greeting",
            entities={"sentiment": "positive"},
        )
        
        # Retrieve history
        history = memory.get_history(session_id)
        
        assert len(history) == 1
        assert history[0].user_message == "Hello"
        assert history[0].ai_response == "Hi there!"
        assert history[0].intent_type == "greeting"
        assert history[0].entities == {"sentiment": "positive"}
    
    def test_multiple_turns(self):
        """Test adding multiple turns."""
        memory = ConversationMemory()
        session_id = "test-session-2"
        
        # Add multiple turns
        memory.add_turn(session_id, "Hello", "Hi!")
        memory.add_turn(session_id, "How are you?", "I'm doing well!")
        memory.add_turn(session_id, "Great!", "Glad to hear it!")
        
        # Retrieve history
        history = memory.get_history(session_id)
        
        assert len(history) == 3
        assert history[0].user_message == "Hello"
        assert history[1].user_message == "How are you?"
        assert history[2].user_message == "Great!"
    
    def test_max_turns_limit(self):
        """Test that only max_turns are kept."""
        memory = ConversationMemory(max_turns=3)
        session_id = "test-session-3"
        
        # Add more turns than the limit
        for i in range(5):
            memory.add_turn(
                session_id,
                f"Message {i}",
                f"Response {i}"
            )
        
        # Should only keep last 3 turns
        history = memory.get_history(session_id)
        
        assert len(history) == 3
        assert history[0].user_message == "Message 2"
        assert history[1].user_message == "Message 3"
        assert history[2].user_message == "Message 4"
    
    def test_get_history_with_max_turns_parameter(self):
        """Test retrieving limited history."""
        memory = ConversationMemory()
        session_id = "test-session-4"
        
        # Add 5 turns
        for i in range(5):
            memory.add_turn(session_id, f"Message {i}", f"Response {i}")
        
        # Get only last 2 turns
        history = memory.get_history(session_id, max_turns=2)
        
        assert len(history) == 2
        assert history[0].user_message == "Message 3"
        assert history[1].user_message == "Message 4"
    
    def test_empty_session(self):
        """Test retrieving history for non-existent session."""
        memory = ConversationMemory()
        
        history = memory.get_history("non-existent-session")
        
        assert len(history) == 0
        assert history == []


class TestConversationMemorySessionManagement:
    """Test session management and cleanup."""
    
    def test_clear_session(self):
        """Test clearing a session."""
        memory = ConversationMemory()
        session_id = "test-session-5"
        
        # Add turns
        memory.add_turn(session_id, "Hello", "Hi!")
        memory.add_turn(session_id, "How are you?", "Good!")
        
        # Verify turns exist
        assert len(memory.get_history(session_id)) == 2
        
        # Clear session
        memory.clear_session(session_id)
        
        # Verify session is empty
        assert len(memory.get_history(session_id)) == 0
    
    def test_ttl_expiration(self):
        """Test that sessions expire after TTL."""
        memory = ConversationMemory(ttl_seconds=1)  # 1 second TTL
        session_id = "test-session-6"
        
        # Add a turn
        memory.add_turn(session_id, "Hello", "Hi!")
        
        # Verify turn exists
        assert len(memory.get_history(session_id)) == 1
        
        # Wait for TTL to expire
        time.sleep(1.1)
        
        # Access should trigger cleanup
        history = memory.get_history(session_id)
        
        # Session should be expired and cleaned up
        assert len(history) == 0
    
    def test_access_updates_ttl(self):
        """Test that accessing a session updates its TTL."""
        memory = ConversationMemory(ttl_seconds=2)
        session_id = "test-session-7"
        
        # Add a turn
        memory.add_turn(session_id, "Hello", "Hi!")
        
        # Wait 1 second
        time.sleep(1)
        
        # Access the session (should update TTL)
        history = memory.get_history(session_id)
        assert len(history) == 1
        
        # Wait another 1 second (total 2 seconds from initial add)
        time.sleep(1)
        
        # Session should still exist because we accessed it at 1 second
        history = memory.get_history(session_id)
        assert len(history) == 1
    
    def test_multiple_sessions_isolated(self):
        """Test that sessions are isolated from each other."""
        memory = ConversationMemory()
        
        # Add turns to different sessions
        memory.add_turn("session-a", "Hello A", "Hi A!")
        memory.add_turn("session-b", "Hello B", "Hi B!")
        memory.add_turn("session-a", "How are you A?", "Good A!")
        
        # Verify sessions are isolated
        history_a = memory.get_history("session-a")
        history_b = memory.get_history("session-b")
        
        assert len(history_a) == 2
        assert len(history_b) == 1
        assert history_a[0].user_message == "Hello A"
        assert history_b[0].user_message == "Hello B"


class TestConversationMemoryContextGeneration:
    """Test context summary and entity accumulation."""
    
    def test_get_context_summary(self):
        """Test generating a text summary of conversation."""
        memory = ConversationMemory()
        session_id = "test-session-8"
        
        # Add turns
        memory.add_turn(session_id, "Hello", "Hi there!")
        memory.add_turn(session_id, "How are you?", "I'm doing well!")
        
        # Get context summary
        summary = memory.get_context_summary(session_id)
        
        assert "User: Hello" in summary
        assert "AI: Hi there!" in summary
        assert "User: How are you?" in summary
        assert "AI: I'm doing well!" in summary
    
    def test_get_context_summary_empty_session(self):
        """Test context summary for empty session."""
        memory = ConversationMemory()
        
        summary = memory.get_context_summary("non-existent")
        
        assert summary == "No previous conversation."
    
    def test_get_context_summary_limits_turns(self):
        """Test that context summary only includes recent turns."""
        memory = ConversationMemory()
        session_id = "test-session-9"
        
        # Add 5 turns
        for i in range(5):
            memory.add_turn(session_id, f"Message {i}", f"Response {i}")
        
        # Get context summary (should only include last 3 turns)
        summary = memory.get_context_summary(session_id)
        
        # Should NOT include first 2 turns
        assert "Message 0" not in summary
        assert "Message 1" not in summary
        
        # Should include last 3 turns
        assert "Message 2" in summary
        assert "Message 3" in summary
        assert "Message 4" in summary
    
    def test_get_accumulated_entities(self):
        """Test accumulating entities across turns."""
        memory = ConversationMemory()
        session_id = "test-session-10"
        
        # Add turns with different entities
        memory.add_turn(
            session_id,
            "Create a patient named John",
            "OK",
            entities={"patient_name": "John"}
        )
        memory.add_turn(
            session_id,
            "Age is 30",
            "Got it",
            entities={"patient_age": 30}
        )
        memory.add_turn(
            session_id,
            "Phone is 555-1234",
            "Noted",
            entities={"patient_phone": "555-1234"}
        )
        
        # Get accumulated entities
        entities = memory.get_accumulated_entities(session_id)
        
        assert entities["patient_name"] == "John"
        assert entities["patient_age"] == 30
        assert entities["patient_phone"] == "555-1234"
    
    def test_accumulated_entities_override(self):
        """Test that later entities override earlier ones."""
        memory = ConversationMemory()
        session_id = "test-session-11"
        
        # Add turns with overlapping entities
        memory.add_turn(
            session_id,
            "Name is John",
            "OK",
            entities={"name": "John"}
        )
        memory.add_turn(
            session_id,
            "Actually, name is Jane",
            "Updated",
            entities={"name": "Jane"}
        )
        
        # Get accumulated entities
        entities = memory.get_accumulated_entities(session_id)
        
        # Later value should override
        assert entities["name"] == "Jane"


class TestConversationTurn:
    """Test ConversationTurn dataclass."""
    
    def test_turn_creation(self):
        """Test creating a conversation turn."""
        turn = ConversationTurn(
            user_message="Hello",
            ai_response="Hi!",
            intent_type="greeting",
            entities={"sentiment": "positive"}
        )
        
        assert turn.user_message == "Hello"
        assert turn.ai_response == "Hi!"
        assert turn.intent_type == "greeting"
        assert turn.entities == {"sentiment": "positive"}
        assert isinstance(turn.timestamp, datetime)
    
    def test_turn_to_dict(self):
        """Test converting turn to dictionary."""
        turn = ConversationTurn(
            user_message="Hello",
            ai_response="Hi!",
            intent_type="greeting",
            entities={"sentiment": "positive"}
        )
        
        turn_dict = turn.to_dict()
        
        assert turn_dict["userMessage"] == "Hello"
        assert turn_dict["aiResponse"] == "Hi!"
        assert turn_dict["intentType"] == "greeting"
        assert turn_dict["entities"] == {"sentiment": "positive"}
        assert "timestamp" in turn_dict
        assert isinstance(turn_dict["timestamp"], str)  # ISO format
    
    def test_turn_default_values(self):
        """Test turn with default values."""
        turn = ConversationTurn(
            user_message="Hello",
            ai_response="Hi!"
        )
        
        assert turn.intent_type is None
        assert turn.entities == {}
        assert isinstance(turn.timestamp, datetime)


class TestGlobalSingleton:
    """Test global singleton instance."""
    
    def test_get_conversation_memory_returns_singleton(self):
        """Test that get_conversation_memory returns the same instance."""
        memory1 = get_conversation_memory()
        memory2 = get_conversation_memory()
        
        # Should be the same instance
        assert memory1 is memory2
    
    def test_singleton_persists_data(self):
        """Test that data persists across get_conversation_memory calls."""
        # Get memory and add data
        memory1 = get_conversation_memory()
        session_id = "test-singleton-session"
        memory1.add_turn(session_id, "Hello", "Hi!")
        
        # Get memory again and verify data persists
        memory2 = get_conversation_memory()
        history = memory2.get_history(session_id)
        
        assert len(history) == 1
        assert history[0].user_message == "Hello"
        
        # Clean up for other tests
        memory2.clear_session(session_id)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
