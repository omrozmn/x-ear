"""
Communication Service Providers
Handles SMS and Email sending with proper error handling and provider abstraction
"""
import os
import logging
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)

def now_utc():
    """Return current UTC timestamp"""
    return datetime.now(timezone.utc)

# ============================================================================
# ABSTRACT BASE CLASSES
# ============================================================================

class CommunicationProvider(ABC):
    """Abstract base class for communication providers"""
    
    @abstractmethod
    def send(self, **kwargs) -> Dict[str, Any]:
        """Send message and return result"""
        pass
    
    @abstractmethod
    def get_status(self, message_id: str) -> Dict[str, Any]:
        """Get message status"""
        pass
    
    @abstractmethod
    def is_configured(self) -> bool:
        """Check if provider is properly configured"""
        pass


class SMSProvider(CommunicationProvider):
    """Abstract SMS provider"""
    
    @abstractmethod
    def send_sms(self, phone_number: str, message: str, **kwargs) -> Dict[str, Any]:
        """Send SMS message"""
        pass


class EmailProvider(CommunicationProvider):
    """Abstract Email provider"""
    
    @abstractmethod
    def send_email(self, to_email: str, subject: str, body_text: str, 
                   body_html: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Send Email message"""
        pass


# ============================================================================
# SMS PROVIDERS
# ============================================================================

class VatanSMSProvider(SMSProvider):
    """VatanSMS provider implementation"""
    
    def __init__(self):
        self.api_url = 'https://api.vatansms.net/api/v1/1toN' # Keep this for general SMS if needed, but we'll use specific endpoints
        self.otp_url = 'https://api.vatansms.net/api/v1/otp'
        
    def _get_credentials(self):
        """Get credentials from DB settings or environment"""
        try:
            from models.system import Settings
            settings = Settings.get_system_settings()
            
            username = settings.get_setting('smsUsername') or os.getenv('VATANSMS_USERNAME', '4ab531b6fd26fd9ba6010b0d')
            password = settings.get_setting('smsPassword') or os.getenv('VATANSMS_PASSWORD', '49b2001edbb1789e4e62f935')
            sender = settings.get_setting('smsHeader') or os.getenv('VATANSMS_SENDER', 'OZMN TIBCHZ')
            
            return username, password, sender
        except Exception as e:
            logger.warning(f"Could not fetch settings from DB: {e}")
            # Fallback to env with hardcoded defaults from legacy script
            return (
                os.getenv('VATANSMS_USERNAME', '4ab531b6fd26fd9ba6010b0d'),
                os.getenv('VATANSMS_PASSWORD', '49b2001edbb1789e4e62f935'),
                os.getenv('VATANSMS_SENDER', 'OZMN TIBCHZ')
            )
    
    def is_configured(self) -> bool:
        """Check if VatanSMS is properly configured"""
        username, password, _ = self._get_credentials()
        return bool(username and password)
    
    def send_sms(self, phone_number: str, message: str, **kwargs) -> Dict[str, Any]:
        """Send SMS via VatanSMS"""
        try:
            username, password, sender = self._get_credentials()
            
            if not username or not password:
                return {
                    'success': False,
                    'error': 'VatanSMS not configured',
                    'provider': 'vatansms'
                }
            
            # Clean phone number
            clean_phone = self._clean_phone_number(phone_number)
            
            # Use OTP endpoint structure which is proven to work
            payload = {
                "api_id": username,
                "api_key": password,
                "sender": sender,
                "message_type": "turkce",
                "message": message,
                "phones": [clean_phone]
            }
            
            response = requests.post(
                self.otp_url,
                json=payload, # Use json parameter for automatic Content-Type header
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('status') == 'success' or result.get('success'):
                    return {
                        'success': True,
                        'message_id': result.get('id'),
                        'provider': 'vatansms',
                        'provider_response': result,
                        'sent_at': now_utc().isoformat()
                    }
                else:
                    return {
                        'success': False,
                        'error': result.get('message', 'Unknown error'),
                        'provider': 'vatansms',
                        'provider_response': result
                    }
            else:
                return {
                    'success': False,
                    'error': f'HTTP {response.status_code}: {response.text}',
                    'provider': 'vatansms'
                }
                
        except requests.RequestException as e:
            logger.error(f"VatanSMS request error: {e}")
            return {
                'success': False,
                'error': f'Network error: {str(e)}',
                'provider': 'vatansms'
            }
        except Exception as e:
            logger.error(f"VatanSMS unexpected error: {e}")
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'provider': 'vatansms'
            }
    
    def send(self, **kwargs) -> Dict[str, Any]:
        """Generic send method"""
        return self.send_sms(
            phone_number=kwargs.get('phone_number'),
            message=kwargs.get('message'),
            **kwargs
        )
    
    def get_status(self, message_id: str) -> Dict[str, Any]:
        """Get SMS status from VatanSMS"""
        try:
            # VatanSMS status endpoint (if available)
            # This is a placeholder - implement based on actual API
            return {
                'success': True,
                'status': 'delivered',  # or 'pending', 'failed'
                'provider': 'vatansms'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'provider': 'vatansms'
            }
    
    def _clean_phone_number(self, phone: str) -> str:
        """Clean and format phone number for VatanSMS"""
        # Remove all non-digit characters
        clean = ''.join(filter(str.isdigit, phone))
        
        # Handle Turkish phone numbers
        if clean.startswith('90'):
            return clean
        elif clean.startswith('0'):
            return '90' + clean[1:]
        elif len(clean) == 10:
            return '90' + clean
        else:
            return clean


class MockSMSProvider(SMSProvider):
    """Mock SMS provider for testing"""
    
    def is_configured(self) -> bool:
        return True
    
    def send_sms(self, phone_number: str, message: str, **kwargs) -> Dict[str, Any]:
        """Mock SMS sending"""
        logger.info(f"Mock SMS to {phone_number}: {message}")
        return {
            'success': True,
            'message_id': f'mock_{now_utc().timestamp()}',
            'provider': 'mock',
            'sent_at': now_utc().isoformat()
        }
    
    def send(self, **kwargs) -> Dict[str, Any]:
        return self.send_sms(
            phone_number=kwargs.get('phone_number'),
            message=kwargs.get('message'),
            **kwargs
        )
    
    def get_status(self, message_id: str) -> Dict[str, Any]:
        return {
            'success': True,
            'status': 'delivered',
            'provider': 'mock'
        }


# ============================================================================
# EMAIL PROVIDERS
# ============================================================================

class SMTPEmailProvider(EmailProvider):
    """SMTP Email provider"""
    
    def __init__(self):
        self.smtp_server = os.getenv('SMTP_SERVER')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_username = os.getenv('SMTP_USERNAME')
        self.smtp_password = os.getenv('SMTP_PASSWORD')
        self.smtp_use_tls = os.getenv('SMTP_USE_TLS', 'true').lower() == 'true'
        self.from_email = os.getenv('SMTP_FROM_EMAIL', 'noreply@x-ear.com')
        self.from_name = os.getenv('SMTP_FROM_NAME', 'X-Ear CRM')
    
    def is_configured(self) -> bool:
        """Check if SMTP is properly configured"""
        return bool(self.smtp_server and self.smtp_username and self.smtp_password)
    
    def send_email(self, to_email: str, subject: str, body_text: str, 
                   body_html: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Send email via SMTP"""
        try:
            if not self.is_configured():
                return {
                    'success': False,
                    'error': 'SMTP not configured',
                    'provider': 'smtp'
                }
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Add CC and BCC if provided
            cc_emails = kwargs.get('cc_emails', [])
            bcc_emails = kwargs.get('bcc_emails', [])
            
            if cc_emails:
                msg['Cc'] = ', '.join(cc_emails)
            
            # Attach text part
            text_part = MIMEText(body_text, 'plain', 'utf-8')
            msg.attach(text_part)
            
            # Attach HTML part if provided
            if body_html:
                html_part = MIMEText(body_html, 'html', 'utf-8')
                msg.attach(html_part)
            
            # Handle attachments
            attachments = kwargs.get('attachments', [])
            for attachment in attachments:
                self._add_attachment(msg, attachment)
            
            # Send email
            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                if self.smtp_use_tls:
                    server.starttls()
                
                server.login(self.smtp_username, self.smtp_password)
                
                # Prepare recipient list
                recipients = [to_email] + cc_emails + bcc_emails
                
                server.send_message(msg, to_addrs=recipients)
            
            return {
                'success': True,
                'message_id': msg['Message-ID'],
                'provider': 'smtp',
                'sent_at': now_utc().isoformat()
            }
            
        except smtplib.SMTPException as e:
            logger.error(f"SMTP error: {e}")
            return {
                'success': False,
                'error': f'SMTP error: {str(e)}',
                'provider': 'smtp'
            }
        except Exception as e:
            logger.error(f"Email sending error: {e}")
            return {
                'success': False,
                'error': f'Unexpected error: {str(e)}',
                'provider': 'smtp'
            }
    
    def send(self, **kwargs) -> Dict[str, Any]:
        """Generic send method"""
        return self.send_email(
            to_email=kwargs.get('to_email'),
            subject=kwargs.get('subject'),
            body_text=kwargs.get('body_text'),
            body_html=kwargs.get('body_html'),
            **kwargs
        )
    
    def get_status(self, message_id: str) -> Dict[str, Any]:
        """Get email status (SMTP doesn't provide delivery status)"""
        return {
            'success': True,
            'status': 'sent',  # SMTP only confirms sending, not delivery
            'provider': 'smtp'
        }
    
    def _add_attachment(self, msg: MIMEMultipart, attachment: Dict[str, Any]):
        """Add attachment to email message"""
        try:
            filename = attachment.get('filename')
            content = attachment.get('content')  # Base64 encoded content
            content_type = attachment.get('content_type', 'application/octet-stream')
            
            if not filename or not content:
                return
            
            # Decode base64 content
            import base64
            file_data = base64.b64decode(content)
            
            # Create attachment
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(file_data)
            encoders.encode_base64(part)
            part.add_header(
                'Content-Disposition',
                f'attachment; filename= {filename}'
            )
            
            msg.attach(part)
            
        except Exception as e:
            logger.error(f"Error adding attachment {filename}: {e}")


class MockEmailProvider(EmailProvider):
    """Mock Email provider for testing"""
    
    def is_configured(self) -> bool:
        return True
    
    def send_email(self, to_email: str, subject: str, body_text: str, 
                   body_html: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Mock email sending"""
        logger.info(f"Mock Email to {to_email}: {subject}")
        return {
            'success': True,
            'message_id': f'mock_email_{now_utc().timestamp()}',
            'provider': 'mock',
            'sent_at': now_utc().isoformat()
        }
    
    def send(self, **kwargs) -> Dict[str, Any]:
        return self.send_email(
            to_email=kwargs.get('to_email'),
            subject=kwargs.get('subject'),
            body_text=kwargs.get('body_text'),
            body_html=kwargs.get('body_html'),
            **kwargs
        )
    
    def get_status(self, message_id: str) -> Dict[str, Any]:
        return {
            'success': True,
            'status': 'delivered',
            'provider': 'mock'
        }


# ============================================================================
# COMMUNICATION SERVICE MANAGER
# ============================================================================

class CommunicationService:
    """Main communication service that manages providers"""
    
    def __init__(self):
        self.sms_providers = {
            'vatansms': VatanSMSProvider(),
            'mock': MockSMSProvider()
        }
        
        self.email_providers = {
            'smtp': SMTPEmailProvider(),
            'mock': MockEmailProvider()
        }
        
        # Default providers
        self.default_sms_provider = os.getenv('DEFAULT_SMS_PROVIDER', 'vatansms')
        self.default_email_provider = os.getenv('DEFAULT_EMAIL_PROVIDER', 'smtp')
    
    def send_sms(self, phone_number: str, message: str, provider: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Send SMS using specified or default provider"""
        provider_name = provider or self.default_sms_provider
        
        if provider_name not in self.sms_providers:
            return {
                'success': False,
                'error': f'SMS provider "{provider_name}" not found',
                'available_providers': list(self.sms_providers.keys())
            }
        
        sms_provider = self.sms_providers[provider_name]
        
        if not sms_provider.is_configured():
            # Fallback to mock provider
            logger.warning(f"SMS provider {provider_name} not configured, falling back to mock")
            sms_provider = self.sms_providers['mock']
        
        return sms_provider.send_sms(phone_number, message, **kwargs)
    
    def send_email(self, to_email: str, subject: str, body_text: str, 
                   body_html: Optional[str] = None, provider: Optional[str] = None, **kwargs) -> Dict[str, Any]:
        """Send Email using specified or default provider"""
        provider_name = provider or self.default_email_provider
        
        if provider_name not in self.email_providers:
            return {
                'success': False,
                'error': f'Email provider "{provider_name}" not found',
                'available_providers': list(self.email_providers.keys())
            }
        
        email_provider = self.email_providers[provider_name]
        
        if not email_provider.is_configured():
            # Fallback to mock provider
            logger.warning(f"Email provider {provider_name} not configured, falling back to mock")
            email_provider = self.email_providers['mock']
        
        return email_provider.send_email(to_email, subject, body_text, body_html, **kwargs)
    
    def get_sms_status(self, message_id: str, provider: Optional[str] = None) -> Dict[str, Any]:
        """Get SMS status"""
        provider_name = provider or self.default_sms_provider
        
        if provider_name not in self.sms_providers:
            return {
                'success': False,
                'error': f'SMS provider "{provider_name}" not found'
            }
        
        return self.sms_providers[provider_name].get_status(message_id)
    
    def get_email_status(self, message_id: str, provider: Optional[str] = None) -> Dict[str, Any]:
        """Get Email status"""
        provider_name = provider or self.default_email_provider
        
        if provider_name not in self.email_providers:
            return {
                'success': False,
                'error': f'Email provider "{provider_name}" not found'
            }
        
        return self.email_providers[provider_name].get_status(message_id)
    
    def get_provider_status(self) -> Dict[str, Any]:
        """Get status of all providers"""
        return {
            'sms_providers': {
                name: provider.is_configured() 
                for name, provider in self.sms_providers.items()
            },
            'email_providers': {
                name: provider.is_configured() 
                for name, provider in self.email_providers.items()
            },
            'default_sms_provider': self.default_sms_provider,
            'default_email_provider': self.default_email_provider
        }


# Global service instance
communication_service = CommunicationService()