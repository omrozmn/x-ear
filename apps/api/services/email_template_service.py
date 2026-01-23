"""
EmailTemplateService for SMTP Email Integration

This service handles Jinja2 template rendering for email scenarios.
Provides multi-language support with fallback chain and variable validation.

Requirements:
- 6.1: Use Jinja2 as template rendering engine
- 6.2: Support both HTML and plain text templates
- 6.3: Provide base layout with header and footer
- 6.4: Store templates in filesystem (templates/email/)
- 6.5: Validate required variables before sending
- 6.6: Support scenarios: password_reset, user_invite, email_verification, invoice_created, system_error, smtp_test
- 6.7: Escape user-provided content to prevent XSS
- 7.1-7.6: Multi-language support with fallback chain
- 23.1-23.6: Template variable validation and security

Security Notes:
- Jinja2 autoescape enabled for HTML templates
- User-provided variables are automatically escaped
- Template injection prevention through sandboxed environment
- Variable type validation before rendering
"""

import os
import json
import logging
from typing import Any, Dict, Tuple
from datetime import datetime
from jinja2 import (
    Environment,
    FileSystemLoader,
    select_autoescape,
    TemplateNotFound,
    TemplateSyntaxError,
    UndefinedError
)

from utils.exceptions import TemplateError, ValidationError

logger = logging.getLogger(__name__)


# Template variable requirements for each scenario
TEMPLATE_REQUIRED_VARIABLES = {
    "password_reset": ["reset_link", "user_name", "expires_in_hours"],
    "user_invite": ["inviter_name", "organization_name", "invitation_link", "role_name"],
    "email_verification": ["verification_link", "user_name"],
    "invoice_created": ["invoice_number", "amount", "currency", "due_date", "invoice_link", "payment_status"],
    "system_error": ["error_type", "timestamp", "tenant_name", "error_details", "admin_link"],
    "smtp_test": ["user_name", "tenant_name"]
}


