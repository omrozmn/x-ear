"""
SMTPConfigService for SMTP Email Integration

This service manages tenant-specific SMTP configurations with encrypted passwords.
Provides CRUD operations, validation, and fallback to global configuration.

Requirements:
- 1.1: Encrypt SMTP password using AES-256-GCM before storing
- 1.2: Decrypt password only when explicitly requested with proper authorization
- 1.3: Use global fallback configuration from environment variables
- 1.4: Store SMTP configurations with tenant_id isolation
- 1.5: Validate configuration by attempting test connection
- 1.6: Support SMTP parameters (host, port, username, password, etc.)
- 1.7: Use most recently created active configuration
- 22.1-22.7: Validate SMTP configuration fields

Security Notes:
- Passwords are encrypted at rest using EncryptionService
- Tenant isolation enforced on all queries
- Cross-tenant access returns 404 (not 403) to prevent existence disclosure
- Decrypted passwords only returned for email sending operations
"""

import os
import logging
from typing import Optional
from sqlalchemy.orm import Session
from email_validator import validate_email, EmailNotValidError

from core.models.email import TenantSMTPConfig
from services.encryption_service import EncryptionService
from utils.exceptions import ConfigurationError

logger = logging.getLogger(__name__)


class SMTPConfigService:
    """
    Service for managing tenant SMTP configurations.
    
    This service handles:
    - Creating/updating SMTP configurations with password encryption
    - Retrieving active configurations with tenant filtering
    - Decrypting passwords for email sending
    - Validating SMTP configuration fields
    - Providing global fallback configuration
    
    Usage:
        encryption_service = EncryptionService()
        service = SMTPConfigService(db, encryption_service)
        
        # Create/update config
        config = service.create_or_update_config(config_data, tenant_id)
        
        # Get active config
        config = service.get_active_config(tenant_id)
        
        # Get config with decrypted password for sending
        smtp_config = service.get_config_with_decrypted_password(tenant_id)
    """
    
    def __init__(self, db: Session, encryption_service: EncryptionService):
        """
        Initialize the SMTP configuration service.
        
        Args:
            db: SQLAlchemy database session
            encryption_service: Service for encrypting/decrypting passwords
        """
        self.db = db
        self.encryption_service = encryption_service
    
    def create_or_update_config(
        self, 
        config_data: dict,
        tenant_id: str
    ) -> TenantSMTPConfig:
        """
        Create or update SMTP configuration for tenant.
        
        Encrypts password before storage and validates configuration fields.
        If an active configuration exists, it will be updated. Otherwise, a new
        configuration is created.
        
        Args:
            config_data: Dictionary containing SMTP configuration fields
                - host: SMTP server hostname or IP
                - port: SMTP server port
                - username: SMTP authentication username
                - password: SMTP authentication password (will be encrypted)
                - from_email: From email address
                - from_name: From display name
                - use_tls: Use STARTTLS (default: False)
                - use_ssl: Use SSL/TLS (default: True)
                - timeout: Connection timeout in seconds (default: 30)
            tenant_id: Tenant identifier
            
        Returns:
            TenantSMTPConfig: The created or updated configuration
            
        Raises:
            SecurityException: If password encryption fails
            
        Example:
            config_data = {
                "host": "mail.example.com",
                "port": 465,
                "username": "info@example.com",
                "password": "secret123",
                "from_email": "info@example.com",
                "from_name": "Example Company",
                "use_ssl": True,
                "timeout": 30
            }
            config = service.create_or_update_config(config_data, "tenant_123")
        """
        # Extract password and encrypt it
        password = config_data.pop("password", None)
        if not password:
            raise ValueError("Password is required")
        
        encrypted_password = self.encryption_service.encrypt_password(password)
        
        # Check for existing active config
        existing = self.db.query(TenantSMTPConfig).filter(
            TenantSMTPConfig.tenant_id == tenant_id,
            TenantSMTPConfig.is_active == True
        ).first()
        
        if existing:
            # Update existing configuration
            for field, value in config_data.items():
                if hasattr(existing, field):
                    setattr(existing, field, value)
            existing.encrypted_password = encrypted_password
            config = existing
            logger.info(f"Updated SMTP config for tenant {tenant_id}")
        else:
            # Create new configuration
            config = TenantSMTPConfig(
                tenant_id=tenant_id,
                encrypted_password=encrypted_password,
                **config_data
            )
            self.db.add(config)
            logger.info(f"Created new SMTP config for tenant {tenant_id}")
        
        self.db.flush()
        return config
    
    def get_active_config(self, tenant_id: str) -> Optional[TenantSMTPConfig]:
        """
        Get active SMTP configuration for tenant.
        
        Returns the most recently created active configuration for the tenant.
        If no active configuration exists, returns None (caller should use
        global fallback).
        
        Args:
            tenant_id: Tenant identifier
            
        Returns:
            TenantSMTPConfig or None: The active configuration, or None if not found
            
        Example:
            config = service.get_active_config("tenant_123")
            if config:
                print(f"Using tenant config: {config.host}")
            else:
                print("No tenant config, will use global fallback")
        """
        config = self.db.query(TenantSMTPConfig).filter(
            TenantSMTPConfig.tenant_id == tenant_id,
            TenantSMTPConfig.is_active == True
        ).order_by(TenantSMTPConfig.created_at.desc()).first()
        
        if config:
            logger.debug(f"Found active SMTP config for tenant {tenant_id}")
        else:
            logger.debug(f"No active SMTP config for tenant {tenant_id}, will use fallback")
        
        return config
    
    def get_config_with_decrypted_password(
        self, 
        tenant_id: str
    ) -> dict:
        """
        Get SMTP config with decrypted password for email sending.
        
        Returns a dictionary with plaintext password for SMTP connection.
        If no tenant configuration exists, returns global fallback configuration
        from environment variables.
        
        SECURITY NOTE: This method returns plaintext passwords and should only
        be called when actually sending emails. Never expose this data in API
        responses.
        
        Args:
            tenant_id: Tenant identifier
            
        Returns:
            dict: SMTP configuration with plaintext password containing:
                - host: SMTP server hostname
                - port: SMTP server port
                - username: SMTP authentication username
                - password: SMTP authentication password (PLAINTEXT)
                - from_email: From email address
                - from_name: From display name
                - use_tls: Use STARTTLS
                - use_ssl: Use SSL/TLS
                - timeout: Connection timeout in seconds
                
        Raises:
            SecurityException: If password decryption fails
            
        Example:
            smtp_config = service.get_config_with_decrypted_password("tenant_123")
            # Use smtp_config to send email
            # NEVER return smtp_config in API response!
        """
        config = self.get_active_config(tenant_id)
        
        if not config:
            logger.info(f"Using global fallback SMTP config for tenant {tenant_id}")
            return self._get_global_fallback_config()
        
        # Decrypt password
        plaintext_password = self.encryption_service.decrypt_password(
            config.encrypted_password
        )
        
        return {
            "host": config.host,
            "port": config.port,
            "username": config.username,
            "password": plaintext_password,
            "from_email": config.from_email,
            "from_name": config.from_name,
            "use_tls": config.use_tls,
            "use_ssl": config.use_ssl,
            "timeout": config.timeout
        }
    
    def _get_global_fallback_config(self) -> dict:
        """
        Get global SMTP configuration from environment variables.
        
        This configuration is used when a tenant has no specific SMTP configuration.
        All tenants can fall back to this global configuration.
        
        Environment Variables:
            SMTP_HOST: SMTP server hostname (default: mail.x-ear.com)
            SMTP_PORT: SMTP server port (default: 465)
            SMTP_USER: SMTP authentication username (default: info@x-ear.com)
            SMTP_PASS: SMTP authentication password (default: empty string)
            SMTP_FROM_EMAIL: From email address (default: info@x-ear.com)
            SMTP_FROM_NAME: From display name (default: X-Ear CRM)
            SMTP_USE_TLS: Use STARTTLS (default: false)
            SMTP_USE_SSL: Use SSL/TLS (default: true)
            SMTP_TIMEOUT: Connection timeout in seconds (default: 30)
            
        Returns:
            dict: Global SMTP configuration
            
        Example:
            config = service._get_global_fallback_config()
            print(f"Global SMTP host: {config['host']}")
        """
        return {
            "host": os.getenv("SMTP_HOST", "mail.x-ear.com"),
            "port": int(os.getenv("SMTP_PORT", "465")),
            "username": os.getenv("SMTP_USER", "info@x-ear.com"),
            "password": os.getenv("SMTP_PASS", ""),
            "from_email": os.getenv("SMTP_FROM_EMAIL", "info@x-ear.com"),
            "from_name": os.getenv("SMTP_FROM_NAME", "X-Ear CRM"),
            "use_tls": os.getenv("SMTP_USE_TLS", "false").lower() == "true",
            "use_ssl": os.getenv("SMTP_USE_SSL", "true").lower() == "true",
            "timeout": int(os.getenv("SMTP_TIMEOUT", "30"))
        }
    
    def validate_config(self, config_data: dict) -> tuple[bool, str]:
        """
        Validate SMTP configuration fields.
        
        Performs validation on SMTP configuration fields including:
        - Email format validation
        - Port range validation
        - SSL/TLS port recommendations
        - Timeout range validation
        
        Args:
            config_data: Dictionary containing SMTP configuration fields
            
        Returns:
            tuple[bool, str]: (is_valid, error_message)
                - is_valid: True if validation passes, False otherwise
                - error_message: Empty string if valid, error description if invalid
                
        Validation Rules:
            - host: Must be non-empty string
            - port: Must be between 1 and 65535
            - from_email: Must be valid email format
            - timeout: Must be between 5 and 120 seconds
            - SSL typically uses port 465
            - TLS typically uses port 587 or 25
            
        Example:
            config_data = {
                "host": "mail.example.com",
                "port": 465,
                "from_email": "info@example.com",
                "use_ssl": True,
                "timeout": 30
            }
            is_valid, error = service.validate_config(config_data)
            if not is_valid:
                print(f"Validation failed: {error}")
        """
        # Validate host
        host = config_data.get("host", "")
        if not host or not isinstance(host, str) or len(host.strip()) == 0:
            return False, "Host is required and must be a valid hostname or IP address"
        
        # Validate port
        port = config_data.get("port")
        if not isinstance(port, int) or port < 1 or port > 65535:
            return False, "Port must be between 1 and 65535"
        
        # Validate from_email format
        from_email = config_data.get("from_email", "")
        try:
            # Use check_deliverability=False to skip DNS checks (for testing and flexibility)
            validate_email(from_email, check_deliverability=False)
        except EmailNotValidError as e:
            return False, f"Invalid from_email format: {str(e)}"
        
        # Validate timeout
        timeout = config_data.get("timeout", 30)
        if not isinstance(timeout, int) or timeout < 5 or timeout > 120:
            return False, "Timeout must be between 5 and 120 seconds"
        
        # Validate SSL/TLS port recommendations (warnings, not errors)
        use_ssl = config_data.get("use_ssl", False)
        use_tls = config_data.get("use_tls", False)
        
        if use_ssl and port not in [465, 587]:
            logger.warning(f"SSL typically uses port 465, but port {port} was specified")
            # Note: This is a warning, not an error - some servers use non-standard ports
        
        if use_tls and port not in [587, 25]:
            logger.warning(f"TLS typically uses port 587 or 25, but port {port} was specified")
            # Note: This is a warning, not an error - some servers use non-standard ports
        
        return True, ""
    
    def deactivate_config(self, tenant_id: str) -> bool:
        """
        Deactivate the current active SMTP configuration for a tenant.
        
        This method sets is_active=False on the current active configuration.
        After deactivation, the tenant will use the global fallback configuration.
        
        Args:
            tenant_id: Tenant identifier
            
        Returns:
            bool: True if a configuration was deactivated, False if no active config found
            
        Example:
            success = service.deactivate_config("tenant_123")
            if success:
                print("Configuration deactivated, will use global fallback")
        """
        config = self.get_active_config(tenant_id)
        
        if config:
            config.is_active = False
            self.db.flush()
            logger.info(f"Deactivated SMTP config for tenant {tenant_id}")
            return True
        
        logger.debug(f"No active SMTP config to deactivate for tenant {tenant_id}")
        return False


# Dependency injection helper
def get_smtp_config_service(db: Session) -> SMTPConfigService:
    """
    Get SMTPConfigService instance for dependency injection.
    
    This function is used in FastAPI routes to inject the service.
    
    Args:
        db: Database session from get_db() dependency
        
    Returns:
        SMTPConfigService: Service instance
        
    Example:
        @router.post("/config")
        def create_config(
            config: SMTPConfigCreate,
            service: SMTPConfigService = Depends(get_smtp_config_service),
            db: Session = Depends(get_db)
        ):
            result = service.create_or_update_config(config.dict(), tenant_id)
    """
    from services.encryption_service import get_encryption_service
    encryption_service = get_encryption_service()
    return SMTPConfigService(db, encryption_service)
