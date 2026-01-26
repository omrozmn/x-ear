import logging
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from core.models.notification_template import NotificationTemplate
from core.models.party import Party
from services.communication_service import communication_service

logger = logging.getLogger(__name__)

class EventService:
    """
    Service to handle system events and trigger automations based on NotificationTemplates.
    Acts as a lightweight Rule Engine.
    """

    def handle_event(self, event_name: str, payload: Dict[str, Any], tenant_id: str):
        """
        Handle a system event by finding matching templates and executing them.
        
        Args:
            event_name: The name of the event (e.g., 'sale_created', 'appointment_created')
            payload: Dictionary containing event data (e.g., sale object, patient info)
            tenant_id: The tenant ID where the event occurred
        """
        logger.info(f"Event received: {event_name} for tenant {tenant_id}")
        
        # We need a db session distinct from the request session since this might run in background
        db_gen = get_db()
        db = next(db_gen)
        
        try:
            # 1. Find active templates for this event and tenant
            templates = db.query(NotificationTemplate).filter(
                NotificationTemplate.tenant_id == tenant_id,
                NotificationTemplate.trigger_event == event_name,
                NotificationTemplate.is_active == True
            ).all()
            
            if not templates:
                logger.debug(f"No active templates found for event {event_name}")
                return

            logger.info(f"Found {len(templates)} templates for event {event_name}")

            # 2. Process each template
            for template in templates:
                try:
                    self._process_template(db, template, payload)
                except Exception as e:
                    logger.error(f"Error processing template {template.name} ({template.id}): {e}")
                    
        except Exception as e:
            logger.error(f"Error handling event {event_name}: {e}")
        finally:
            db.close()

    def _process_template(self, db: Session, template: NotificationTemplate, payload: Dict[str, Any]):
        """Execute a single template action"""
        
        # Resolve Recipient
        # Payload is expected to have 'party_id' or a 'party' dict
        # or 'patient' key.
        recipient_phone = None
        recipient_email = None
        recipient_name = "Customer"
        
        # Try to resolve patient/party from payload
        party = None
        if 'party_id' in payload:
            party = db.get(Party, payload['party_id'])
        elif 'patient' in payload and isinstance(payload['patient'], dict) and 'id' in payload['patient']:
             party = db.get(Party, payload['patient']['id'])
        
        if party:
            recipient_phone = party.phone
            recipient_email = party.email
            recipient_name = f"{party.first_name} {party.last_name}"
        
        # Variable Substitution
        # Flatten payload for simple substitution
        # This is a basic implementation. A proper template engine (Jinja2) would be better,
        # but for now we'll do simple string replacement as per existing patterns if any.
        # But `NotificationTemplate` suggests `variables` field is just a list names.
        
        # Let's construct a context dictionary
        context = {
            "patient_name": recipient_name,
            "date": datetime.now(timezone.utc).strftime("%d.%m.%Y"),
            **payload # Merge payload at top level
        }
        
        # Helper for substitution
        def render(text: str) -> str:
            if not text: return ""
            for key, val in context.items():
                if val:
                   text = text.replace(f"{{{{{key}}}}}", str(val)) # {{key}} syntax
                   text = text.replace(f"{{{key}}}", str(val))     # {key} syntax support
            return text

        # Execute based on Channel
        if template.channel == 'sms':
            if not recipient_phone:
                logger.warning(f"Template {template.name} requires SMS but no phone found for party {party.id if party else 'unknown'}")
                return
                
            message = render(template.body_template)
            
            logger.info(f"Sending Auto-SMS to {recipient_phone}: {message}")
            communication_service.send_sms(
                phone_number=recipient_phone, 
                message=message,
                provider='vatansms' # Explicitly use vatan or default
            )

        elif template.channel == 'email':
            if not recipient_email:
                logger.warning(f"Template {template.name} requires Email but no email found for party {party.id if party else 'unknown'}")
                return
                
            subject = render(template.email_subject or template.title_template)
            body_text = render(template.email_body_text or template.body_template)
            body_html = render(template.email_body_html) if template.email_body_html else None
            
            logger.info(f"Sending Auto-Email to {recipient_email}: {subject}")
            communication_service.send_email(
                to_email=recipient_email,
                subject=subject,
                body_text=body_text,
                body_html=body_html
            )
            
        # TODO: Handle 'schedule_appointment' actions if template has separate action fields
        # OR if we decide to parse `trigger_conditions` or `extra_data` for complex logic.
        # For Phase 1, we focus on Communication.

# Global instance
event_service = EventService()