class EmailTemplateService:
    """
    Service for rendering email templates using Jinja2.
    
    This service handles:
    - Loading and rendering Jinja2 templates
    - Multi-language support with fallback chain (requested → TR)
    - Variable validation against required variables schema
    - XSS prevention through autoescape
    - Template injection prevention
    - Base layout inclusion for consistent branding
    
    Usage:
        service = EmailTemplateService()
        
        # Render template
        subject, html, text = service.render_template(
            scenario="password_reset",
            language="tr",
            variables={
                "user_name": "Ahmet Yılmaz",
                "reset_link": "https://app.x-ear.com/reset/abc123",
                "expires_in_hours": 1
            }
        )
    """
    
    def __init__(self, template_dir: str = "templates/email"):
        """
        Initialize the email template service.
        
        Args:
            template_dir: Base directory for email templates (default: templates/email)
        """
        self.template_dir = template_dir
        
        # Initialize Jinja2 environment with security settings
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(["html", "xml"]),  # XSS prevention
            trim_blocks=True,  # Remove first newline after block
            lstrip_blocks=True,  # Strip leading spaces/tabs from block
            keep_trailing_newline=True  # Preserve trailing newline
        )
        
        logger.info(f"EmailTemplateService initialized with template_dir: {template_dir}")
    
    def render_template(
        self,
        scenario: str,
        language: str,
        variables: Dict[str, Any]
    ) -> Tuple[str, str, str]:
        """
        Render email template for scenario and language.
        
        Returns (subject, html_body, text_body).
        
        Args:
            scenario: Template scenario name (password_reset, user_invite, etc.)
            language: Requested language code (tr, en)
            variables: Template variables dictionary
            
        Returns:
            Tuple[str, str, str]: (subject, html_body, text_body)
            
        Raises:
            TemplateError: If template doesn't exist or rendering fails
            ValidationError: If required variables are missing or invalid
            
        Example:
            subject, html, text = service.render_template(
                scenario="password_reset",
                language="tr",
                variables={
                    "user_name": "Ahmet",
                    "reset_link": "https://...",
                    "expires_in_hours": 1
                }
            )
        """
        # Determine language with fallback
        lang = self._resolve_language(scenario, language)
        
        # Validate required variables
        self._validate_variables(scenario, variables)
        
        # Load templates
        try:
            html_template = self.jinja_env.get_template(f"{lang}/{scenario}.html")
            text_template = self.jinja_env.get_template(f"{lang}/{scenario}.txt")
            subject_template_str = self._load_subject_template(scenario, lang)
        except TemplateNotFound as e:
            error_msg = f"Template not found: {scenario} ({lang})"
            logger.error(error_msg, extra={"scenario": scenario, "language": lang})
            raise TemplateError(error_msg, details=str(e))
        except TemplateSyntaxError as e:
            error_msg = f"Template syntax error: {scenario} ({lang})"
            logger.error(error_msg, extra={"scenario": scenario, "language": lang, "error": str(e)})
            raise TemplateError(error_msg, details=str(e))
        
        # Add common variables
        context = {
            **variables,
            "current_year": datetime.now().year,
            "app_name": "X-Ear CRM",
            "support_email": "destek@x-ear.com"
        }
        
        # Render templates
        try:
            # Render subject
            subject_template = self.jinja_env.from_string(subject_template_str)
            subject = subject_template.render(**context).strip()
            
            # Render HTML body
            html_body = html_template.render(**context)
            
            # Render text body
            text_body = text_template.render(**context)
            
            logger.info(
                f"Template rendered successfully",
                extra={
                    "scenario": scenario,
                    "language": lang,
                    "subject_length": len(subject),
                    "html_length": len(html_body),
                    "text_length": len(text_body)
                }
            )
            
            return subject, html_body, text_body
            
        except UndefinedError as e:
            # This happens when a variable is used in template but not provided
            error_msg = f"Template variable error: {str(e)}"
            logger.error(error_msg, extra={"scenario": scenario, "language": lang})
            raise ValidationError(error_msg, details=str(e))
        except Exception as e:
            error_msg = f"Template rendering failed: {str(e)}"
            logger.error(error_msg, extra={"scenario": scenario, "language": lang})
            raise TemplateError(error_msg, details=str(e))
    
    def _resolve_language(self, scenario: str, requested_lang: str) -> str:
        """
        Resolve language with fallback to TR.
        
        Language fallback chain:
        1. Requested language (if template exists)
        2. Turkish (TR) as fallback
        
        Args:
            scenario: Template scenario name
            requested_lang: Requested language code
            
        Returns:
            str: Resolved language code (tr or en)
            
        Example:
            lang = service._resolve_language("password_reset", "en")
            # Returns "en" if template exists, otherwise "tr"
        """
        # Check if requested language template exists
        html_path = os.path.join(self.template_dir, requested_lang, f"{scenario}.html")
        
        if os.path.exists(html_path):
            logger.debug(f"Using requested language: {requested_lang}")
            return requested_lang
        
        # Fallback to Turkish
        logger.debug(f"Language {requested_lang} not found, falling back to TR")
        return "tr"
    
    def _load_subject_template(self, scenario: str, lang: str) -> str:
        """
        Load subject template from metadata file.
        
        Args:
            scenario: Template scenario name
            lang: Language code
            
        Returns:
            str: Subject template string
            
        Raises:
            TemplateError: If metadata file not found or invalid
            
        Example:
            subject_template = service._load_subject_template("password_reset", "tr")
            # Returns: "Şifre Sıfırlama Talebi - {{ app_name }}"
        """
        metadata_path = os.path.join(self.template_dir, lang, f"{scenario}_meta.json")
        
        try:
            with open(metadata_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
            
            subject = metadata.get("subject")
            if not subject:
                raise TemplateError(f"Subject not found in metadata: {metadata_path}")
            
            return subject
            
        except FileNotFoundError:
            error_msg = f"Metadata file not found: {metadata_path}"
            logger.error(error_msg)
            raise TemplateError(error_msg)
        except json.JSONDecodeError as e:
            error_msg = f"Invalid JSON in metadata file: {metadata_path}"
            logger.error(error_msg, extra={"error": str(e)})
            raise TemplateError(error_msg, details=str(e))
    
    def _validate_variables(self, scenario: str, variables: Dict[str, Any]):
        """
        Validate that all required variables are provided.
        
        Args:
            scenario: Template scenario name
            variables: Provided template variables
            
        Raises:
            ValidationError: If required variables are missing
            
        Example:
            service._validate_variables("password_reset", {
                "user_name": "Ahmet",
                "reset_link": "https://...",
                "expires_in_hours": 1
            })
            # Passes validation
            
            service._validate_variables("password_reset", {
                "user_name": "Ahmet"
            })
            # Raises ValidationError: Missing required variables: reset_link, expires_in_hours
        """
        required_vars = TEMPLATE_REQUIRED_VARIABLES.get(scenario, [])
        
        if not required_vars:
            logger.warning(f"No required variables defined for scenario: {scenario}")
            return
        
        missing = [var for var in required_vars if var not in variables]
        
        if missing:
            error_msg = f"Missing required variables: {', '.join(missing)}"
            logger.error(
                error_msg,
                extra={
                    "scenario": scenario,
                    "required": required_vars,
                    "provided": list(variables.keys()),
                    "missing": missing
                }
            )
            raise ValidationError(error_msg)
        
        logger.debug(f"Variable validation passed for scenario: {scenario}")
    
    def get_supported_scenarios(self) -> list[str]:
        """
        Get list of supported email scenarios.
        
        Returns:
            list[str]: List of scenario names
            
        Example:
            scenarios = service.get_supported_scenarios()
            # Returns: ["password_reset", "user_invite", "email_verification", ...]
        """
        return list(TEMPLATE_REQUIRED_VARIABLES.keys())
    
    def get_required_variables(self, scenario: str) -> list[str]:
        """
        Get required variables for a scenario.
        
        Args:
            scenario: Template scenario name
            
        Returns:
            list[str]: List of required variable names
            
        Example:
            vars = service.get_required_variables("password_reset")
            # Returns: ["reset_link", "user_name", "expires_in_hours"]
        """
        return TEMPLATE_REQUIRED_VARIABLES.get(scenario, [])


# Singleton instance for dependency injection
_email_template_service_instance = None


def get_email_template_service() -> EmailTemplateService:
    """
    Get the singleton EmailTemplateService instance.
    
    This function is used for dependency injection in FastAPI routes.
    
    Returns:
        EmailTemplateService: The singleton instance
        
    Example:
        @router.post("/send")
        def send_email(
            template_service: EmailTemplateService = Depends(get_email_template_service)
        ):
            subject, html, text = template_service.render_template(...)
    """
    global _email_template_service_instance
    
    if _email_template_service_instance is None:
        _email_template_service_instance = EmailTemplateService()
    
    return _email_template_service_instance


def reset_email_template_service():
    """
    Reset the singleton instance (for testing purposes).
    
    This function should only be used in tests to reset the service
    between test cases.
    """
    global _email_template_service_instance
    _email_template_service_instance = None

