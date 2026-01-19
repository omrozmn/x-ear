"""
Background Task Tenant Context Management (G-02)

This module provides decorators and utilities for running background tasks
with proper tenant context isolation.

CRITICAL RULES:
1. tenant_id MUST be a keyword-only parameter (*, tenant_id: str)
2. ContextVar does NOT propagate to Celery workers - always pass explicitly
3. Use copy_context() for ThreadPoolExecutor safety
4. Always use token-based context reset

Usage:
    @tenant_task
    def process_invoice(*, tenant_id: str, invoice_id: str):
        # tenant context is automatically set
        invoice = db.query(Invoice).filter_by(id=invoice_id).first()
        ...
    
    # Call with keyword argument
    process_invoice(tenant_id="tenant_123", invoice_id="inv_456")
"""
from __future__ import annotations

import functools
import logging
from contextvars import copy_context
from typing import Callable, TypeVar, ParamSpec, Any

from core.database import (
    set_tenant_context,
    reset_tenant_context,
    get_current_tenant_id,
    TenantContextToken
)
from utils.exceptions import TenantContextError

logger = logging.getLogger(__name__)

P = ParamSpec('P')
R = TypeVar('R')


def tenant_task(func: Callable[P, R]) -> Callable[P, R]:
    """
    Decorator for background tasks that require tenant context.
    
    This decorator:
    1. Validates that tenant_id is provided as a keyword argument
    2. Sets tenant context before executing the function
    3. Resets tenant context after execution (using token-based reset)
    4. Uses copy_context() for ThreadPoolExecutor safety
    
    CRITICAL: The decorated function MUST have tenant_id as a keyword-only parameter:
        def my_task(*, tenant_id: str, other_param: str): ...
    
    Usage:
        @tenant_task
        def process_invoice(*, tenant_id: str, invoice_id: str):
            # tenant context is automatically set
            invoice = db.query(Invoice).filter_by(id=invoice_id).first()
            ...
        
        # Call with keyword argument
        process_invoice(tenant_id="tenant_123", invoice_id="inv_456")
    
    Args:
        func: The function to wrap
        
    Returns:
        Wrapped function with tenant context management
        
    Raises:
        TenantContextError: If tenant_id is not provided or is None
    """
    @functools.wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        # CRITICAL: tenant_id MUST be keyword-only
        # Reject positional arguments for tenant_id
        if args:
            raise TenantContextError(
                f"tenant_task functions must use keyword-only arguments. "
                f"Got {len(args)} positional argument(s). "
                f"Use: {func.__name__}(tenant_id='...', ...)"
            )
        
        # Extract tenant_id from kwargs
        tenant_id = kwargs.get('tenant_id')
        
        if not tenant_id:
            raise TenantContextError(
                f"tenant_id is required for background task '{func.__name__}'. "
                f"Provide it as a keyword argument: {func.__name__}(tenant_id='...', ...)"
            )
        
        # Use copy_context for ThreadPoolExecutor safety
        ctx = copy_context()
        
        def run_with_context() -> R:
            token: TenantContextToken | None = None
            try:
                # Set tenant context
                token = set_tenant_context(tenant_id)
                logger.debug(f"Background task '{func.__name__}' started with tenant_id={tenant_id}")
                
                # Execute the function
                return func(**kwargs)
                
            finally:
                # CRITICAL: Always reset context using token
                if token is not None:
                    reset_tenant_context(token)
                    logger.debug(f"Background task '{func.__name__}' completed, context reset")
        
        # Run in copied context
        return ctx.run(run_with_context)
    
    return wrapper


