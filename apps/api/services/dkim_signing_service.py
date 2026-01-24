"""DKIM Signing Service for Email Authentication.

This service signs outgoing emails with DKIM (DomainKeys Identified Mail) signatures
to prove email authenticity and improve deliverability.

DKIM signing is CRITICAL for production email delivery:
- Prevents emails from being marked as spam
- Proves domain ownership
- Required by Gmail, Outlook, Yahoo for inbox delivery
"""

import os
import logging
import base64
from typing import Tuple, Optional
from email.message import EmailMessage
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
import dkim

logger = logging.getLogger(__name__)


class DKIMSigningService:
    """Service for DKIM email signing with RSA-2048 keys."""
    
    def __init__(self):
        """Initialize DKIM signing service."""
        self.selector = os.getenv("DKIM_SELECTOR", "default")
        self.key_size = 2048  # RSA key size (industry standard)
    
    def generate_keypair(self) -> Tuple[str, str]:
        """Generate 2048-bit RSA key pair for DKIM.
        
        Generates a new RSA-2048 key pair for DKIM signing. The private key
        should be stored securely (environment variable or secrets manager).
        The public key should be published in DNS TXT record.
        
        Returns:
            Tuple[str, str]: (private_key_pem, public_key_base64)
                - private_key_pem: PEM-encoded private key (store in DKIM_PRIVATE_KEY env)
                - public_key_base64: Base64-encoded public key (publish in DNS)
                
        Example:
            >>> service = DKIMSigningService()
            >>> private_key, public_key = service.generate_keypair()
            >>> # Store private_key in DKIM_PRIVATE_KEY environment variable
            >>> # Publish public_key in DNS: default._domainkey.example.com TXT "v=DKIM1; k=rsa; p={public_key}"
        """
        # Generate RSA-2048 private key
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=self.key_size,
            backend=default_backend()
        )
        
        # Serialize private key to PEM format
        private_key_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        # Extract public key
        public_key = private_key.public_key()
        
        # Serialize public key to DER format (for DKIM DNS record)
        public_key_der = public_key.public_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        
        # Base64 encode public key (for DNS TXT record)
        public_key_base64 = base64.b64encode(public_key_der).decode('utf-8')
        
        logger.info("Generated new DKIM RSA-2048 key pair")
        
        return private_key_pem, public_key_base64
    
    def load_private_key(self, domain: str) -> Optional[bytes]:
        """Load DKIM private key from environment.
        
        Loads the DKIM private key from DKIM_PRIVATE_KEY environment variable.
        If not found, logs warning and returns None (degraded mode - emails
        will be sent without DKIM signature).
        
        Args:
            domain: Email domain (for logging purposes)
            
        Returns:
            Optional[bytes]: Private key bytes, or None if not configured
            
        Example:
            >>> service = DKIMSigningService()
            >>> private_key = service.load_private_key("example.com")
            >>> if private_key:
            ...     # Sign email
            ... else:
            ...     # Send without DKIM (degraded mode)
        """
        private_key_pem = os.getenv("DKIM_PRIVATE_KEY")
        
        if not private_key_pem:
            logger.warning(
                "DKIM private key not configured - emails will be sent without DKIM signature",
                extra={"domain": domain}
            )
            return None
        
        try:
            # Convert PEM string to bytes
            return private_key_pem.encode('utf-8')
        except Exception as e:
            logger.error(
                "Failed to load DKIM private key",
                extra={"domain": domain, "error": str(e)}
            )
            return None
    
    def sign_email(
        self,
        message: EmailMessage,
        domain: str,
        selector: Optional[str] = None
    ) -> EmailMessage:
        """Sign email with DKIM signature.
        
        Adds DKIM-Signature header to email message. The signature covers
        critical headers (From, To, Subject, Date, Message-ID) and the
        message body.
        
        If DKIM private key is not configured, returns the message unchanged
        and logs a warning (degraded mode).
        
        Args:
            message: Email message to sign
            domain: Sending domain (e.g., "example.com")
            selector: DKIM selector (default: from DKIM_SELECTOR env or "default")
            
        Returns:
            EmailMessage: Signed email message with DKIM-Signature header
            
        Example:
            >>> from email.message import EmailMessage
            >>> msg = EmailMessage()
            >>> msg['From'] = 'info@example.com'
            >>> msg['To'] = 'user@example.com'
            >>> msg['Subject'] = 'Test Email'
            >>> msg.set_content('Hello, World!')
            >>> 
            >>> service = DKIMSigningService()
            >>> signed_msg = service.sign_email(msg, "example.com")
            >>> # signed_msg now has DKIM-Signature header
        """
        # Use provided selector or default
        if selector is None:
            selector = self.selector
        
        # Load private key
        private_key = self.load_private_key(domain)
        
        if not private_key:
            # Degraded mode - send without DKIM
            logger.warning(
                "Sending email without DKIM signature (degraded mode)",
                extra={"domain": domain, "selector": selector}
            )
            return message
        
        try:
            # Convert EmailMessage to bytes for DKIM signing
            message_bytes = message.as_bytes()
            
            # Sign with DKIM
            # Headers to sign: From, To, Subject, Date, Message-ID
            signature = dkim.sign(
                message=message_bytes,
                selector=selector.encode('utf-8'),
                domain=domain.encode('utf-8'),
                privkey=private_key,
                include_headers=[
                    b'from',
                    b'to',
                    b'subject',
                    b'date',
                    b'message-id'
                ]
            )
            
            # Parse the signed message to extract DKIM-Signature header
            # dkim.sign() returns the full message with DKIM-Signature prepended
            from email import message_from_bytes
            signed_msg = message_from_bytes(signature)
            
            # Get DKIM-Signature header from signed message
            if 'DKIM-Signature' in signed_msg:
                dkim_sig = signed_msg['DKIM-Signature']
                # Remove newlines and extra whitespace from signature
                # DKIM signatures can be multi-line, but EmailMessage doesn't allow newlines in headers
                # We need to join the lines with a space
                dkim_sig_clean = ' '.join(dkim_sig.split())
                # Add signature to original message
                message['DKIM-Signature'] = dkim_sig_clean
            
            logger.info(
                "Email signed with DKIM",
                extra={
                    "domain": domain,
                    "selector": selector,
                    "from": message.get('From'),
                    "to": message.get('To')
                }
            )
            
            return message
            
        except Exception as e:
            logger.error(
                "Failed to sign email with DKIM - sending without signature",
                extra={
                    "domain": domain,
                    "selector": selector,
                    "error": str(e),
                    "error_type": type(e).__name__
                },
                exc_info=True
            )
            # Return unsigned message (degraded mode)
            return message
    
    def verify_signature(
        self,
        message: EmailMessage,
        domain: str,
        public_key_base64: Optional[str] = None
    ) -> Tuple[bool, str]:
        """Verify DKIM signature on received email.
        
        This method is primarily for testing purposes. In production,
        receiving mail servers verify DKIM signatures.
        
        Args:
            message: Email message with DKIM-Signature header
            domain: Expected signing domain
            public_key_base64: Optional public key for testing (bypasses DNS lookup)
            
        Returns:
            Tuple[bool, str]: (is_valid, message)
                - is_valid: True if signature is valid
                - message: Validation result message
                
        Example:
            >>> service = DKIMSigningService()
            >>> is_valid, msg = service.verify_signature(signed_email, "example.com")
            >>> if is_valid:
            ...     print("DKIM signature is valid")
        """
        try:
            # Convert EmailMessage to bytes
            message_bytes = message.as_bytes()
            
            if public_key_base64:
                # For testing: use provided public key instead of DNS lookup
                # Create a mock DNS resolver that returns our public key
                def dnsfunc(name, timeout=5):
                    # Return DKIM TXT record with our public key as bytes
                    record = f"v=DKIM1; k=rsa; p={public_key_base64}"
                    return record.encode('utf-8')
                
                # Verify DKIM signature with custom DNS function
                is_valid = dkim.verify(message_bytes, dnsfunc=dnsfunc)
            else:
                # Verify DKIM signature with real DNS lookup
                is_valid = dkim.verify(message_bytes)
            
            if is_valid:
                return True, f"DKIM signature is valid for domain {domain}"
            else:
                return False, f"DKIM signature verification failed for domain {domain}"
                
        except Exception as e:
            logger.error(
                "Error verifying DKIM signature",
                extra={"domain": domain, "error": str(e)}
            )
            return False, f"DKIM verification error: {str(e)}"


# Dependency injection helper
def get_dkim_signing_service() -> DKIMSigningService:
    """
    Get DKIMSigningService instance for dependency injection.
    
    Returns:
        DKIMSigningService: Service instance
        
    Example:
        service = get_dkim_signing_service()
        signed_message = service.sign_email(message, "example.com")
    """
    return DKIMSigningService()
