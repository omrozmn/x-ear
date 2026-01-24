"""
Local Model Client for AI Layer

Provides client for Ollama HTTP API to interact with local LLM.
Uses Qwen 2.5 7B Instruct model.

Requirements:
- 24.1: Use local model (Qwen 2.5 7B via Ollama)
- 24.2: Connection error handling with graceful degradation
- 24.3: Timeout handling
- 24.11: Graceful degradation when model unreachable
"""

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, AsyncIterator, Dict, List, Optional
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
    """Configuration for local model."""
    model_name: str = "qwen2.5:7b-instruct"
    base_url: str = "http://localhost:11434"
    timeout_seconds: float = 60.0
    max_tokens: int = 2048
    temperature: float = 0.7
    top_p: float = 0.9
    
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


class LocalModelClient:
    """
    Client for interacting with local Ollama model.
    
    Provides methods for:
    - Generating completions
    - Checking model status
    - Graceful degradation on errors
    """
    
    def __init__(self, config: Optional[ModelConfig] = None):
        """
        Initialize the client.
        
        Args:
            config: Model configuration. If None, loads from environment.
        """
        self.config = config or ModelConfig.from_env()
        self._status = ModelStatus.UNKNOWN
        self._last_health_check: Optional[datetime] = None
        self._consecutive_failures = 0
        self._max_consecutive_failures = 3
    
    @property
    def status(self) -> ModelStatus:
        """Get current model status."""
        return self._status
    
    @property
    def is_available(self) -> bool:
        """Check if model is available."""
        return self._status == ModelStatus.AVAILABLE
    
    async def check_health(self) -> bool:
        """
        Check if the model is healthy and available.
        
        Returns:
            True if model is available, False otherwise
        """
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(f"{self.config.base_url}/api/tags")
                
                if response.status_code == 200:
                    data = response.json()
                    models = data.get("models", [])
                    
                    # Check if our model is available
                    model_names = [m.get("name", "") for m in models]
                    if any(self.config.model_name in name for name in model_names):
                        self._status = ModelStatus.AVAILABLE
                        self._consecutive_failures = 0
                        self._last_health_check = datetime.now(timezone.utc)
                        return True
                    else:
                        logger.warning(f"Model {self.config.model_name} not found in Ollama")
                        self._status = ModelStatus.DEGRADED
                        return False
                else:
                    self._status = ModelStatus.UNAVAILABLE
                    return False
                    
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            self._status = ModelStatus.UNAVAILABLE
            self._consecutive_failures += 1
            return False
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stop_sequences: Optional[List[str]] = None,
        timeout_override: Optional[float] = None,
        num_predict: Optional[int] = None,
        **kwargs
    ) -> ModelResponse:
        """
        Generate a completion from the model.
        
        Args:
            prompt: The user prompt
            system_prompt: Optional system prompt
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            stop_sequences: Sequences to stop generation
            timeout_override: Override default timeout (seconds)
            num_predict: Hard limit on tokens (overrides max_tokens)
            
        Returns:
            ModelResponse with the generated content
            
        Raises:
            ModelConnectionError: If connection fails
            ModelTimeoutError: If request times out
            ModelUnavailableError: If model is unavailable
        """
        start_time = time.time()
        
        # Check if we should fail fast due to consecutive failures
        if self._consecutive_failures >= self._max_consecutive_failures:
            if self._status != ModelStatus.UNAVAILABLE:
                self._status = ModelStatus.UNAVAILABLE
            raise ModelUnavailableError(
                f"Model unavailable after {self._consecutive_failures} consecutive failures"
            )
        
        # Build request payload
        # Use num_predict if provided (hard limit), otherwise use max_tokens
        token_limit = num_predict if num_predict is not None else (max_tokens or self.config.max_tokens)
        
        payload = {
            "model": self.config.model_name,
            "prompt": prompt,
            "stream": False,
            "options": {
                "num_predict": token_limit,
                "temperature": temperature or self.config.temperature,
                "top_p": self.config.top_p,
            },
        }
        
        # Add vision support
        if kwargs.get('images'):
            payload['images'] = [kwargs['images']] if isinstance(kwargs['images'], str) else kwargs['images']
        
        if system_prompt:
            payload["system"] = system_prompt
        
        if stop_sequences:
            payload["options"]["stop"] = stop_sequences
        
        # JSON Mode support (Ollama native)
        if kwargs.get('json_mode'):
            payload["format"] = "json"
        
        try:
            # Use timeout_override if provided, otherwise use config timeout
            timeout_seconds = timeout_override if timeout_override is not None else self.config.timeout_seconds
            
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(timeout_seconds)
            ) as client:
                response = await client.post(
                    f"{self.config.base_url}/api/generate",
                    json=payload,
                )
                
                if response.status_code != 200:
                    self._consecutive_failures += 1
                    error_text = response.text
                    logger.error(f"Model request failed: {response.status_code} - {error_text}")
                    raise ModelConnectionError(
                        f"Model request failed with status {response.status_code}"
                    )
                
                data = response.json()
                
                # Reset failure counter on success
                self._consecutive_failures = 0
                self._status = ModelStatus.AVAILABLE
                
                total_duration = (time.time() - start_time) * 1000
                
                return ModelResponse(
                    content=data.get("response", ""),
                    model=data.get("model", self.config.model_name),
                    created_at=datetime.now(timezone.utc),
                    total_duration_ms=total_duration,
                    prompt_eval_count=data.get("prompt_eval_count", 0),
                    eval_count=data.get("eval_count", 0),
                    done=data.get("done", True),
                )
                
        except httpx.TimeoutException:
            self._consecutive_failures += 1
            timeout_used = timeout_override if timeout_override is not None else self.config.timeout_seconds
            logger.error(f"Model request timed out after {timeout_used}s")
            raise ModelTimeoutError(timeout_used)
            
        except httpx.ConnectError as e:
            self._consecutive_failures += 1
            self._status = ModelStatus.UNAVAILABLE
            logger.error(f"Failed to connect to model: {e}")
            raise ModelConnectionError(
                f"Failed to connect to Ollama at {self.config.base_url}",
                original_error=e,
            )
            
        except Exception as e:
            self._consecutive_failures += 1
            logger.error(f"Unexpected error during model request: {e}")
            raise ModelConnectionError(str(e), original_error=e)
    
    async def generate_chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> ModelResponse:
        """
        Generate a chat completion from the model.
        
        Args:
            messages: List of messages with 'role' and 'content'
            max_tokens: Maximum tokens to generate
            temperature: Sampling temperature
            
        Returns:
            ModelResponse with the generated content
        """
        start_time = time.time()
        
        if self._consecutive_failures >= self._max_consecutive_failures:
            raise ModelUnavailableError(
                f"Model unavailable after {self._consecutive_failures} consecutive failures"
            )
        
        payload = {
            "model": self.config.model_name,
            "messages": messages,
            "stream": False,
            "options": {
                "num_predict": max_tokens or self.config.max_tokens,
                "temperature": temperature or self.config.temperature,
                "top_p": self.config.top_p,
            },
        }
        
        try:
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.config.timeout_seconds)
            ) as client:
                response = await client.post(
                    f"{self.config.base_url}/api/chat",
                    json=payload,
                )
                
                if response.status_code != 200:
                    self._consecutive_failures += 1
                    raise ModelConnectionError(
                        f"Chat request failed with status {response.status_code}"
                    )
                
                data = response.json()
                
                self._consecutive_failures = 0
                self._status = ModelStatus.AVAILABLE
                
                total_duration = (time.time() - start_time) * 1000
                
                message = data.get("message", {})
                
                return ModelResponse(
                    content=message.get("content", ""),
                    model=data.get("model", self.config.model_name),
                    created_at=datetime.now(timezone.utc),
                    total_duration_ms=total_duration,
                    prompt_eval_count=data.get("prompt_eval_count", 0),
                    eval_count=data.get("eval_count", 0),
                    done=data.get("done", True),
                )
                
        except httpx.TimeoutException:
            self._consecutive_failures += 1
            raise ModelTimeoutError(self.config.timeout_seconds)
            
        except httpx.ConnectError as e:
            self._consecutive_failures += 1
            self._status = ModelStatus.UNAVAILABLE
            raise ModelConnectionError(
                f"Failed to connect to Ollama at {self.config.base_url}",
                original_error=e,
            )
            
        except Exception as e:
            self._consecutive_failures += 1
            raise ModelConnectionError(str(e), original_error=e)
    
    def reset_failures(self) -> None:
        """Reset the consecutive failure counter."""
        self._consecutive_failures = 0
        self._status = ModelStatus.UNKNOWN


