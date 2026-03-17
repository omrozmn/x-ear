"""Communications Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import logging

from database import get_db
from models.communication import EmailLog, CommunicationTemplate, CommunicationHistory
from models.campaign import SmsLog as SMSLog
from models.whatsapp import WhatsAppMessage
from core.models.party import Party
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope
from schemas.campaigns import SmsLogRead
from schemas.communications import (
    EmailLogRead, CommunicationTemplateRead, CommunicationHistoryRead,
    SendSms, SendEmail, TemplateCreate, HistoryCreate
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/communications", tags=["Communications"])


# ============================================================================
# Endpoints
# ============================================================================

def now_utc():
    return datetime.now(timezone.utc)


@router.get("/messages", operation_id="listCommunicationMessages")
async def list_messages(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    status: Optional[str] = None,
    party_id: Optional[str] = None,
    campaign_id: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """List all communication messages (SMS and Email)"""
    try:
        messages = []
        tenant_id = access.tenant_id
        
        if not type or type == "sms":
            sms_query = db.query(SMSLog)
            if tenant_id:
                sms_query = sms_query.filter(SMSLog.tenant_id == tenant_id)
            if status:
                sms_query = sms_query.filter(SMSLog.status == status)
            if party_id:
                sms_query = sms_query.filter(SMSLog.party_id == party_id)
            if campaign_id:
                sms_query = sms_query.filter(SMSLog.campaign_id == campaign_id)
            if date_from:
                sms_query = sms_query.filter(SMSLog.created_at >= datetime.fromisoformat(date_from))
            if date_to:
                sms_query = sms_query.filter(SMSLog.created_at <= datetime.fromisoformat(date_to))
            if search:
                sms_query = sms_query.filter(or_(
                    SMSLog.message.ilike(f"%{search}%"),
                    SMSLog.phone_number.ilike(f"%{search}%")
                ))
            
            for sms in sms_query.order_by(desc(SMSLog.created_at)).all():
                # Use Pydantic schema for type-safe serialization (NO to_dict())
                msg_dict = SmsLogRead.model_validate(sms).model_dump(by_alias=True)
                msg_dict["messageType"] = "sms"
                messages.append(msg_dict)
        
        if not type or type == "email":
            email_query = db.query(EmailLog)
            if tenant_id:
                email_query = email_query.filter(EmailLog.tenant_id == tenant_id)
            if status:
                email_query = email_query.filter(EmailLog.status == status)
            if party_id:
                email_query = email_query.filter(EmailLog.party_id == party_id)
            if campaign_id:
                email_query = email_query.filter(EmailLog.campaign_id == campaign_id)
            if date_from:
                email_query = email_query.filter(EmailLog.created_at >= datetime.fromisoformat(date_from))
            if date_to:
                email_query = email_query.filter(EmailLog.created_at <= datetime.fromisoformat(date_to))
            if search:
                email_query = email_query.filter(or_(
                    EmailLog.subject.ilike(f"%{search}%"),
                    EmailLog.body_text.ilike(f"%{search}%"),
                    EmailLog.to_email.ilike(f"%{search}%")
                ))
            
            for email in email_query.order_by(desc(EmailLog.created_at)).all():
                # Use Pydantic schema for type-safe serialization (NO to_dict())
                msg_dict = EmailLogRead.from_orm_with_json(email).model_dump(by_alias=True)
                msg_dict["messageType"] = "email"
                messages.append(msg_dict)

        if not type or type == "whatsapp":
            whatsapp_query = db.query(WhatsAppMessage)
            if tenant_id:
                whatsapp_query = whatsapp_query.filter(WhatsAppMessage.tenant_id == tenant_id)
            if status:
                whatsapp_query = whatsapp_query.filter(WhatsAppMessage.status == status)
            if party_id:
                whatsapp_query = whatsapp_query.filter(WhatsAppMessage.party_id == party_id)
            if date_from:
                whatsapp_query = whatsapp_query.filter(WhatsAppMessage.created_at >= datetime.fromisoformat(date_from))
            if date_to:
                whatsapp_query = whatsapp_query.filter(WhatsAppMessage.created_at <= datetime.fromisoformat(date_to))
            if search:
                whatsapp_query = whatsapp_query.filter(or_(
                    WhatsAppMessage.message_text.ilike(f"%{search}%"),
                    WhatsAppMessage.phone_number.ilike(f"%{search}%"),
                    WhatsAppMessage.chat_title.ilike(f"%{search}%")
                ))

            for item in whatsapp_query.order_by(desc(WhatsAppMessage.created_at)).all():
                messages.append({
                    "id": item.id,
                    "partyId": item.party_id,
                    "phoneNumber": item.phone_number,
                    "message": item.message_text,
                    "status": item.status,
                    "direction": item.direction,
                    "chatId": item.chat_id,
                    "chatTitle": item.chat_title,
                    "createdAt": item.created_at.isoformat() if item.created_at else None,
                    "updatedAt": item.updated_at.isoformat() if item.updated_at else None,
                    "messageType": "whatsapp",
                })
        
        messages.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        start = (page - 1) * per_page
        paginated = messages[start:start + per_page]
        total = len(messages)
        
        return {
            "success": True,
            "data": paginated,
            "meta": {"total": total, "page": page, "per_page": per_page, "total_pages": (total + per_page - 1) // per_page},
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/messages/send-sms", response_model=ResponseEnvelope[SmsLogRead], operation_id="createCommunicationMessageSendSms")
async def send_sms(
    data: SendSms,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send SMS message"""
    try:
        sms_log = SMSLog()
        sms_log.tenant_id = access.tenant_id  # Set tenant_id before saving
        sms_log.party_id = data.party_id
        sms_log.campaign_id = data.campaign_id
        sms_log.phone_number = data.phone_number
        sms_log.message = data.message
        sms_log.status = "sent"
        sms_log.sent_at = now_utc()
        
        db.add(sms_log)
        db.commit()
        db.refresh(sms_log)
        
        if data.party_id:
            comm_history = CommunicationHistory()
            comm_history.tenant_id = access.tenant_id  # Set tenant_id
            comm_history.party_id = data.party_id
            comm_history.sms_log_id = sms_log.id
            comm_history.communication_type = "sms"
            comm_history.direction = "outbound"
            comm_history.content = sms_log.message
            comm_history.contact_method = sms_log.phone_number
            comm_history.status = "completed"
            db.add(comm_history)
            db.commit()
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return ResponseEnvelope(data=SmsLogRead.model_validate(sms_log))
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/messages/send-email", response_model=ResponseEnvelope[EmailLogRead], operation_id="createCommunicationMessageSendEmail")
async def send_email(
    data: SendEmail,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send Email message"""
    try:
        email_log = EmailLog()
        email_log.tenant_id = access.tenant_id  # Set tenant_id before saving
        email_log.party_id = data.party_id
        email_log.campaign_id = data.campaign_id
        email_log.template_id = data.template_id
        email_log.to_email = data.to_email
        email_log.from_email = data.from_email
        email_log.cc_emails_json = data.cc_emails
        email_log.bcc_emails_json = data.bcc_emails
        email_log.subject = data.subject
        email_log.body_text = data.body_text
        email_log.body_html = data.body_html
        email_log.attachments_json = data.attachments
        email_log.status = "sent"
        email_log.sent_at = now_utc()
        
        db.add(email_log)
        db.commit()
        db.refresh(email_log)
        
        if data.party_id:
            comm_history = CommunicationHistory()
            comm_history.tenant_id = access.tenant_id  # Set tenant_id
            comm_history.party_id = data.party_id
            comm_history.email_log_id = email_log.id
            comm_history.communication_type = "email"
            comm_history.direction = "outbound"
            comm_history.subject = email_log.subject
            comm_history.content = email_log.body_text
            comm_history.contact_method = email_log.to_email
            comm_history.status = "completed"
            db.add(comm_history)
            db.commit()
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        db.refresh(email_log)
        return {"success": True, "data": EmailLogRead.from_orm_with_json(email_log), "timestamp": now_utc().isoformat()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/templates", response_model=ResponseEnvelope[List[CommunicationTemplateRead]], operation_id="listCommunicationTemplates")
async def list_templates(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    category: Optional[str] = None,
    is_active: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """List communication templates"""
    try:
        query = db.query(CommunicationTemplate)
        
        if type:
            query = query.filter(CommunicationTemplate.template_type == type)
        if category:
            query = query.filter(CommunicationTemplate.category == category)
        if is_active is not None:
            query = query.filter(CommunicationTemplate.is_active == (is_active.lower() == "true"))
        if search:
            query = query.filter(or_(
                CommunicationTemplate.name.ilike(f"%{search}%"),
                CommunicationTemplate.description.ilike(f"%{search}%"),
                CommunicationTemplate.body_text.ilike(f"%{search}%")
            ))
        
        total = query.count()
        templates = query.order_by(CommunicationTemplate.name).offset((page - 1) * per_page).limit(per_page).all()
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return {
            "success": True,
            "data": [CommunicationTemplateRead.from_orm_with_json(t) for t in templates],
            "meta": {"total": total, "page": page, "per_page": per_page, "total_pages": (total + per_page - 1) // per_page},
            "timestamp": now_utc().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/templates", response_model=ResponseEnvelope[CommunicationTemplateRead], operation_id="createCommunicationTemplate")
async def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create a new communication template"""
    try:
        existing = db.query(CommunicationTemplate).filter(CommunicationTemplate.name == data.name).first()
        if existing:
            raise HTTPException(status_code=400, detail="Template name already exists")
        
        template = CommunicationTemplate()
        template.tenant_id = access.tenant_id  # Set tenant_id before saving
        template.name = data.name
        template.description = data.description
        template.template_type = data.template_type
        template.category = data.category
        template.subject = data.subject
        template.body_text = data.body_text
        template.body_html = data.body_html
        template.variables_json = data.variables
        template.is_active = data.is_active
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return {"success": True, "data": CommunicationTemplateRead.from_orm_with_json(template), "timestamp": now_utc().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/templates/{template_id}", response_model=ResponseEnvelope[CommunicationTemplateRead], operation_id="getCommunicationTemplate")
async def get_template(template_id: str, db: Session = Depends(get_db), access: UnifiedAccess = Depends(require_access())):
    """Get a specific template"""
    template = db.get(CommunicationTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    # Use Pydantic schema for type-safe serialization (NO to_dict())
    return {"success": True, "data": CommunicationTemplateRead.from_orm_with_json(template), "timestamp": now_utc().isoformat()}

@router.put("/templates/{template_id}", response_model=ResponseEnvelope[CommunicationTemplateRead], operation_id="updateCommunicationTemplate")
async def update_template(
    template_id: str,
    data: TemplateCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Update a communication template"""
    try:
        template = db.get(CommunicationTemplate, template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        if data.name is not None:
            # Check for duplicate name
            existing = db.query(CommunicationTemplate).filter(
                CommunicationTemplate.name == data.name,
                CommunicationTemplate.id != template_id
            ).first()
            if existing:
                raise HTTPException(status_code=400, detail="Template name already exists")
            template.name = data.name
        
        if data.description is not None:
            template.description = data.description
        if data.template_type is not None:
            template.template_type = data.template_type
        if data.category is not None:
            template.category = data.category
        if data.subject is not None:
            template.subject = data.subject
        if data.body_text is not None:
            template.body_text = data.body_text
        if data.body_html is not None:
            template.body_html = data.body_html
        if data.variables is not None:
            template.variables_json = data.variables
        if data.is_active is not None:
            template.is_active = data.is_active
        
        db.commit()
        db.refresh(template)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return {"success": True, "data": CommunicationTemplateRead.from_orm_with_json(template), "timestamp": now_utc().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.delete("/templates/{template_id}", operation_id="deleteCommunicationTemplate")
async def delete_template(template_id: str, db: Session = Depends(get_db), access: UnifiedAccess = Depends(require_access())):
    """Delete a communication template"""
    template = db.get(CommunicationTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    if getattr(template, "is_system", False):
        raise HTTPException(status_code=403, detail="Cannot delete system templates")
    
    db.delete(template)
    db.commit()
    return {"success": True, "message": "Template deleted successfully", "timestamp": now_utc().isoformat()}

@router.get("/history", response_model=ResponseEnvelope[List[CommunicationHistoryRead]], operation_id="listCommunicationHistory")
async def list_communication_history(
    page: int = Query(1, ge=1, le=1000000),
    per_page: int = Query(20, ge=1, le=100),
    party_id: Optional[str] = None,
    type: Optional[str] = None,
    direction: Optional[str] = None,
    status: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """List communication history"""
    try:
        query = db.query(CommunicationHistory)
        if access.tenant_id:
            query = query.filter(CommunicationHistory.tenant_id == access.tenant_id)
        
        if party_id:
            query = query.filter(CommunicationHistory.party_id == party_id)
        if type:
            query = query.filter(CommunicationHistory.communication_type == type)
        if direction:
            query = query.filter(CommunicationHistory.direction == direction)
        if status:
            query = query.filter(CommunicationHistory.status == status)
        if date_from:
            query = query.filter(CommunicationHistory.created_at >= datetime.fromisoformat(date_from))
        if date_to:
            query = query.filter(CommunicationHistory.created_at <= datetime.fromisoformat(date_to))
        if search:
            query = query.filter(or_(
                CommunicationHistory.subject.ilike(f"%{search}%"),
                CommunicationHistory.content.ilike(f"%{search}%"),
                CommunicationHistory.contact_method.ilike(f"%{search}%")
            ))
        
        total = query.count()
        history = query.order_by(desc(CommunicationHistory.created_at)).offset((page - 1) * per_page).limit(per_page).all()
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return {
            "success": True,
            "data": [CommunicationHistoryRead.from_orm_with_json(h) for h in history],
            "meta": {"total": total, "page": page, "per_page": per_page, "total_pages": (total + per_page - 1) // per_page},
            "timestamp": now_utc().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")

@router.post("/history", response_model=ResponseEnvelope[CommunicationHistoryRead], operation_id="createCommunicationHistory")
async def create_communication_history(
    data: HistoryCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create a manual communication history entry"""
    try:
        party = db.get(Party, data.party_id)
        if not party:
            raise HTTPException(status_code=404, detail="Party not found")
        
        history = CommunicationHistory()
        history.tenant_id = access.tenant_id  # Set tenant_id
        history.party_id = data.party_id
        history.communication_type = data.communication_type
        history.direction = data.direction
        history.subject = data.subject
        history.content = data.content
        history.contact_method = data.contact_method
        history.status = data.status
        history.priority = data.priority
        history.initiated_by = data.initiated_by
        history.metadata_json = data.metadata
        
        db.add(history)
        db.commit()
        db.refresh(history)
        
        # Use Pydantic schema for type-safe serialization (NO to_dict())
        return {"success": True, "data": CommunicationHistoryRead.from_orm_with_json(history), "timestamp": now_utc().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")

@router.get("/stats", operation_id="listCommunicationStats")
async def communication_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get communication statistics"""
    try:
        date_from = now_utc() - timedelta(days=days)
        tenant_id = access.tenant_id
        
        sms_base = db.query(SMSLog).filter(SMSLog.created_at >= date_from)
        email_base = db.query(EmailLog).filter(EmailLog.created_at >= date_from)
        whatsapp_base = db.query(WhatsAppMessage).filter(WhatsAppMessage.created_at >= date_from)
        history_base = db.query(CommunicationHistory).filter(CommunicationHistory.created_at >= date_from)
        template_base = db.query(CommunicationTemplate).filter(CommunicationTemplate.is_active == True)
        if tenant_id:
            sms_base = sms_base.filter(SMSLog.tenant_id == tenant_id)
            email_base = email_base.filter(EmailLog.tenant_id == tenant_id)
            whatsapp_base = whatsapp_base.filter(WhatsAppMessage.tenant_id == tenant_id)
            history_base = history_base.filter(CommunicationHistory.tenant_id == tenant_id)
            template_base = template_base.filter(CommunicationTemplate.tenant_id == tenant_id)

        sms_total = sms_base.count()
        sms_sent = sms_base.filter(SMSLog.status == "sent").count()
        sms_failed = sms_base.filter(SMSLog.status == "failed").count()
        
        email_total = email_base.count()
        email_sent = email_base.filter(EmailLog.status == "sent").count()
        email_failed = email_base.filter(EmailLog.status == "failed").count()
        whatsapp_total = whatsapp_base.count()
        whatsapp_sent = whatsapp_base.filter(WhatsAppMessage.direction == "outbound").count()
        whatsapp_failed = whatsapp_base.filter(WhatsAppMessage.status == "failed").count()
        
        template_count = template_base.count()
        history_total = history_base.count()
        
        stats = {
            "sms": {"total": sms_total, "sent": sms_sent, "failed": sms_failed, "successRate": (sms_sent / sms_total * 100) if sms_total > 0 else 0},
            "email": {"total": email_total, "sent": email_sent, "failed": email_failed, "successRate": (email_sent / email_total * 100) if email_total > 0 else 0},
            "whatsapp": {"total": whatsapp_total, "sent": whatsapp_sent, "failed": whatsapp_failed, "successRate": (whatsapp_sent / whatsapp_total * 100) if whatsapp_total > 0 else 0},
            "templates": {"active": template_count},
            "history": {"total": history_total},
            "period": {"days": days, "from": date_from.isoformat(), "to": now_utc().isoformat()}
        }
        
        return {"success": True, "data": stats, "timestamp": now_utc().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
