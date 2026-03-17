"""
Inter-service event bus for HBYS microservices.
Uses Redis PubSub for communication between services.
"""
import os
import json
import asyncio
import logging
from typing import Callable, Any
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("HBYS_REDIS_URL", "redis://localhost:6379/1")


class EventBus:
    """Simple Redis-based event bus for inter-service communication."""

    def __init__(self):
        self._redis = None
        self._handlers: dict[str, list[Callable]] = {}

    async def connect(self):
        try:
            import redis.asyncio as aioredis
            self._redis = aioredis.from_url(REDIS_URL)
            logger.info("EventBus connected to Redis")
        except Exception as e:
            logger.warning(f"EventBus Redis not available: {e}. Running in local-only mode.")
            self._redis = None

    async def publish(self, event_type: str, data: dict[str, Any], source_service: str = ""):
        """Publish an event to all subscribers."""
        message = {
            "event_type": event_type,
            "data": data,
            "source": source_service,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        # Call local handlers
        for handler in self._handlers.get(event_type, []):
            try:
                await handler(message)
            except Exception as e:
                logger.error(f"Event handler error: {e}")

        # Publish to Redis if available
        if self._redis:
            try:
                await self._redis.publish(
                    f"hbys:{event_type}",
                    json.dumps(message, default=str),
                )
            except Exception as e:
                logger.warning(f"Redis publish failed: {e}")

    def subscribe(self, event_type: str, handler: Callable):
        """Register a local handler for an event type."""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def listen(self, event_types: list[str]):
        """Listen for events from Redis (run in background task)."""
        if not self._redis:
            return

        pubsub = self._redis.pubsub()
        channels = [f"hbys:{et}" for et in event_types]
        await pubsub.subscribe(*channels)

        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    event_type = data.get("event_type", "")
                    for handler in self._handlers.get(event_type, []):
                        await handler(data)
                except Exception as e:
                    logger.error(f"Event listener error: {e}")


# Singleton
event_bus = EventBus()
