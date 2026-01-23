"""
Tenant Security Exceptions (G-02)

This module defines custom exceptions for tenant context errors.
These exceptions provide clear error messages and enable proper
error handling in different contexts (HTTP requests, background tasks, async ops).

CRITICAL: These exceptions should be caught and handled appropriately:
- HTTP context: Return 500 with generic message (don't leak tenant info)
- Background task: Log error and fail the task
- Async context: Propagate to caller for handling
"""
from typing import Optional


class TenantSecurityError(Exception):
    """
    Base exception for all tenant security errors.
    
    All tenant-related exceptions inherit from this class,
    allowing catch-all handling when needed.
    """
    
    def __init__(self, message: str, tenant_id: Optional[str] = None):
        self.message = message
        self.tenant_id = tenant_id
        super().__init__(message)
    
    def __str__(self) -> str:
        if self.tenant_id:
            return f"{self.message} (tenant_id={self.tenant_id})"
        return self.message


class TenantContextError(Exception):
    """
    Exception raised when tenant_id is missing in background tasks.
    
    This error indicates that a background task was invoked without
    providing the required tenant_id parameter. Background tasks
    MUST receive tenant_id explicitly because ContextVar doesn't
    propagate across process boundaries (e.g., Celery workers).
    
    Usage:
        @tenant_task
        def process_invoice(*, tenant_id: str, invoice_id: str):
            ...
        
        # This will raise TenantContextError:
        process_invoice(invoice_id="inv_123")  # Missing tenant_id
    """
    
    def __init__(self, message: str = "tenant_id is required for background tasks"):
        self.message = message
        super().__init__(message)


class TenantContextMissingError(Exception):
    """
    Exception raised when tenant context is missing in async operations.
    
    This error indicates that an async operation was started without
    proper tenant context propagation. Async operations MUST use
    the provided utilities (copy_tenant_context, gather_with_tenant_context)
    to ensure context is properly propagated.
    
    Usage:
        # WRONG - context not propagated
        await asyncio.gather(task1(), task2())
        
        # CORRECT - use provided utility
        await gather_with_tenant_context(task1(), task2())
    """
    
    def __init__(
        self, 
        message: str = "Tenant context not available in async operation",
        operation: Optional[str] = None
    ):
        self.message = message
        self.operation = operation
        full_message = f"{message} (operation={operation})" if operation else message
        super().__init__(full_message)


class TenantContextRequiredError(Exception):
    """
    Exception raised when a query is executed without tenant context in strict mode.
    
    When TENANT_STRICT_MODE=true, all queries on tenant-scoped models
    MUST have a tenant context set. This exception is raised when:
    1. A SELECT query is executed on a TenantScopedMixin model
    2. No tenant_id is set in the ContextVar
    3. The query is not in an UnboundSession context
    
    This is a security measure to prevent accidental cross-tenant data access.
    
    Resolution:
    - Ensure tenant context is set before querying
    - Use unbound_session(reason="...") for legitimate cross-tenant access
    - Check if the code path should have tenant context
    """
    
    def __init__(
        self, 
        message: str = "Query requires tenant context but none is set",
        model_name: Optional[str] = None
    ):
        self.message = message
        self.model_name = model_name
        full_message = f"{message} (model={model_name})" if model_name else message
        super().__init__(full_message)


class TenantMismatchError(TenantSecurityError):
    """
    Exception raised when an entity's tenant doesn't match the current context.
    
    This is a security error that indicates a potential cross-tenant
    access attempt. The error should be logged for security audit
    but the response to the client should be generic (404 Not Found)
    to avoid leaking information about other tenants' data.
    """
    
    def __init__(
        self, 
        expected_tenant: str, 
        actual_tenant: str,
        entity_type: Optional[str] = None,
        entity_id: Optional[str] = None
    ):
        self.expected_tenant = expected_tenant
        self.actual_tenant = actual_tenant
        self.entity_type = entity_type
        self.entity_id = entity_id
        
        message = f"Tenant mismatch: expected {expected_tenant}, got {actual_tenant}"
        if entity_type and entity_id:
            message = f"{message} for {entity_type}:{entity_id}"
        
        super().__init__(message, tenant_id=expected_tenant)


class UnboundSessionAuditError(Exception):
    """
    Exception raised when unbound_session is used without a reason.
    
    All cross-tenant access MUST be audited. The unbound_session
    context manager requires a 'reason' parameter that is logged
    for security audit purposes.
    
    Usage:
        # WRONG - no reason provided
        with unbound_session():
            ...
        
        # CORRECT - reason provided for audit
        with unbound_session(reason="admin-report-generation"):
            ...
    """
    
    def __init__(self, message: str = "unbound_session requires a 'reason' parameter for audit"):
        self.message = message
        super().__init__(message)


class ConfigurationError(Exception):
    """
    Exception raised when required configuration is missing or invalid.
    
    This error indicates that the application cannot start or operate
    correctly due to missing or invalid configuration values.
    
    Usage:
        if not os.getenv("SMTP_ENCRYPTION_KEY"):
            raise ConfigurationError("SMTP_ENCRYPTION_KEY environment variable is required")
    """
    
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class SecurityException(Exception):
    """
    Exception raised when a security-related operation fails.
    
    This error indicates a security violation such as:
    - Failed decryption (tampered data)
    - Invalid authentication tag
    - Unauthorized access attempt
    
    These errors should be logged with high severity for security audit.
    
    Usage:
        try:
            decrypted = decrypt_password(encrypted)
        except InvalidToken:
            logger.error("Password decryption failed - invalid authentication tag")
            raise SecurityException("Failed to decrypt SMTP password")
    """
    
    def __init__(self, message: str, details: Optional[str] = None):
        self.message = message
        self.details = details
        full_message = f"{message}: {details}" if details else message
        super().__init__(full_message)


class TemplateError(Exception):
    """
    Exception raised when email template operations fail.
    
    This error indicates issues with email template processing such as:
    - Template not found
    - Template syntax error
    - Template rendering failure
    
    Usage:
        try:
            template = jinja_env.get_template("password_reset.html")
        except TemplateNotFound:
            raise TemplateError("Email template not found: password_reset")
    """
    
    def __init__(self, message: str, details: Optional[str] = None):
        self.message = message
        self.details = details
        full_message = f"{message}: {details}" if details else message
        super().__init__(full_message)


class ValidationError(Exception):
    """
    Exception raised when data validation fails.
    
    This error indicates that provided data does not meet validation requirements such as:
    - Missing required fields
    - Invalid field values
    - Type mismatches
    - Business rule violations
    
    Usage:
        if not all(required_vars in variables):
            raise ValidationError("Missing required variables: reset_link, user_name")
    """
    
    def __init__(self, message: str, details: Optional[str] = None):
        self.message = message
        self.details = details
        full_message = f"{message}: {details}" if details else message
        super().__init__(full_message)



class SMTPError(Exception):
    """
    Exception raised when SMTP operations fail.
    
    This error indicates issues with SMTP operations such as:
    - No SMTP configuration found
    - SMTP connection failure
    - SMTP authentication failure
    - Email sending failure
    
    Usage:
        if not smtp_config:
            raise SMTPError("No SMTP configuration found for tenant")
    """
    
    def __init__(self, message: str, details: Optional[str] = None):
        self.message = message
        self.details = details
        full_message = f"{message}: {details}" if details else message
        super().__init__(full_message)