def tenant_task_async(func: Callable[P, R]) -> Callable[P, R]:
    """
    Decorator for async background tasks that require tenant context.
    
    This is the async version of @tenant_task. It follows the same rules:
    1. tenant_id MUST be a keyword-only parameter
    2. Context is set before and reset after execution
    3. Uses token-based reset
    
    CRITICAL: The decorator factory is SYNC (not async def).
    Only the wrapper function is async.
    
    Usage:
        @tenant_task_async
        async def process_invoice_async(*, tenant_id: str, invoice_id: str):
            # tenant context is automatically set
            invoice = await db.get(Invoice, invoice_id)
            ...
        
        # Call with keyword argument
        await process_invoice_async(tenant_id="tenant_123", invoice_id="inv_456")
    
    Args:
        func: The async function to wrap
        
    Returns:
        Wrapped async function with tenant context management
        
    Raises:
        TenantContextError: If tenant_id is not provided or is None
    """
    @functools.wraps(func)
    async def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        # CRITICAL: tenant_id MUST be keyword-only
        if args:
            raise TenantContextError(
                f"tenant_task_async functions must use keyword-only arguments. "
                f"Got {len(args)} positional argument(s). "
                f"Use: {func.__name__}(tenant_id='...', ...)"
            )
        
        # Extract tenant_id from kwargs
        tenant_id = kwargs.get('tenant_id')
        
        if not tenant_id:
            raise TenantContextError(
                f"tenant_id is required for async background task '{func.__name__}'. "
                f"Provide it as a keyword argument: {func.__name__}(tenant_id='...', ...)"
            )
        
        token: TenantContextToken | None = None
        try:
            # Set tenant context
            token = set_tenant_context(tenant_id)
            logger.debug(f"Async background task '{func.__name__}' started with tenant_id={tenant_id}")
            
            # Execute the async function
            return await func(**kwargs)
            
        finally:
            # CRITICAL: Always reset context using token
            if token is not None:
                reset_tenant_context(token)
                logger.debug(f"Async background task '{func.__name__}' completed, context reset")
    
    return wrapper


def run_in_tenant_context(tenant_id: str, func: Callable[..., R], *args: Any, **kwargs: Any) -> R:
    """
    Run a function with tenant context set.
    
    This is a utility function for cases where you can't use the decorator.
    It sets tenant context, runs the function, and resets context.
    
    Usage:
        result = run_in_tenant_context(
            "tenant_123",
            process_data,
            data_id="data_456"
        )
    
    Args:
        tenant_id: The tenant ID to set
        func: The function to run
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        The result of the function
    """
    token: TenantContextToken | None = None
    try:
        token = set_tenant_context(tenant_id)
        return func(*args, **kwargs)
    finally:
        if token is not None:
            reset_tenant_context(token)


async def run_in_tenant_context_async(
    tenant_id: str, 
    func: Callable[..., R], 
    *args: Any, 
    **kwargs: Any
) -> R:
    """
    Run an async function with tenant context set.
    
    This is the async version of run_in_tenant_context.
    
    Usage:
        result = await run_in_tenant_context_async(
            "tenant_123",
            process_data_async,
            data_id="data_456"
        )
    
    Args:
        tenant_id: The tenant ID to set
        func: The async function to run
        *args: Positional arguments for the function
        **kwargs: Keyword arguments for the function
        
    Returns:
        The result of the function
    """
    token: TenantContextToken | None = None
    try:
        token = set_tenant_context(tenant_id)
        return await func(*args, **kwargs)
    finally:
        if token is not None:
            reset_tenant_context(token)


# ============================================================================
# CELERY INTEGRATION NOTES
# ============================================================================
"""
CRITICAL: ContextVar does NOT propagate to Celery workers!

Celery workers run in separate processes, so ContextVar values are not shared.
You MUST pass tenant_id as an explicit parameter to Celery tasks.

WRONG:
    @celery.task
    def process_invoice(invoice_id: str):
        # tenant_id is NOT available here!
        tenant_id = get_current_tenant_id()  # Returns None!

CORRECT:
    @celery.task
    def process_invoice(*, tenant_id: str, invoice_id: str):
        # Set context explicitly
        token = set_tenant_context(tenant_id)
        try:
            # Now queries are filtered by tenant
            invoice = db.query(Invoice).filter_by(id=invoice_id).first()
        finally:
            reset_tenant_context(token)

Or use the decorator:
    @celery.task
    @tenant_task
    def process_invoice(*, tenant_id: str, invoice_id: str):
        # Context is automatically managed
        invoice = db.query(Invoice).filter_by(id=invoice_id).first()
"""
