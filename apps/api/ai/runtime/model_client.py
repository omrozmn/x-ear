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
                # Detection of provider based on URL or health endpoint
                health_url = f"{self.config.base_url}/api/tags" # Ollama
                if "/v1" in self.config.base_url:
                    health_url = f"{self.config.base_url}/models" # OpenAI/vLLM
                
                response = await client.get(health_url)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if "/v1" in self.config.base_url:
                        # OpenAI format
                        models = data.get("data", [])
                        model_names = [m.get("id", "") for m in models]
                    else:
                        # Ollama format
                        models = data.get("models", [])
                        model_names = [m.get("name", "") for m in models]
                    
                    # Check if our model is available
                    if any(self.config.model_name in name for name in model_names) or not model_names:
                        self._status = ModelStatus.AVAILABLE
                        self._consecutive_failures = 0
                        self._last_health_check = datetime.now(timezone.utc)
                        return True
                    else:
                        logger.warning(f"Model {self.config.model_name} not found in provider")
                        self._status = ModelStatus.DEGRADED
                        return False
                else:
                    self._status = ModelStatus.UNAVAILABLE
                    return False
                    
        except Exception as e:
            # Gemini health check is different, treat as success if we can't check it simply for now
            if "generativelanguage" in self.config.base_url:
                return True
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
        
        # Determine Provider
        is_openai = "/v1" in self.config.base_url or "api.groq.com" in self.config.base_url
        is_gemini = "generativelanguage.googleapis.com" in self.config.base_url
        
        # Token limit resolution
        token_limit = num_predict or max_tokens or self.config.max_tokens

        if is_gemini:
            # Gemini Native API format
            contents = [{"role": "user", "parts": [{"text": prompt}]}]
            if system_prompt:
                # Gemini 1.5 supports system_instruction, but for simplicity in chat:
                contents.insert(0, {"role": "model", "parts": [{"text": f"System Instruction: {system_prompt}"}]})
            
            payload = {
                "contents": contents,
                "generationConfig": {
                    "maxOutputTokens": token_limit,
                    "temperature": temperature or self.config.temperature,
                    "topP": self.config.top_p,
                }
            }
            # Handle vision
            if kwargs.get('images'):
                images = kwargs['images'] if isinstance(kwargs['images'], list) else [kwargs['images']]
                for img in images:
                    if isinstance(img, str) and (img.startswith('http') or img.startswith('/')):
                        # Gemini native API does not support direct URLs well in inlineData.
                        # For now, we omit them to avoid crash, but in a real app you might download them.
                        logger.warning(f"Gemini native API does not support URLs in inlineData: {img[:50]}...")
                        continue
                        
                    if isinstance(img, str) and ',' in img: 
                        img_data = img.split(',')[1] # strip data:image/jpeg;base64,
                    else:
                        img_data = img # Assume raw base64
                        
                    payload["contents"][-1]["parts"].append({
                        "inlineData": {
                            "mimeType": "image/jpeg",
                            "data": img_data
                        }
                    })
            
            endpoint = f"{self.config.base_url}/models/{self.config.model_name}:generateContent?key={self.config.api_key}"
            is_openai = False # Ensure we don't treat it as OpenAI later
            
        elif is_openai:
            # OpenAI / vLLM format
            messages = [{"role": "user", "content": prompt}]
            if system_prompt:
                messages.insert(0, {"role": "system", "content": system_prompt})
            
            # Handle vision content for OpenAI
            if kwargs.get('images'):
                content = [{"type": "text", "text": prompt}]
                images = kwargs['images'] if isinstance(kwargs['images'], list) else [kwargs['images']]
                for img in images:
                    # DISTINGUISH: URL vs Base64
                    if img.startswith('http') or img.startswith('data:'):
                        # Proper URL or already formatted base64
                        image_url = img
                    else:
                        # Raw base64, needs prefix
                        image_url = f"data:image/jpeg;base64,{img}"
                    content.append({"type": "image_url", "image_url": {"url": image_url}})
                messages[-1]["content"] = content

            payload = {
                "model": self.config.model_name,
                "messages": messages,
                "max_tokens": token_limit,
                "temperature": temperature or self.config.temperature,
                "top_p": self.config.top_p,
                "stream": False
            }
            endpoint = f"{self.config.base_url}/chat/completions"
        else:
            # Legacy Ollama format
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
            if kwargs.get('images'):
                payload['images'] = [kwargs['images']] if isinstance(kwargs['images'], str) else kwargs['images']
            if system_prompt:
                payload["system"] = system_prompt
            if stop_sequences:
                payload["options"]["stop"] = stop_sequences
            if kwargs.get('json_mode'):
                payload["format"] = "json"
            endpoint = f"{self.config.base_url}/api/generate"

        try:
            # Use timeout_override if provided, otherwise use config timeout
            timeout_seconds = timeout_override if timeout_override is not None else self.config.timeout_seconds
            
            headers = {}
            if self.config.api_key and not is_gemini:
                headers["Authorization"] = f"Bearer {self.config.api_key}"
            
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(timeout_seconds)
            ) as client:
                response = await client.post(endpoint, json=payload, headers=headers)
                
                if response.status_code != 200:
                    self._consecutive_failures += 1
                    error_text = response.text
                    logger.error(f"Model request failed: {response.status_code} - {error_text}")
                    raise ModelConnectionError(
                        f"Model request failed with status {response.status_code}"
                    )
                
                data = response.json()
                self._consecutive_failures = 0
                self._status = ModelStatus.AVAILABLE
                total_duration = (time.time() - start_time) * 1000
                
                if is_gemini:
                    if "candidates" not in data:
                        raise ModelConnectionError(f"Gemini error: {json.dumps(data)}")
                    content = data["candidates"][0]["content"]["parts"][0]["text"]
                    return ModelResponse(
                        content=content,
                        model=self.config.model_name,
                        created_at=datetime.now(timezone.utc),
                        total_duration_ms=total_duration,
                        done=True,
                    )
                elif is_openai:
                    choice = data.get("choices", [{}])[0]
                    content = choice.get("message", {}).get("content", "")
                    return ModelResponse(
                        content=content,
                        model=data.get("model", self.config.model_name),
                        created_at=datetime.now(timezone.utc),
                        total_duration_ms=total_duration,
                        prompt_eval_count=data.get("usage", {}).get("prompt_tokens", 0),
                        eval_count=data.get("usage", {}).get("completion_tokens", 0),
                        done=True,
                    )
                else:
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
            headers = {}
            if self.config.api_key:
                headers["Authorization"] = f"Bearer {self.config.api_key}"
                
            async with httpx.AsyncClient(
                timeout=httpx.Timeout(self.config.timeout_seconds)
            ) as client:
                response = await client.post(
                    f"{self.config.base_url}/api/chat",
                    json=payload,
                    headers=headers,
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


class FallbackModelClient:
    """Wrapper that falls back to a second client if the first one fails."""
    
    def __init__(self, primary: LocalModelClient, secondary: LocalModelClient):
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
        
    async def generate(self, *args, **kwargs) -> ModelResponse:
        try:
            return await self.primary.generate(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Primary model failed, falling back: {e}")
            return await self.secondary.generate(*args, **kwargs)
            
    async def generate_chat(self, *args, **kwargs) -> ModelResponse:
        try:
            return await self.primary.generate_chat(*args, **kwargs)
        except Exception as e:
            logger.warning(f"Primary model failed, falling back: {e}")
            return await self.secondary.generate_chat(*args, **kwargs)

    def reset_failures(self) -> None:
        self.primary.reset_failures()
        self.secondary.reset_failures()


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
    
    def _run_safe(self, coro):
        """Safely run a coroutine, detecting if an event loop is already running."""
        try:
            asyncio.get_running_loop()
            # If we are here, a loop is running. asyncio.run() will fail.
            logger.error("SyncModelClient used inside an async event loop (e.g. FastAPI). Use async client instead.")
            raise RuntimeError("Cannot use SyncModelClient inside a running event loop. Use LocalModelClient (async) instead.")
        except RuntimeError:
            # No loop running, asyncio.run is safe
            return asyncio.run(coro)

    def check_health(self) -> bool:
        """Check model health synchronously."""
        return self._run_safe(self._async_client.check_health())
    
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
        # Note: stop_sequences was missing from arguments in original code but was passed to generate
        stop_sequences = kwargs.get('stop_sequences')
        return self._run_safe(
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
        return self._run_safe(
            self._async_client.generate_chat(
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature,
            )
        )


# Global client instances
_smart_client: Optional[LocalModelClient] = None
_fast_client: Optional[LocalModelClient] = None


def get_model_client() -> Any:
    """Get the global SMART model client instance (default)."""
    global _smart_client
    if _smart_client is None:
        from ai.config import get_ai_config
        config = get_ai_config().model
        
        # Primary: Groq
        primary_config = ModelConfig(
            model_name=config.ai_model_id,
            base_url=config.base_url,
            timeout_seconds=float(config.timeout_seconds),
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            api_key=os.getenv("GROQ_API_KEY")
        )
        primary = LocalModelClient(primary_config)
        
        # Secondary: Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            secondary_config = ModelConfig(
                model_name="gemini-1.5-pro",
                base_url="https://generativelanguage.googleapis.com/v1beta",
                api_key=gemini_key
            )
            secondary = LocalModelClient(secondary_config)
            _smart_client = FallbackModelClient(primary, secondary)
        else:
            _smart_client = primary
            
    return _smart_client


def get_fast_model_client() -> Any:
    """Get the global FAST model client instance."""
    global _fast_client
    if _fast_client is None:
        from ai.config import get_ai_config
        config = get_ai_config().fast_model
        
        # Primary: Groq
        primary_config = ModelConfig(
            model_name=config.ai_model_id,
            base_url=config.base_url,
            timeout_seconds=float(config.timeout_seconds),
            max_tokens=config.max_tokens,
            temperature=config.temperature,
            api_key=os.getenv("GROQ_API_KEY")
        )
        primary = LocalModelClient(primary_config)
        
        # Secondary: Gemini
        gemini_key = os.getenv("GEMINI_API_KEY")
        if gemini_key:
            secondary_config = ModelConfig(
                model_name="gemini-1.5-flash",
                base_url="https://generativelanguage.googleapis.com/v1beta",
                api_key=gemini_key
            )
            secondary = LocalModelClient(secondary_config)
            _fast_client = FallbackModelClient(primary, secondary)
        else:
            _fast_client = primary
            
    return _fast_client


async def route_model(request: Any) -> LocalModelClient:
    """
    Route request to appropriate model client based on vision needs and complexity.
    BUG-002: Includes health check and automatic fallback.
    
    - Routes to SMART client (Qwen 7B-VL) if requirements met and healthy.
    - Routes to FAST client (Qwen 3B) otherwise.
    """
    # 1. Vision Detection (Qwen 7B-VL required for images)
    has_images = False
    if hasattr(request, 'images') and request.images:
        has_images = True
    elif isinstance(request, dict) and (request.get('images') or request.get('files')):
        # Check files for vision-compatible extensions if needed, but here simple presence suffices
        has_images = True
    
    # Selection logic
    target_client = get_fast_model_client() # Default
    
    if has_images or preference in ('smart', 'high', 'complex') or intent in ('vision_analysis', 'complex_planning'):
        target_client = get_model_client()
        
    # BUG-002: SMART Health Check & Fallback
    if target_client == get_model_client():
        # Quick health check (cached check_health handles intervals if implemented, 
        # otherwise this does a network call)
        is_healthy = await target_client.check_health()
        if not is_healthy:
            logger.warning("SMART model unreachable, falling back to FAST model", extra={"ai_fallback": True})
            return get_fast_model_client()
            
    return target_client
