"""Email Scenario Service for integrating email sending into business flows"""

import logging
from typing import Dict, Optional
from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from services.email_service import EmailService
from services.smtp_config_service import SMTPConfigService
from services.email_template_service import EmailTemplateService
from services.encryption_service import EncryptionService

logger = logging.getLogger(__name__)


class EmailScenarioService:
    """Service for triggering email scenarios from business flows."""
    
    def __init__(self, db: Session):
        self.db = db
        self.encryption_service = EncryptionService()
        self.smtp_config_service = SMTPConfigService(db, self.encryption_service)
        self.template_service = EmailTemplateService()
        self.email_service = EmailService(db, self.smtp_config_service, self.template_service)
    
    def send_password_reset_email(
        self,
        background_tasks: BackgroundTasks,
        recipient: str,
        user_name: str,
        reset_link: str,
        tenant_id: str,
        language: str = "tr",
        expires_in_hours: int = 1
    ):
        """Send password reset email."""
        try:
            variables = {
                "user_name": user_name,
                "reset_link": reset_link,
                "expires_in_hours": str(expires_in_hours)
            }
            
            email_log_id = self.email_service.queue_email(
                scenario="password_reset",
                recipient=recipient,
                variables=variables,
                tenant_id=tenant_id,
                language=language
            )
            
            background_tasks.add_task(
                self.email_service.send_email_task,
                tenant_id=tenant_id,
                email_log_id=email_log_id,
                scenario="password_reset",
                recipient=recipient,
                variables=variables,
                language=language
            )
            
            logger.info(f"Password reset email queued for {recipient}")
            
        except Exception as e:
            logger.error(f"Failed to queue password reset email: {e}")
            # Don't raise - email failures should not block password reset flow
    
    def send_user_invite_email(
        self,
        background_tasks: BackgroundTasks,
        recipient: str,
        inviter_name: str,
        organization_name: str,
        invitation_link: str,
        role_name: str,
        tenant_id: str,
        language: str = "tr"
    ):
        """Send user invitation email."""
        try:
            variables = {
                "inviter_name": inviter_name,
                "organization_name": organization_name,
                "invitation_link": invitation_link,
                "role_name": role_name
            }
            
            email_log_id = self.email_service.queue_email(
                scenario="user_invite",
                recipient=recipient,
                variables=variables,
                tenant_id=tenant_id,
                language=language
            )
            
            background_tasks.add_task(
                self.email_service.send_email_task,
                tenant_id=tenant_id,
                email_log_id=email_log_id,
                scenario="user_invite",
                recipient=recipient,
                variables=variables,
                language=language
            )
            
            logger.info(f"User invite email queued for {recipient}")
            
        except Exception as e:
            logger.error(f"Failed to queue user invite email: {e}")
            # Don't raise - email failures should not block user creation
    
    def send_email_verification_email(
        self,
        background_tasks: BackgroundTasks,
        recipient: str,
        user_name: str,
        verification_link: str,
        tenant_id: str,
        language: str = "tr"
    ):
        """Send email verification email."""
        try:
            variables = {
                "user_name": user_name,
                "verification_link": verification_link
            }
            
            email_log_id = self.email_service.queue_email(
                scenario="email_verification",
                recipient=recipient,
                variables=variables,
                tenant_id=tenant_id,
                language=language
            )
            
            background_tasks.add_task(
                self.email_service.send_email_task,
                tenant_id=tenant_id,
                email_log_id=email_log_id,
                scenario="email_verification",
                recipient=recipient,
                variables=variables,
                language=language
            )
            
            logger.info(f"Email verification email queued for {recipient}")
            
        except Exception as e:
            logger.error(f"Failed to queue email verification email: {e}")
            # Don't raise - email failures should not block registration
    
    def send_invoice_created_email(
        self,
        background_tasks: BackgroundTasks,
        recipient: str,
        invoice_number: str,
        amount: str,
        currency: str,
        due_date: str,
        invoice_link: str,
        tenant_id: str,
        language: str = "tr"
    ):
        """Send invoice created email."""
        try:
            variables = {
                "invoice_number": invoice_number,
                "amount": amount,
                "currency": currency,
                "due_date": due_date,
                "invoice_link": invoice_link
            }
            
            email_log_id = self.email_service.queue_email(
                scenario="invoice_created",
                recipient=recipient,
                variables=variables,
                tenant_id=tenant_id,
                language=language
            )
            
            background_tasks.add_task(
                self.email_service.send_email_task,
                tenant_id=tenant_id,
                email_log_id=email_log_id,
                scenario="invoice_created",
                recipient=recipient,
                variables=variables,
                language=language
            )
            
            logger.info(f"Invoice created email queued for {recipient}")
            
        except Exception as e:
            logger.error(f"Failed to queue invoice created email: {e}")
            # Don't raise - email failures should not block invoice creation
    
    def send_system_error_email(
        self,
        background_tasks: BackgroundTasks,
        admin_emails: list[str],
        error_type: str,
        timestamp: str,
        tenant_name: str,
        error_details: str,
        admin_link: str,
        tenant_id: str,
        language: str = "tr"
    ):
        """Send system error notification email to administrators."""
        try:
            variables = {
                "error_type": error_type,
                "timestamp": timestamp,
                "tenant_name": tenant_name,
                "error_details": error_details,
                "admin_link": admin_link
            }
            
            for admin_email in admin_emails:
                email_log_id = self.email_service.queue_email(
                    scenario="system_error",
                    recipient=admin_email,
                    variables=variables,
                    tenant_id=tenant_id,
                    language=language
                )
                
                background_tasks.add_task(
                    self.email_service.send_email_task,
                    tenant_id=tenant_id,
                    email_log_id=email_log_id,
                    scenario="system_error",
                    recipient=admin_email,
                    variables=variables,
                    language=language
                )
            
            logger.info(f"System error emails queued for {len(admin_emails)} administrators")
            
        except Exception as e:
            logger.error(f"Failed to queue system error emails: {e}")
            # Don't raise - email failures should not cascade to error handling
    
    def get_user_language(self, user_id: str, tenant_id: str) -> str:
        """Get user's preferred language with fallback chain."""
        try:
            from models.user import User
            from models.tenant import Tenant
            
            # Try to get user's preferred language
            user = self.db.query(User).filter_by(id=user_id, tenant_id=tenant_id).first()
            if user and hasattr(user, 'preferred_language') and user.preferred_language:
                return user.preferred_language
            
            # Fallback to tenant's default language
            tenant = self.db.query(Tenant).filter_by(id=tenant_id).first()
            if tenant and hasattr(tenant, 'default_language') and tenant.default_language:
                return tenant.default_language
            
            # Final fallback to Turkish
            return "tr"
            
        except Exception as e:
            logger.warning(f"Failed to get user language, using default: {e}")
            return "tr"
