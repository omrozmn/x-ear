"""
Email Service for sending emails via SMTP
"""
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import os
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails"""
    
    def __init__(self):
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', 587))
        self.smtp_user = os.getenv('SMTP_USER', '')
        self.smtp_pass = os.getenv('SMTP_PASS', '')
        self.default_from_email = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@x-ear.com')
        self.default_from_name = os.getenv('DEFAULT_FROM_NAME', 'X-Ear CRM')
    
    def send_email(
        self,
        to: List[str] | str,
        subject: str,
        body_html: str,
        body_text: Optional[str] = None,
        from_name: Optional[str] = None,
        from_email: Optional[str] = None,
        attachments: Optional[List[Dict]] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None
    ) -> bool:
        """
        Send an email
        
        Args:
            to: Recipient email(s)
            subject: Email subject
            body_html: HTML body
            body_text: Plain text body (fallback)
            from_name: Sender name
            from_email: Sender email
            attachments: List of dicts with 'filename', 'content_type', 'data' keys
            cc: CC recipients
            bcc: BCC recipients
            
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            # Normalize recipients
            if isinstance(to, str):
                to = [to]
            
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{from_name or self.default_from_name} <{from_email or self.default_from_email}>"
            msg['To'] = ', '.join(to)
            
            if cc:
                msg['Cc'] = ', '.join(cc)
            
            # Add text part
            if body_text:
                part1 = MIMEText(body_text, 'plain', 'utf-8')
                msg.attach(part1)
            
            # Add HTML part
            if body_html:
                part2 = MIMEText(body_html, 'html', 'utf-8')
                msg.attach(part2)
            
            # Add attachments
            if attachments:
                for attachment in attachments:
                    part = MIMEBase('application', 'octet-stream')
                    part.set_payload(attachment['data'])
                    encoders.encode_base64(part)
                    part.add_header(
                        'Content-Disposition',
                        f"attachment; filename= {attachment['filename']}"
                    )
                    msg.attach(part)
            
            # Prepare all recipients for SMTP
            all_recipients = to.copy()
            if cc:
                all_recipients.extend(cc)
            if bcc:
                all_recipients.extend(bcc)
            
            # Send email
            if not self.smtp_user or not self.smtp_pass:
                logger.warning("SMTP credentials not configured, email not sent (mock mode)")
                logger.info(f"[MOCK EMAIL] To: {to}, Subject: {subject}")
                return True  # Mock success in development
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_pass)
                server.sendmail(
                    from_email or self.default_from_email,
                    all_recipients,
                    msg.as_string()
                )
            
            logger.info(f"Email sent successfully to {to}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    def send_template_email(
        self,
        to: List[str] | str,
        template: 'NotificationTemplate',
        context: Dict
    ) -> bool:
        """Send email using a template with variable substitution"""
        try:
            # Render template
            subject = self._render_template(template.email_subject, context)
            body_html = self._render_template(template.email_body_html, context)
            body_text = self._render_template(template.email_body_text, context) if template.email_body_text else None
            
            return self.send_email(
                to=to,
                subject=subject,
                body_html=body_html,
                body_text=body_text,
                from_name=template.email_from_name,
                from_email=template.email_from_address
            )
        except Exception as e:
            logger.error(f"Failed to send template email: {e}")
            return False
    
    def _render_template(self, template_str: str, context: Dict) -> str:
        """Replace {{variable}} with actual values"""
        if not template_str:
            return ''
        
        import re
        
        def replacer(match):
            key = match.group(1)
            return str(context.get(key, f"{{{{{key}}}}}"))
        
        return re.sub(r'\{\{(\w+)\}\}', replacer, template_str)


# Global email service instance
email_service = EmailService()
