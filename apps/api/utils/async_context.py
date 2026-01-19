"""
Async Context Propagation Utilities (G-02)

This module provides utilities for propagating tenant context in async operations.
Standard asyncio.gather() does NOT propagate ContextVar values to spawned tasks,
which can lead to cross-tenant data access.

CRITICAL RULES:
1. NEVER use raw asyncio.gather() in routers - use gather_with_tenant_context()
2. Always use token-based context reset
3. Each concurrent task gets its own context copy

Usage:
    # WRONG - context not propagated
    results = await asyncio.gather(task1(), task2())
    
    # CORRECT - use provided utility
    results = await gather_with_tenant_context(task1(), task2())
"""
from __future__ import annotations

import asyncio
import logging
from contextvars import copy_context
from typing import Any, Awaitable, TypeVar, Coroutine

from core.database import (
    set_tenant_context,
    reset_tenant_context,
    get_current_tenant_id,
    TenantContextToken
)
from utils.exceptions import TenantContextMissingError

logger = logging.getLogger(__name__)

T = TypeVar('T')


def copy_tenant_context() -> dict[str, Any]:
    """
    Copy current tenant context for propagation to async tasks.
    
    Returns a dict containing the current tenant_id that can be used
    to restore context in spawned tasks.
    
    Usage:
        ctx = copy_tenant_context()
        # Pass ctx to spawned task
        await spawned_task(ctx=ctx)
    
    Returns:
        Dict with tenant_id (may be None if no context set)
    """
    return {
        "tenant_id": get_current_tenant_id()
    }


async def run_with_tenant_context(
    coro: Coroutine[Any, Any, T],
    *,
    tenant_id: str
) -> T:
    """
    Run a coroutine with tenant context set.
    
    This function sets tenant context before running the coroutine
    and resets it after completion using token-based reset.
    
    Usage:
        result = await run_with_tenant_context(
            process_data_async(data_id="123"),
            tenant_id="tenant_456"
        )
    
    Args:
        coro: The coroutine to run
        tenant_id: The tenant ID to set (keyword-only)
        
    Returns:
        The result of the coroutine
    """
    token: TenantContextToken | None = None
    try:
        token = set_tenant_context(tenant_id)
        return await coro
    finally:
        if token is not None:
            reset_tenant_context(token)


async def gather_with_tenant_context(
    *coros: Awaitable[T],
    return_exceptions: bool = False
) -> list[T | BaseException]:
    """
    Run multiple coroutines concurrently with tenant context propagated to each.
    
    This is a safe replacement for asyncio.gather() that ensures each
    concurrent task has the correct tenant context set.
    
    CRITICAL: Use this instead of raw asyncio.gather() in routers!
    
    Usage:
        # Instead of:
        # results = await asyncio.gather(task1(), task2())
        
        # Use:
        results = await gather_with_tenant_context(task1(), task2())
    
    Args:
        *coros: Coroutines to run concurrently
        return_exceptions: If True, exceptions are returned instead of raised
        
    Returns:
        List of results from each coroutine
        
    Raises:
        TenantContextMissingError: If no tenant context is set
    """
    current_tenant = get_current_tenant_id()
    
    if not current_tenant:
        raise TenantContextMissingError(
            "gather_with_tenant_context requires tenant context to be set",
            operation="gather"
        )
    
    async def wrap_with_context(coro: Awaitable[T]) -> T:
        """Wrap coroutine with tenant context"""
        token: TenantContextToken | None = None
        try:
            token = set_tenant_context(current_tenant)
            return await coro
        finally:
            if token is not None:
                reset_tenant_context(token)
    
    # Wrap all coroutines with context
    wrapped = [wrap_with_context(coro) for coro in coros]
    
    # Run with asyncio.gather
    return await asyncio.gather(*wrapped, return_exceptions=return_exceptions)


async def create_task_with_tenant_context(
    coro: Coroutine[Any, Any, T],
    *,
    name: str | None = None
) -> asyncio.Task[T]:
    """
    Create an asyncio Task with tenant context propagated.
    
    This is a safe replacement for asyncio.create_task() that ensures
    the spawned task has the correct tenant context.
    
    Usage:
        task = await create_task_with_tenant_context(
            process_data_async(data_id="123"),
            name="process-data"
        )
        result = await task
    
    Args:
        coro: The coroutine to run as a task
        name: Optional name for the task
        
    Returns:
        The created Task
        
    Raises:
        TenantContextMissingError: If no tenant context is set
    """
    current_tenant = get_current_tenant_id()
    
    if not current_tenant:
        raise TenantContextMissingError(
            "create_task_with_tenant_context requires tenant context to be set",
            operation="create_task"
        )
    
    async def wrapped_coro() -> T:
        token: TenantContextToken | None = None
        try:
            token = set_tenant_context(current_tenant)
            return await coro
        finally:
            if token is not None:
                reset_tenant_context(token)
    
    return asyncio.create_task(wrapped_coro(), name=name)


class TenantContextTaskGroup:
    """
    Context manager for running multiple tasks with tenant context.
    
    This provides a structured way to run concurrent tasks while
    ensuring proper tenant context propagation and cleanup.
    
    Usage:
        async with TenantContextTaskGroup() as tg:
            tg.create_task(process_data_async(data_id="123"))
            tg.create_task(process_data_async(data_id="456"))
        # All tasks completed here
    
    Note: Requires Python 3.11+ for asyncio.TaskGroup.
    For earlier versions, use gather_with_tenant_context().
    """
    
    def __init__(self):
        self._tenant_id: str | None = None
        self._tasks: list[asyncio.Task] = []
    
    async def __aenter__(self) -> "TenantContextTaskGroup":
        self._tenant_id = get_current_tenant_id()
        if not self._tenant_id:
            raise TenantContextMissingError(
                "TenantContextTaskGroup requires tenant context to be set",
                operation="task_group"
            )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        # Wait for all tasks to complete
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
    
    def create_task(self, coro: Coroutine[Any, Any, T], *, name: str | None = None) -> asyncio.Task[T]:
        """Create a task with tenant context propagated."""
        tenant_id = self._tenant_id
        
        async def wrapped_coro() -> T:
            token: TenantContextToken | None = None
            try:
                token = set_tenant_context(tenant_id)
                return await coro
            finally:
                if token is not None:
                    reset_tenant_context(token)
        
        task = asyncio.create_task(wrapped_coro(), name=name)
        self._tasks.append(task)
        return task


# ============================================================================
# CI ENFORCEMENT NOTES
# ============================================================================
"""
The following patterns should be detected and blocked by CI:

FORBIDDEN:
    asyncio.gather(  # in routers/ directory
    asyncio.create_task(  # in routers/ directory without context wrapper

ALLOWED:
    gather_with_tenant_context(
    create_task_with_tenant_context(
    TenantContextTaskGroup

CI grep pattern:
    grep -r "asyncio\.gather\|asyncio\.create_task" routers/ --include="*.py"
"""
