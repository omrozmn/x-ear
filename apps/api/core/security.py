"""
Centralized JWT Security Configuration
=======================================
Single source of truth for JWT secret and algorithm.
All modules MUST import from here instead of using inline os.getenv().
"""
import os
import logging

logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    """Get JWT secret key. Raises ValueError in production if not set."""
    secret = os.getenv('JWT_SECRET_KEY')
    if secret:
        return secret

    env = os.getenv('ENVIRONMENT', 'development').lower()
    if env in ('production', 'prod', 'staging'):
        raise ValueError(
            "CRITICAL: JWT_SECRET_KEY environment variable must be set in production! "
            "Generate a secure key with: python -c \"import secrets; print(secrets.token_hex(32))\""
        )

    logger.warning("Using development JWT key fallback. Set JWT_SECRET_KEY in production!")
    return 'default-dev-secret-key-change-in-prod'
