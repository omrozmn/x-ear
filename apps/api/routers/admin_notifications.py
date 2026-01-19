"""Admin Notifications Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
import logging

from database import get_db
from models.notification import Notification
from models.notification_template import NotificationTemplate
from models.tenant import Tenant
from models.user import User
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope
from schemas.notifications import NotificationRead, NotificationTemplateRead, NotificationTemplateCreate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin/notifications", tags=["Admin Notifications"])

# Response models removed in favor of generics

class NotificationSend(BaseModel):
    targetType: str  # 'tenant', 'all'
    targetId: Optional[str] = None
    title: str
    message: str
    type: Optional[str] = "info"
    channel: Optional[str] = "push"

class TemplateCreate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    titleTemplate: Optional[str] = None
    bodyTemplate: Optional[str] = None
    channel: Optional[str] = "push"
    variables: Optional[List[str]] = []
    emailFromName: Optional[str] = None
    emailFromAddress: Optional[str] = None
    emailToType: Optional[str] = None
    emailToAddresses: Optional[str] = None
    emailSubject: Optional[str] = None
    emailBodyHtml: Optional[str] = None
    emailBodyText: Optional[str] = None
    triggerEvent: Optional[str] = "manual"
    triggerConditions: Optional[str] = None
    templateCategory: Optional[str] = "platform_announcement"
    isActive: Optional[bool] = True

@router.post("/init-db", operation_id="createAdminNotificationInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Initialize notification tables"""
    try:
        Notification.__table__.create(db.get_bind(), checkfirst=True)
        NotificationTemplate.__table__.create(db.get_bind(), checkfirst=True)
        db.commit()
        return ResponseEnvelope(message="Notification tables initialized")
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", operation_id="listAdminNotifications", response_model=ResponseEnvelope[List[NotificationRead]])
async def get_notifications(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    user_id: Optional[str] = None,
    type_filter: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.read", admin_only=True))
):
    """Get list of notifications"""
    try:
        query = db.query(Notification)
        if user_id:
            query = query.filter(Notification.user_id == user_id)
        if type_filter:
            query = query.filter(Notification.notification_type == type_filter)
        
        total = query.count()
        notifications = query.order_by(Notification.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return ResponseEnvelope(
            data=[NotificationRead.model_validate(n) for n in notifications],
            meta={"page": page, "limit": limit, "total": total, "total_pages": (total + limit - 1) // limit}
        )
    except Exception as e:
        logger.error(f"Get notifications error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/send", operation_id="createAdminNotificationSend", response_model=ResponseEnvelope)
async def send_notification(
    data: NotificationSend,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Send a notification to tenants - supports push, email, or both channels"""
    try:
        if not data.title or not data.message:
            raise HTTPException(status_code=400, detail="Title and message are required")
        
        # For email channel, send via EmailService (Flask parity)
        if data.channel in ['email', 'both']:
            from services.email_service import email_service
            
            # Determine recipients
            if data.targetType == 'tenant' and data.targetId:
                tenant = db.get(Tenant, data.targetId)
                if not tenant:
                    raise HTTPException(status_code=404, detail="Tenant not found")
                # Get tenant admins/owners
                admin_users = db.query(User).filter_by(tenant_id=data.targetId, role='owner').all()
                email_recipients = [u.email for u in admin_users if u.email]
            elif data.targetType == 'all':
                # Get all tenant owners
                admin_users = db.query(User).filter_by(role='owner').all()
                email_recipients = [u.email for u in admin_users if u.email]
            else:
                raise HTTPException(status_code=400, detail="Invalid target type")
            
            # Send emails
            email_count = 0
            for email in email_recipients:
                success = email_service.send_email(
                    to=email,
                    subject=data.title,
                    body_html=f"<html><body>{data.message}</body></html>",
                    body_text=data.message
                )
                if success:
                    email_count += 1
            
            # If only email channel, return here
            if data.channel == 'email':
                return ResponseEnvelope(data={"count": email_count, "channel": "email"}, message=f"Email notification sent to {email_count} recipients")
        
        # For push notifications (or 'both' channel)
        recipients = []
        if data.targetType == "tenant" and data.targetId:
            users = db.query(User).filter(User.tenant_id == data.targetId).all()
            recipients = [u.id for u in users]
        elif data.targetType == "all":
            users = db.query(User).all()
            recipients = [u.id for u in users]
        
        push_count = 0
        for user_id in recipients:
            user = db.get(User, user_id)
            if not user:
                continue
            notification = Notification.create_notification(
                user_id=user_id, title=data.title, message=data.message, notification_type=data.type
            )
            notification.tenant_id = user.tenant_id
            db.add(notification)
            push_count += 1
        
        db.commit()
        
        # Return combined result for 'both' channel
        if data.channel == 'both':
            return ResponseEnvelope(data={"push_count": push_count, "email_count": email_count, "channel": "both"}, message=f"Notification sent to {push_count} users (push) and {email_count} recipients (email)")
        
        return ResponseEnvelope(data={"count": push_count, "channel": "push"}, message=f"Notification sent to {push_count} users")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Send notification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Template Endpoints (Migrated from Flask) ---

@router.get("/templates", operation_id="listAdminNotificationTemplates", response_model=ResponseEnvelope[List[NotificationTemplateRead]])
async def get_templates(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    category: Optional[str] = Query(None, description="Filter by template category"),
    channel: Optional[str] = Query(None, description="Filter by channel (push, email)"),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.read", admin_only=True))
):
    """Get notification templates - Flask parity with category/channel filters"""
    try:
        query = db.query(NotificationTemplate)
        
        # Apply filters (Flask parity)
        if category:
            query = query.filter(NotificationTemplate.template_category == category)
        if channel:
            query = query.filter(NotificationTemplate.channel == channel)
        
        total = query.count()
        templates = query.order_by(NotificationTemplate.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        return ResponseEnvelope(
            data=[NotificationTemplateRead.model_validate(t) for t in templates],
            meta={"page": page, "limit": limit, "total": total, "total_pages": (total + limit - 1) // limit}
        )
    except Exception as e:
        logger.error(f"Get templates error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates", operation_id="createAdminNotificationTemplates", response_model=ResponseEnvelope[NotificationTemplateRead])
async def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Create a notification template"""
    try:
        template = NotificationTemplate(
            name=data.name,
            description=data.description,
            title_template=data.titleTemplate,
            body_template=data.bodyTemplate,
            channel=data.channel,
            variables=data.variables,
            trigger_event=data.triggerEvent,
            template_category=data.templateCategory,
            is_active=data.isActive
        )
        
        # Set email fields if provided
        if data.emailFromName:
            template.email_from_name = data.emailFromName
        if data.emailFromAddress:
            template.email_from_address = data.emailFromAddress
        if data.emailSubject:
            template.email_subject = data.emailSubject
        if data.emailBodyHtml:
            template.email_body_html = data.emailBodyHtml
        if data.emailBodyText:
            template.email_body_text = data.emailBodyText
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=NotificationTemplateRead.model_validate(template))
    except Exception as e:
        db.rollback()
        logger.error(f"Create template error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/templates/{template_id}", operation_id="updateAdminNotificationTemplate", response_model=ResponseEnvelope[NotificationTemplateRead])
async def update_template(
    template_id: str,
    data: TemplateCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Update a notification template"""
    try:
        template = db.get(NotificationTemplate, template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if data.name is not None:
            template.name = data.name
        if data.description is not None:
            template.description = data.description
        if data.titleTemplate is not None:
            template.title_template = data.titleTemplate
        if data.bodyTemplate is not None:
            template.body_template = data.bodyTemplate
        if data.channel is not None:
            template.channel = data.channel
        if data.variables is not None:
            template.variables = data.variables
        if data.triggerEvent is not None:
            template.trigger_event = data.triggerEvent
        if data.templateCategory is not None:
            template.template_category = data.templateCategory
        if data.isActive is not None:
            template.is_active = data.isActive
        
        # Update email fields
        if data.emailFromName is not None:
            template.email_from_name = data.emailFromName
        if data.emailFromAddress is not None:
            template.email_from_address = data.emailFromAddress
        if data.emailSubject is not None:
            template.email_subject = data.emailSubject
        if data.emailBodyHtml is not None:
            template.email_body_html = data.emailBodyHtml
        if data.emailBodyText is not None:
            template.email_body_text = data.emailBodyText
        
        db.commit()
        db.refresh(template)
        
        return ResponseEnvelope(data=NotificationTemplateRead.model_validate(template))
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Update template error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/templates/{template_id}", operation_id="deleteAdminNotificationTemplate", response_model=ResponseEnvelope)
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Delete a notification template"""
    try:
        template = db.get(NotificationTemplate, template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        db.delete(template)
        db.commit()
        
        return ResponseEnvelope(message="Template deleted")
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Delete template error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
