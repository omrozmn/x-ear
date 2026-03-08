import asyncio
import logging
import os
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable

import httpx

logger = logging.getLogger(__name__)

class ModelStatus(str, Enum):
    """Status of the model connection."""
    AVAILABLE = "available"
    UNAVAILABLE = "unavailable"
    DEGRADED = "degraded"
    UNKNOWN = "unknown"

@dataclass
class ModelConfig:
    """Configuration for local or remote model."""
    model_name: str = "qwen2.5:7b-instruct"
    base_url: str = "http://localhost:11434"
    timeout_seconds: float = 60.0
    max_tokens: int = 2048
    temperature: float = 0.7
    top_p: float = 0.9
    api_key: Optional[str] = None
    provider: str = "local"
    
    @classmethod
    def from_env(cls) -> "ModelConfig":
        """Load configuration from environment variables."""
        return cls(
            model_name=os.getenv("AI_MODEL_NAME", "qwen2.5:7b-instruct"),
            base_url=os.getenv("AI_OLLAMA_URL", "http://localhost:11434"),
            timeout_seconds=float(os.getenv("AI_MODEL_TIMEOUT", "60")),
            max_tokens=int(os.getenv("AI_MAX_TOKENS", "2048")),
            temperature=float(os.getenv("AI_TEMPERATURE", "0.7")),
            top_p=float(os.getenv("AI_TOP_P", "0.9")),
            api_key=os.getenv("GROQ_API_KEY") or os.getenv("OPENAI_API_KEY"),
        )

@dataclass
class ModelResponse:
    """Response from the model."""
    content: str
    model: str
    created_at: datetime
    total_duration_ms: float
    prompt_eval_count: int = 0
    eval_count: int = 0
    done: bool = True
    error: Optional[str] = None
    
    @property
    def is_success(self) -> bool:
        return self.error is None and self.done
    
    def to_dict(self) -> dict:
        return {
            "content": self.content,
            "model": self.model,
            "createdAt": self.created_at.isoformat(),
            "totalDurationMs": self.total_duration_ms,
            "promptEvalCount": self.prompt_eval_count,
            "evalCount": self.eval_count,
            "done": self.done,
            "error": self.error,
        }

class ModelConnectionError(Exception):
    """Raised when connection to model fails."""
    def __init__(self, message: str, original_error: Optional[Exception] = None):
        self.original_error = original_error
        super().__init__(message)

class ModelTimeoutError(Exception):
    """Raised when model request times out."""
    def __init__(self, timeout_seconds: float):
        self.timeout_seconds = timeout_seconds
        super().__init__(f"Model request timed out after {timeout_seconds}s")

class ModelUnavailableError(Exception):
    """Raised when model is unavailable."""
    pass

@runtime_checkable
class ModelClient(Protocol):
    """Protocol for model clients."""
    @property
    def status(self) -> ModelStatus: ...
    @property
    def is_available(self) -> bool: ...
    async def check_health(self) -> bool: ...
    async def generate(self, prompt: str, **kwargs) -> ModelResponse: ...
    async def generate_chat(self, messages: List[Dict[str, str]], **kwargs) -> ModelResponse: ...
    def reset_failures(self) -> None: ...

