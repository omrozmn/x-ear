"""
Conversation Memory Service

Stores conversation history for multi-turn dialogs.
In production, this should use Redis or a database.
"""

import time
import json
import logging
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from collections import defaultdict
from abc import ABC, abstractmethod

from ai.config import get_ai_config

logger = logging.getLogger(__name__)


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


class ConversationMemory(ABC):
    """
    Base interface for conversation history storage.
    """
    
    @abstractmethod
    def add_turn(
        self,
        session_id: str,
        user_message: str,
        ai_response: str,
        intent_type: Optional[str] = None,
        entities: Optional[Dict] = None,
    ) -> None:
        pass
    
    @abstractmethod
    def get_history(
        self,
        session_id: str,
        max_turns: Optional[int] = None,
    ) -> List[ConversationTurn]:
        pass
    
    @abstractmethod
    def clear_session(self, session_id: str) -> None:
        pass

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


class MemoryConversationMemory(ConversationMemory):
    """
    In-memory conversation history storage.
    
    Stores recent conversation turns for context-aware responses.
    """
    
    def __init__(self, max_turns: int = 10, ttl_seconds: int = 3600):
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
        self._cleanup_expired()
        
        turn = ConversationTurn(
            user_message=user_message,
            ai_response=ai_response,
            intent_type=intent_type,
            entities=entities or {},
        )
        
        self._sessions[session_id].append(turn)
        self._last_access[session_id] = time.time()
        
        if len(self._sessions[session_id]) > self.max_turns:
            self._sessions[session_id] = self._sessions[session_id][-self.max_turns:]
    
    def get_history(
        self,
        session_id: str,
        max_turns: Optional[int] = None,
    ) -> List[ConversationTurn]:
        self._cleanup_expired()
        
        if session_id not in self._sessions:
            return []
        
        self._last_access[session_id] = time.time()
        history = self._sessions[session_id]
        
        if max_turns:
            return history[-max_turns:]
        return history
    
    def clear_session(self, session_id: str) -> None:
        if session_id in self._sessions:
            del self._sessions[session_id]
        if session_id in self._last_access:
            del self._last_access[session_id]
    
    def _cleanup_expired(self) -> None:
        current_time = time.time()
        expired = [sid for sid, last in self._last_access.items() if current_time - last > self.ttl_seconds]
        for session_id in expired:
            self.clear_session(session_id)


class RedisConversationMemory(ConversationMemory):
    """
    Redis-based conversation history storage (BUG-005).
    """
    def __init__(self, redis_url: str, max_turns: int = 10, ttl_seconds: int = 3600):
        self.redis_url = redis_url
        self.max_turns = max_turns
        self.ttl_seconds = ttl_seconds
        try:
            import redis
            self.client = redis.from_url(redis_url, decode_responses=True)
        except ImportError:
            logger.error("redis package not found. RedisConversationMemory will fail.")
            self.client = None

    def _get_key(self, session_id: str) -> str:
        return f"ai:session:{session_id}"

    def add_turn(self, session_id: str, **kwargs) -> None:
        if not self.client: return
        key = self._get_key(session_id)
        # Simplified Turn storage as JSON list
        turn_data = {
            **kwargs,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        self.client.rpush(key, json.dumps(turn_data))
        self.client.ltrim(key, -self.max_turns, -1)
        self.client.expire(key, self.ttl_seconds)

    def get_history(self, session_id: str, max_turns: Optional[int] = None) -> List[ConversationTurn]:
        if not self.client: return []
        key = self._get_key(session_id)
        items = self.client.lrange(key, 0, -1)
        # Parse items back to ConversationTurn
        turns = []
        for item in items:
            try:
                data = json.loads(item)
                # Map JSON to Turn
                turns.append(ConversationTurn(
                    user_message=data.get("user_message", ""),
                    ai_response=data.get("ai_response", ""),
                    intent_type=data.get("intent_type"),
                    entities=data.get("entities", {}),
                    timestamp=datetime.fromisoformat(data["timestamp"]) if "timestamp" in data else datetime.now(timezone.utc)
                ))
            except Exception:
                continue
        return turns[-max_turns:] if max_turns else turns

    def clear_session(self, session_id: str) -> None:
        if not self.client: return
        self.client.delete(self._get_key(session_id))


# Global instance
_memory: Optional[ConversationMemory] = None


def get_conversation_memory() -> ConversationMemory:
    """Get the appropriate conversation memory instance based on config."""
    global _memory
    if _memory is None:
        config = get_ai_config()
        if config.memory_backend == "redis":
            logger.info(f"Using Redis conversation memory at {config.redis_url}")
            _memory = RedisConversationMemory(config.redis_url)
        else:
            logger.info("Using in-memory conversation storage")
            _memory = MemoryConversationMemory()
    return _memory
