"""
reCAPTCHA v3 verification utility

Validates reCAPTCHA tokens with Google's API to prevent bot abuse.
"""
import os
import logging
import httpx
from typing import Dict, Any

logger = logging.getLogger(__name__)

RECAPTCHA_SECRET_KEY = os.getenv('RECAPTCHA_SECRET_KEY', '')
RECAPTCHA_VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify'
RECAPTCHA_MIN_SCORE = float(os.getenv('RECAPTCHA_MIN_SCORE', '0.5'))


async def verify_recaptcha_token(token: str, action: str = 'password_reset') -> Dict[str, Any]:
    """
    Verify reCAPTCHA v3 token with Google's API.
    
    Args:
        token: The reCAPTCHA token from the frontend
        action: The expected action name (should match frontend action)
    
    Returns:
        Dict with verification result:
        {
            'success': bool,
            'score': float (0.0 to 1.0),
            'action': str,
            'challenge_ts': str,
            'hostname': str,
            'error_codes': list (if failed)
        }
    
    Raises:
        Exception: If verification request fails
    """
    if not RECAPTCHA_SECRET_KEY:
        logger.warning('RECAPTCHA_SECRET_KEY not configured - skipping verification')
        return {
            'success': True,
            'score': 1.0,
            'action': action,
            'bypass': True
        }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                RECAPTCHA_VERIFY_URL,
                data={
                    'secret': RECAPTCHA_SECRET_KEY,
                    'response': token
                },
                timeout=5.0
            )
            
            result = response.json()
            
            # Log verification result
            logger.info(
                f"reCAPTCHA verification: success={result.get('success')}, "
                f"score={result.get('score')}, action={result.get('action')}"
            )
            
            return result
            
    except Exception as e:
        logger.error(f"reCAPTCHA verification failed: {e}")
        raise


def is_valid_recaptcha(verification_result: Dict[str, Any], expected_action: str = 'password_reset') -> bool:
    """
    Check if reCAPTCHA verification result is valid.
    
    Args:
        verification_result: Result from verify_recaptcha_token()
        expected_action: Expected action name
    
    Returns:
        True if verification passed all checks, False otherwise
    """
    # If bypass mode (no secret key configured), allow
    if verification_result.get('bypass'):
        return True
    
    # Check if verification succeeded
    if not verification_result.get('success'):
        logger.warning(f"reCAPTCHA verification failed: {verification_result.get('error-codes')}")
        return False
    
    # Check if action matches
    if verification_result.get('action') != expected_action:
        logger.warning(
            f"reCAPTCHA action mismatch: expected={expected_action}, "
            f"got={verification_result.get('action')}"
        )
        return False
    
    # Check if score meets minimum threshold
    score = verification_result.get('score', 0.0)
    if score < RECAPTCHA_MIN_SCORE:
        logger.warning(f"reCAPTCHA score too low: {score} < {RECAPTCHA_MIN_SCORE}")
        return False
    
    return True
