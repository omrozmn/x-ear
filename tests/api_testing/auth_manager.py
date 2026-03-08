"""Authentication manager for API testing."""
import requests
from typing import Optional
from enum import Enum
from .logging_config import logger


class TokenType(Enum):
    """Authentication token types."""
    ADMIN = "ADMIN_TOKEN"
    TENANT = "TENANT_TOKEN"
    AFFILIATE = "AFFILIATE_TOKEN"


class AuthManager:
    """Manages authentication tokens and flows."""
    
    def __init__(self, base_url: str, timeout: int = 15):
        """Initialize auth manager.
        
        Args:
            base_url: Base URL for API (e.g., "http://localhost:5003")
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.admin_token: Optional[str] = None
        self.tenant_token: Optional[str] = None
        self.affiliate_token: Optional[str] = None
        self.current_tenant_id: Optional[str] = None
    
    def admin_login(self, email: str, password: str) -> str:
        """Perform admin login and store token.
        
        Args:
            email: Admin email
            password: Admin password
            
        Returns:
            Admin JWT token
            
        Raises:
            requests.HTTPError: If login fails
        """
        logger.info(f"Admin login: {email}")
        
        response = requests.post(
            f"{self.base_url}/api/admin/auth/login",
            json={"email": email, "password": password},
            headers={
                "Content-Type": "application/json",
                "Idempotency-Key": f"admin-login-{int(__import__('time').time())}"
            },
            timeout=self.timeout
        )
        response.raise_for_status()
        
        data = response.json()
        # Try both 'token' and 'accessToken' fields for compatibility
        token_data = data.get('data', {})
        self.admin_token = token_data.get('token') or token_data.get('accessToken')
        
        if not self.admin_token:
            raise ValueError("Admin token not found in response")
        
        logger.info("✓ Admin authenticated")
        return self.admin_token
    
    def switch_tenant(self, tenant_id: str) -> str:
        """Switch to tenant context (impersonation).
        
        Args:
            tenant_id: Target tenant ID
            
        Returns:
            Tenant-scoped JWT token
            
        Raises:
            ValueError: If admin token not set
            requests.HTTPError: If switch fails
        """
        if not self.admin_token:
            raise ValueError("Admin token required for tenant switch")
        
        logger.info(f"Switching to tenant: {tenant_id}")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/admin/debug/switch-tenant",
                json={"targetTenantId": tenant_id},
                headers={
                    "Authorization": f"Bearer {self.admin_token}",
                    "Content-Type": "application/json",
                    "Idempotency-Key": f"switch-tenant-{int(__import__('time').time())}"
                },
                timeout=self.timeout
            )
            
            # Log response for debugging
            logger.debug(f"Switch tenant response status: {response.status_code}")
            logger.debug(f"Switch tenant response body: {response.text[:500]}")
            if response.status_code != 200:
                logger.warning(f"Switch tenant failed: {response.status_code} - {response.text[:200]}")
            
            response.raise_for_status()
        except requests.HTTPError as e:
            logger.error(f"HTTP error during tenant switch: {e.response.status_code} - {e.response.text[:200]}")
            raise
        except Exception as e:
            logger.error(f"Exception during tenant switch: {e}")
            raise
        
        data = response.json()
        # Extract token from response (try multiple paths - snake_case first for backend compatibility)
        token_data = data.get('data', {})
        self.tenant_token = (
            token_data.get('access_token') or  # Backend returns snake_case
            token_data.get('accessToken') or   # Fallback to camelCase
            data.get('access_token') or
            data.get('accessToken')
        )
        self.current_tenant_id = tenant_id
        
        if not self.tenant_token:
            raise ValueError(f"Tenant token not found in response. Keys: {list(token_data.keys())}")
        
        logger.info("✓ Tenant context switched")
        return self.tenant_token
    
    def affiliate_login(self, code: str, email: str) -> str:
        """Perform affiliate login.
        
        Args:
            code: Affiliate code
            email: Affiliate email
            
        Returns:
            Affiliate JWT token
            
        Raises:
            requests.HTTPError: If login fails
        """
        logger.info(f"Affiliate login: {code}")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/affiliates/auth/login",
                json={"code": code, "email": email},
                headers={
                    "Content-Type": "application/json",
                    "Idempotency-Key": f"aff-login-{int(__import__('time').time())}"
                },
                timeout=self.timeout
            )
            response.raise_for_status()
            
            data = response.json()
            self.affiliate_token = data.get('data', {}).get('token') or data.get('token')
            
            if self.affiliate_token:
                logger.info("✓ Affiliate authenticated")
                return self.affiliate_token
        except Exception as e:
            logger.warning(f"Affiliate login failed: {e}, using tenant token as fallback")
        
        # Fallback to tenant token
        self.affiliate_token = self.tenant_token
        return self.affiliate_token
    
    def get_token_for_endpoint(self, path: str) -> str:
        """Get appropriate auth token for endpoint path.
        
        Args:
            path: Endpoint path (e.g., "/api/admin/users")
            
        Returns:
            JWT token string
            
        Raises:
            ValueError: If required token not available
        """
        if path.startswith('/api/admin'):
            if not self.admin_token:
                raise ValueError("Admin token not available")
            return self.admin_token
        elif path.startswith('/api/affiliates'):
            if not self.affiliate_token:
                raise ValueError("Affiliate token not available")
            return self.affiliate_token
        elif path.startswith('/api'):
            if not self.tenant_token:
                raise ValueError("Tenant token not available")
            return self.tenant_token
        else:
            # Default to tenant token for non-/api paths
            if not self.tenant_token:
                raise ValueError("Tenant token not available")
            return self.tenant_token
    
    def get_effective_tenant_header(self, path: str) -> Optional[str]:
        """Get X-Effective-Tenant-Id header value for endpoint.
        
        Args:
            path: Endpoint path
            
        Returns:
            Tenant ID string or None
        """
        # Admin endpoints need tenant context for multi-tenant operations
        if path.startswith('/api/admin'):
            return self.current_tenant_id
        return None