class LocalModelClient(ModelClient):
    """
    Client for interacting with local Ollama model or remote APIs.
    """
    def __init__(self, config: Optional[ModelConfig] = None):
        self.config = config or ModelConfig.from_env()
        self._status = ModelStatus.UNKNOWN
        self._last_health_check: Optional[datetime] = None
        self._consecutive_failures = 0
        self._max_consecutive_failures = 3
    
    @property
    def status(self) -> ModelStatus:
        return self._status
    
    @property
    def is_available(self) -> bool:
        return self._status == ModelStatus.AVAILABLE
    
    async def check_health(self) -> bool:
        try:
            # Special bypass for known reliable cloud APIs during health check
            if self.config.base_url and ("generativelanguage" in self.config.base_url or "api.groq.com" in self.config.base_url or "api.minimax" in self.config.base_url):
                self._status = ModelStatus.AVAILABLE
                return True

            async with httpx.AsyncClient(timeout=5.0) as client:
                health_url = f"{self.config.base_url}/api/tags"
                if self.config.base_url and "/v1" in self.config.base_url:
                    health_url = f"{self.config.base_url}/models"
                
                response = await client.get(health_url)
                if response.status_code == 200:
                    self._status = ModelStatus.AVAILABLE
                    return True
                return False
        except Exception:
            self._status = ModelStatus.UNAVAILABLE
            return False
        return False
    
    async def generate(self, prompt: str, **kwargs) -> ModelResponse:
        start_time = time.time()
        is_gemini = "generativelanguage.googleapis.com" in self.config.base_url
        is_openai = "/v1" in self.config.base_url or "api.groq.com" in self.config.base_url
        is_anthropic = "anthropic" in self.config.base_url
        
        endpoint = f"{self.config.base_url}/api/generate"
        headers = {}
        if self.config.api_key:
            if is_gemini:
                endpoint = f"{self.config.base_url}/models/{self.config.model_name}:generateContent?key={self.config.api_key}"
            elif is_anthropic:
                headers["x-api-key"] = self.config.api_key
                headers["anthropic-version"] = "2023-06-01"
                endpoint = f"{self.config.base_url.rstrip('/')}/v1/messages"
            else:
                headers["Authorization"] = f"Bearer {self.config.api_key}"
                if is_openai:
                    endpoint = f"{self.config.base_url.rstrip('/')}/chat/completions"

        payload = {
            "model": self.config.model_name,
            "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
            "temperature": kwargs.get("temperature", self.config.temperature),
        }

        if is_gemini:
            payload = {
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {"maxOutputTokens": payload["max_tokens"], "temperature": payload["temperature"]}
            }
        elif is_openai or is_anthropic:
            payload["messages"] = [{"role": "user", "content": prompt}]
        else:
            payload["prompt"] = prompt
            payload["stream"] = False

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                content = ""
                if is_gemini:
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                elif is_anthropic:
                    # Anthropic format: data["content"] is a list
                    content_parts = data.get("content", [])
                    content = "".join([part.get("text", "") for part in content_parts if part.get("type") == "text"])
                elif is_openai:
                    content = data["choices"][0]["message"]["content"]
                else:
                    content = data.get("response", "")

                return ModelResponse(
                    content=content,
                    model=self.config.model_name,
                    created_at=datetime.now(timezone.utc),
                    total_duration_ms=(time.time() - start_time) * 1000
                )
        except Exception as e:
            logger.error(f"Generate failed: {e}")
            raise ModelConnectionError(str(e))
        
        # This part should be unreachable if logic is correct, but satisfies linting
        raise ModelConnectionError("Generate failed: unknown error")

    async def generate_chat(self, messages: List[Dict[str, str]], **kwargs) -> ModelResponse:
        # For simplicity and to match the prompt/chat pattern, we can route generate_chat to similar logic
        # but optimized for messages.
        start_time = time.time()
        is_gemini = "generativelanguage.googleapis.com" in self.config.base_url
        is_openai = "/v1" in self.config.base_url or "api.groq.com" in self.config.base_url
        is_anthropic = "anthropic" in self.config.base_url
        
        endpoint = f"{self.config.base_url}/api/chat"
        headers = {}
        if self.config.api_key:
            if is_gemini:
                endpoint = f"{self.config.base_url}/models/{self.config.model_name}:generateContent?key={self.config.api_key}"
            elif is_anthropic:
                headers["x-api-key"] = self.config.api_key
                headers["anthropic-version"] = "2023-06-01"
                endpoint = f"{self.config.base_url.rstrip('/')}/v1/messages"
            else:
                headers["Authorization"] = f"Bearer {self.config.api_key}"
                if is_openai:
                    endpoint = f"{self.config.base_url.rstrip('/')}/chat/completions"

        if is_gemini:
            gemini_messages = []
            for m in messages:
                role = "user" if m["role"] == "user" else "model"
                gemini_messages.append({"role": role, "parts": [{"text": m["content"]}]})
            payload = {
                "contents": gemini_messages,
                "generationConfig": {
                    "maxOutputTokens": kwargs.get("max_tokens", self.config.max_tokens),
                    "temperature": kwargs.get("temperature", self.config.temperature)
                }
            }
        else:
            payload = {
                "model": self.config.model_name,
                "messages": messages,
                "stream": False,
                "max_tokens": kwargs.get("max_tokens", self.config.max_tokens),
                "temperature": kwargs.get("temperature", self.config.temperature),
            }

        try:
            async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                
                content = ""
                if is_gemini:
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                elif is_anthropic:
                    content_parts = data.get("content", [])
                    content = "".join([part.get("text", "") for part in content_parts if part.get("type") == "text"])
                elif is_openai:
                    content = data["choices"][0]["message"]["content"]
                elif "message" in data:
                    content = data["message"].get("content", "")
                else:
                    content = data.get("response", "")

                return ModelResponse(
                    content=content,
                    model=self.config.model_name,
                    created_at=datetime.now(timezone.utc),
                    total_duration_ms=(time.time() - start_time) * 1000
                )
        except Exception as e:
            logger.error(f"Chat failed: {e}")
            raise ModelConnectionError(str(e))

        # This part should be unreachable if logic is correct, but satisfies linting
        raise ModelConnectionError("Chat failed: unknown error")

    def reset_failures(self) -> None:
        self._consecutive_failures = 0
        self._status = ModelStatus.UNKNOWN

