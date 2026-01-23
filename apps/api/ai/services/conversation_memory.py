"""
Conversation Memory Service

Stores conversation history for multi-turn dialogs.
In production, this should use Redis or a database.
"""

import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional
from collections import defaultdict


@dataclass
class ConversationTurn:
    """A single turn in a conversation."""
    user_message: str
    ai_response: str
    intent_type: Optional[str] = None
    entities: Dict = field(default_factory=dict)
    timestamp: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    
    def to_dict(self) -> dict:
        return {
            "userMessage": self.user_message,
            "aiResponse": self.ai_response,
            "intentType": self.intent_type,
            "entities": self.entities,
            "timestamp": self.timestamp.isoformat(),
        }


class ConversationMemory:
    """
    In-memory conversation history storage.
    
    Stores recent conversation turns for context-aware responses.
    """
    
    def __init__(self, max_turns: int = 10, ttl_seconds: int = 3600):
        """
        Initialize conversation memory.
        
        Args:
            max_turns: Maximum number of turns to keep per session
            ttl_seconds: Time-to-live for sessions in seconds
        """
        self.max_turns = max_turns
        self.ttl_seconds = ttl_seconds
        self._sessions: Dict[str, List[ConversationTurn]] = defaultdict(list)
        self._last_access: Dict[str, float] = {}
    
    def add_turn(
        self,
        session_id: str,
        user_message: str,
        ai_response: str,
        intent_type: Optional[str] = None,
        entities: Optional[Dict] = None,
    ) -> None:
        """Add a conversation turn to the session."""
        self._cleanup_expired()
        
        turn = ConversationTurn(
            user_message=user_message,
            ai_response=ai_response,
            intent_type=intent_type,
            entities=entities or {},
        )
        
        self._sessions[session_id].append(turn)
        self._last_access[session_id] = time.time()
        
        # Keep only last N turns
        if len(self._sessions[session_id]) > self.max_turns:
            self._sessions[session_id] = self._sessions[session_id][-self.max_turns:]
    
    def get_history(
        self,
        session_id: str,
        max_turns: Optional[int] = None,
    ) -> List[ConversationTurn]:
        """Get conversation history for a session."""
        self._cleanup_expired()
        
        if session_id not in self._sessions:
            return []
        
        self._last_access[session_id] = time.time()
        history = self._sessions[session_id]
        
        if max_turns:
            return history[-max_turns:]
        return history
    
    def get_context_summary(self, session_id: str) -> str:
        """Get a text summary of recent conversation for LLM context."""
        history = self.get_history(session_id, max_turns=3)
        
        if not history:
            return "No previous conversation."
        
        lines = []
        for turn in history:
            lines.append(f"User: {turn.user_message}")
            lines.append(f"AI: {turn.ai_response}")
        
        return "\n".join(lines)
    
    def get_accumulated_entities(self, session_id: str) -> Dict:
        """Get all entities mentioned in the conversation."""
        history = self.get_history(session_id)
        
        accumulated = {}
        for turn in history:
            accumulated.update(turn.entities)
        
        return accumulated
    
    def clear_session(self, session_id: str) -> None:
        """Clear a session's history."""
        if session_id in self._sessions:
            del self._sessions[session_id]
        if session_id in self._last_access:
            del self._last_access[session_id]
    
    def _cleanup_expired(self) -> None:
        """Remove expired sessions."""
        current_time = time.time()
        expired = []
        
        for session_id, last_access in self._last_access.items():
            if current_time - last_access > self.ttl_seconds:
                expired.append(session_id)
        
        for session_id in expired:
            self.clear_session(session_id)


# Global instance
_memory: Optional[ConversationMemory] = None


def get_conversation_memory() -> ConversationMemory:
    """Get the global conversation memory instance."""
    global _memory
    if _memory is None:
        _memory = ConversationMemory()
    return _memory