# Synchronous wrapper for non-async contexts
class SyncModelClient:
    """Synchronous wrapper for LocalModelClient."""
    
    def __init__(self, config: Optional[ModelConfig] = None):
        self._async_client = LocalModelClient(config)
    
    @property
    def status(self) -> ModelStatus:
        return self._async_client.status
    
    @property
    def is_available(self) -> bool:
        return self._async_client.is_available
    
    def check_health(self) -> bool:
        """Check model health synchronously."""
        return asyncio.run(self._async_client.check_health())
    
    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        timeout_override: Optional[float] = None,
        num_predict: Optional[int] = None,
        **kwargs
    ) -> ModelResponse:
        """Generate completion synchronously."""
        return asyncio.run(
            self._async_client.generate(
                prompt=prompt,
                system_prompt=system_prompt,
                max_tokens=max_tokens,
                temperature=temperature,
                stop_sequences=stop_sequences,
                timeout_override=timeout_override,
                num_predict=num_predict,
                **kwargs
            )
        )
    
    def generate_chat(
        self,
        messages: List[Dict[str, str]],
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> ModelResponse:
        """Generate chat completion synchronously."""
        return asyncio.run(
            self._async_client.generate_chat(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        )


# Global client instances
_smart_client: Optional[LocalModelClient] = None
_fast_client: Optional[LocalModelClient] = None


def get_model_client() -> LocalModelClient:
    """Get the global SMART model client instance (default)."""
    global _smart_client
    if _smart_client is None:
        from ai.config import get_ai_config
        config = get_ai_config().model
        # Map config to ModelConfig
        model_config = ModelConfig(
            model_name=config.model_id,
            base_url=config.base_url,
            timeout_seconds=float(config.timeout_seconds),
            max_tokens=config.max_tokens,
            temperature=config.temperature,
        )
        _smart_client = LocalModelClient(model_config)
    return _smart_client


def get_fast_model_client() -> LocalModelClient:
    """Get the global FAST model client instance."""
    global _fast_client
    if _fast_client is None:
        from ai.config import get_ai_config
        config = get_ai_config().fast_model
        # Map config to ModelConfig
        model_config = ModelConfig(
            model_name=config.model_id,
            base_url=config.base_url,
            timeout_seconds=float(config.timeout_seconds),
            max_tokens=config.max_tokens,
            temperature=config.temperature,
        )
        _fast_client = LocalModelClient(model_config)
    return _fast_client
