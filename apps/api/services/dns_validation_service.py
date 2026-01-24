"""DNS Validation Service for SPF, DKIM, DMARC records.

This service validates email authentication DNS records to ensure
proper deliverability and prevent spam classification.
"""

import logging
import re
from typing import Tuple

import dns.resolver
import dns.exception

logger = logging.getLogger(__name__)


class DNSValidationService:
    """Service for validating SPF, DKIM, and DMARC DNS records."""
    
    def __init__(self):
        """Initialize DNS validation service."""
        self.resolver = dns.resolver.Resolver()
        self.resolver.timeout = 5.0
        self.resolver.lifetime = 5.0
    
    def validate_spf(self, domain: str, server_ip: str) -> Tuple[bool, str]:
        """Validate SPF record exists and authorizes server IP.
        
        Args:
            domain: Email domain to check (e.g., "x-ear.com")
            server_ip: SMTP server IP address to verify authorization
            
        Returns:
            Tuple of (is_valid, message)
            - is_valid: True if SPF record exists and authorizes IP
            - message: Human-readable validation result or error message
            
        Example:
            >>> service = DNSValidationService()
            >>> is_valid, msg = service.validate_spf("x-ear.com", "1.2.3.4")
            >>> print(f"Valid: {is_valid}, Message: {msg}")
        """
        try:
            # Query TXT records for domain
            answers = self.resolver.resolve(domain, 'TXT')
            
            # Find SPF record (starts with "v=spf1")
            spf_records = []
            for rdata in answers:
                txt_string = rdata.to_text().strip('"')
                if txt_string.startswith('v=spf1'):
                    spf_records.append(txt_string)
            
            if not spf_records:
                return False, f"No SPF record found for {domain}. Add DNS TXT record: v=spf1 ip4:{server_ip} ~all"
            
            if len(spf_records) > 1:
                logger.warning(f"Multiple SPF records found for {domain} - this is invalid per RFC 7208")
                return False, f"Multiple SPF records found for {domain}. Only one SPF record is allowed per domain."
            
            spf_record = spf_records[0]
            logger.info(f"Found SPF record for {domain}: {spf_record}")
            
            # Check if server IP is authorized
            # Simple check for ip4: mechanism
            if f"ip4:{server_ip}" in spf_record:
                return True, f"SPF record found and authorizes {server_ip}"
            
            # Check for include: mechanisms (e.g., include:_spf.google.com)
            # Note: Full SPF validation requires recursive lookups, which is complex
            # For MVP, we just check if IP is explicitly listed
            if "include:" in spf_record:
                logger.info(f"SPF record contains include: mechanism - manual verification recommended")
                return True, f"SPF record found with include: mechanism. Verify {server_ip} is authorized by included domains."
            
            # Check for +all or ?all (permissive policies)
            if "+all" in spf_record or "?all" in spf_record:
                logger.warning(f"SPF record for {domain} has permissive policy (+all or ?all)")
                return True, f"SPF record found but has permissive policy. Consider using ~all or -all for better security."
            
            # IP not explicitly authorized
            return False, f"SPF record found but does not authorize {server_ip}. Add 'ip4:{server_ip}' to SPF record."
            
        except dns.resolver.NXDOMAIN:
            return False, f"Domain {domain} does not exist"
        
        except dns.resolver.NoAnswer:
            return False, f"No TXT records found for {domain}"
        
        except dns.resolver.Timeout:
            return False, f"DNS query timeout for {domain}. Check DNS server connectivity."
        
        except dns.exception.DNSException as e:
            logger.error(f"DNS error validating SPF for {domain}: {e}")
            return False, f"DNS error: {str(e)}"
        
        except Exception as e:
            logger.exception(f"Unexpected error validating SPF for {domain}")
            return False, f"Validation error: {str(e)}"
    
    def validate_dkim(self, domain: str, selector: str, public_key: str) -> Tuple[bool, str]:
        """Validate DKIM record exists and matches public key.
        
        Args:
            domain: Email domain (e.g., "x-ear.com")
            selector: DKIM selector (e.g., "default")
            public_key: Expected DKIM public key (base64-encoded, without headers)
            
        Returns:
            Tuple of (is_valid, message)
            
        Example:
            >>> service = DNSValidationService()
            >>> is_valid, msg = service.validate_dkim("x-ear.com", "default", "MIIBIjAN...")
        """
        try:
            # DKIM record is at: {selector}._domainkey.{domain}
            dkim_domain = f"{selector}._domainkey.{domain}"
            
            # Query TXT records
            answers = self.resolver.resolve(dkim_domain, 'TXT')
            
            # Find DKIM record (starts with "v=DKIM1")
            dkim_records = []
            for rdata in answers:
                txt_string = rdata.to_text().strip('"').replace('" "', '')  # Handle split TXT records
                if 'v=DKIM1' in txt_string or 'k=rsa' in txt_string:
                    dkim_records.append(txt_string)
            
            if not dkim_records:
                return False, f"No DKIM record found at {dkim_domain}. Add DNS TXT record with DKIM public key."
            
            dkim_record = dkim_records[0]
            logger.info(f"Found DKIM record at {dkim_domain}")
            
            # Extract public key from DKIM record (p= tag)
            match = re.search(r'p=([A-Za-z0-9+/=]+)', dkim_record)
            if not match:
                return False, f"DKIM record found but missing public key (p= tag)"
            
            dns_public_key = match.group(1)
            
            # Compare public keys (normalize whitespace)
            expected_key_normalized = public_key.replace('\n', '').replace(' ', '')
            dns_key_normalized = dns_public_key.replace('\n', '').replace(' ', '')
            
            if expected_key_normalized == dns_key_normalized:
                return True, f"DKIM record found and public key matches"
            else:
                return False, f"DKIM record found but public key does not match. Update DNS record with correct key."
            
        except dns.resolver.NXDOMAIN:
            return False, f"DKIM record not found at {dkim_domain}. Add DNS TXT record."
        
        except dns.resolver.NoAnswer:
            return False, f"No TXT records found at {dkim_domain}"
        
        except dns.resolver.Timeout:
            return False, f"DNS query timeout for {dkim_domain}"
        
        except dns.exception.DNSException as e:
            logger.error(f"DNS error validating DKIM for {dkim_domain}: {e}")
            return False, f"DNS error: {str(e)}"
        
        except Exception as e:
            logger.exception(f"Unexpected error validating DKIM for {dkim_domain}")
            return False, f"Validation error: {str(e)}"
    
    def validate_dmarc(self, domain: str) -> Tuple[bool, str]:
        """Validate DMARC policy record exists.
        
        Args:
            domain: Email domain (e.g., "x-ear.com")
            
        Returns:
            Tuple of (is_valid, message)
            
        Example:
            >>> service = DNSValidationService()
            >>> is_valid, msg = service.validate_dmarc("x-ear.com")
        """
        try:
            # DMARC record is at: _dmarc.{domain}
            dmarc_domain = f"_dmarc.{domain}"
            
            # Query TXT records
            answers = self.resolver.resolve(dmarc_domain, 'TXT')
            
            # Find DMARC record (starts with "v=DMARC1")
            dmarc_records = []
            for rdata in answers:
                txt_string = rdata.to_text().strip('"')
                if txt_string.startswith('v=DMARC1'):
                    dmarc_records.append(txt_string)
            
            if not dmarc_records:
                return False, f"No DMARC record found at {dmarc_domain}. Add DNS TXT record: v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@{domain}"
            
            if len(dmarc_records) > 1:
                logger.warning(f"Multiple DMARC records found for {domain}")
                return False, f"Multiple DMARC records found at {dmarc_domain}. Only one DMARC record is allowed."
            
            dmarc_record = dmarc_records[0]
            logger.info(f"Found DMARC record for {domain}: {dmarc_record}")
            
            # Extract policy (p= tag)
            policy_match = re.search(r'p=(none|quarantine|reject)', dmarc_record)
            if not policy_match:
                return False, f"DMARC record found but missing or invalid policy (p= tag)"
            
            policy = policy_match.group(1)
            
            # Check for reporting addresses (rua= tag)
            if 'rua=' not in dmarc_record:
                logger.warning(f"DMARC record for {domain} missing aggregate report address (rua=)")
                return True, f"DMARC record found with policy={policy}, but missing rua= for reports. Add rua=mailto:dmarc-reports@{domain}"
            
            # Validate policy strength
            if policy == 'none':
                return True, f"DMARC record found with policy=none (monitoring only). Consider upgrading to p=quarantine or p=reject for better protection."
            elif policy == 'quarantine':
                return True, f"DMARC record found with policy=quarantine (recommended for production)"
            else:  # reject
                return True, f"DMARC record found with policy=reject (strongest protection)"
            
        except dns.resolver.NXDOMAIN:
            return False, f"DMARC record not found at {dmarc_domain}. Add DNS TXT record."
        
        except dns.resolver.NoAnswer:
            return False, f"No TXT records found at {dmarc_domain}"
        
        except dns.resolver.Timeout:
            return False, f"DNS query timeout for {dmarc_domain}"
        
        except dns.exception.DNSException as e:
            logger.error(f"DNS error validating DMARC for {dmarc_domain}: {e}")
            return False, f"DNS error: {str(e)}"
        
        except Exception as e:
            logger.exception(f"Unexpected error validating DMARC for {dmarc_domain}")
            return False, f"Validation error: {str(e)}"
    
    def get_dns_setup_instructions(
        self, 
        domain: str, 
        server_ip: str, 
        dkim_selector: str,
        dkim_public_key: str
    ) -> dict:
        """Generate DNS record templates for admin panel.
        
        Args:
            domain: Email domain
            server_ip: SMTP server IP
            dkim_selector: DKIM selector
            dkim_public_key: DKIM public key (base64, without headers)
            
        Returns:
            Dict with DNS record templates and instructions
        """
        return {
            "spf": {
                "record_type": "TXT",
                "hostname": domain,
                "value": f"v=spf1 ip4:{server_ip} ~all",
                "instructions": f"Add this TXT record to {domain} in your DNS provider",
                "notes": "~all means soft fail (recommended for testing). Use -all for strict policy."
            },
            "dkim": {
                "record_type": "TXT",
                "hostname": f"{dkim_selector}._domainkey.{domain}",
                "value": f"v=DKIM1; k=rsa; p={dkim_public_key}",
                "instructions": f"Add this TXT record to {dkim_selector}._domainkey.{domain}",
                "notes": "Public key must match the private key used for signing"
            },
            "dmarc": {
                "record_type": "TXT",
                "hostname": f"_dmarc.{domain}",
                "value": f"v=DMARC1; p=quarantine; rua=mailto:dmarc-reports@{domain}; pct=100; adkim=s; aspf=s",
                "instructions": f"Add this TXT record to _dmarc.{domain}",
                "notes": "p=quarantine is recommended. Use p=reject for strictest policy."
            }
        }