class FallbackModelClient(ModelClient):
    """Wrapper that falls back to a second client if the first one fails."""
    def __init__(self, primary: ModelClient, secondary: ModelClient):
        self.primary = primary
        self.secondary = secondary

    @property
    def status(self) -> ModelStatus:
        return self.primary.status if self.primary.is_available else self.secondary.status

    @property
    def is_available(self) -> bool:
        return self.primary.is_available or self.secondary.is_available

    async def check_health(self) -> bool:
        return await self.primary.check_health() or await self.secondary.check_health()

    async def generate(self, prompt: str, **kwargs) -> ModelResponse:
        try:
            return await self.primary.generate(prompt, **kwargs)
        except Exception as e:
            logger.warning(f"Primary failed, falling back: {e}")
            return await self.secondary.generate(prompt, **kwargs)

    async def generate_chat(self, messages: List[Dict[str, str]], **kwargs) -> ModelResponse:
        try:
            return await self.primary.generate_chat(messages, **kwargs)
        except Exception as e:
            logger.warning(f"Primary failed, falling back: {e}")
            return await self.secondary.generate_chat(messages, **kwargs)

    def reset_failures(self) -> None:
        self.primary.reset_failures()
        self.secondary.reset_failures()

class SyncModelClient:
    def __init__(self, config: Optional[ModelConfig] = None):
        self._async_client = LocalModelClient(config)

    def generate(self, prompt: str, **kwargs) -> ModelResponse:
        return asyncio.run(self._async_client.generate(prompt, **kwargs))

    def generate_chat(self, messages: List[Dict[str, str]], **kwargs) -> ModelResponse:
        return asyncio.run(self._async_client.generate_chat(messages, **kwargs))

_smart_client: Optional[ModelClient] = None
_fast_client: Optional[ModelClient] = None

def get_model_client() -> ModelClient:
    global _smart_client
    if _smart_client is None:
        from ai.config import get_ai_config
        config = get_ai_config().model
        
        primary_config = ModelConfig(
            model_name=config.ai_model_id,
            base_url=config.base_url,
            api_key=os.getenv("GROQ_API_KEY")
        )
        primary = LocalModelClient(primary_config)
        
        gemini_key = os.getenv("GEMINI_API_KEY")
        minimax_key = os.getenv("MINIMAX_API_KEY")

        if minimax_key:
            secondary_config = ModelConfig(
                model_name="minimax/abab6.5s-chat",
                base_url="https://api.minimax.io/anthropic",
                api_key=minimax_key
            )
            secondary = LocalModelClient(secondary_config)
            _smart_client = FallbackModelClient(primary, secondary)
        elif gemini_key:
            secondary_config = ModelConfig(
                model_name="gemini-2.0-flash",
                base_url="https://generativelanguage.googleapis.com/v1beta",
                api_key=gemini_key
            )
            secondary = LocalModelClient(secondary_config)
            _smart_client = FallbackModelClient(primary, secondary)
        else:
            _smart_client = primary
            
    return _smart_client

def get_fast_model_client() -> ModelClient:
    global _fast_client
    if _fast_client is None:
        from ai.config import get_ai_config
        config = get_ai_config().fast_model
        
        primary_config = ModelConfig(
            model_name=config.ai_model_id,
            base_url=config.base_url,
            api_key=os.getenv("GROQ_API_KEY")
        )
        primary = LocalModelClient(primary_config)
        
        minimax_key = os.getenv("MINIMAX_API_KEY")
        if minimax_key:
            secondary_config = ModelConfig(
                model_name="minimax/abab6.5s-chat",
                base_url="https://api.minimax.io/anthropic",
                api_key=minimax_key
            )
            secondary = LocalModelClient(secondary_config)
            _fast_client = FallbackModelClient(primary, secondary)
        else:
            _fast_client = primary
            
    return _fast_client

async def route_model(request: Any) -> ModelClient:
    target_client = get_fast_model_client()
    
    # Simple selection logic
    is_smart = False
    if hasattr(request, 'preference') and request.preference in ('smart', 'high'):
        is_smart = True
    elif isinstance(request, dict) and request.get('preference') in ('smart', 'high'):
        is_smart = True
    
    if is_smart:
        target_client = get_model_client()
        
    return target_client
