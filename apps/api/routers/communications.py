"""Communications Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, desc
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
import logging

from database import get_db
from models.communication import EmailLog, CommunicationTemplate, CommunicationHistory
from models.campaign import SMSLog
from models.patient import Patient
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/communications", tags=["Communications"])

def now_utc():
    return datetime.now(timezone.utc)

class SendSMS(BaseModel):
    phoneNumber: str
    message: str
    patientId: Optional[str] = None
    campaignId: Optional[str] = None

class SendEmail(BaseModel):
    toEmail: str
    subject: str
    bodyText: str
    bodyHtml: Optional[str] = None
    fromEmail: Optional[str] = "noreply@x-ear.com"
    ccEmails: Optional[List[str]] = []
    bccEmails: Optional[List[str]] = []
    attachments: Optional[List[Dict]] = []
    patientId: Optional[str] = None
    campaignId: Optional[str] = None
    templateId: Optional[str] = None

class TemplateCreate(BaseModel):
    name: str
    templateType: str
    bodyText: str
    description: Optional[str] = None
    category: Optional[str] = None
    subject: Optional[str] = None
    bodyHtml: Optional[str] = None
    variables: Optional[List[str]] = []
    isActive: Optional[bool] = True

class HistoryCreate(BaseModel):
    patientId: str
    communicationType: str
    direction: str
    subject: Optional[str] = None
    content: Optional[str] = None
    contactMethod: Optional[str] = None
    status: Optional[str] = "completed"
    priority: Optional[str] = "normal"
    metadata: Optional[Dict[str, Any]] = {}
    initiatedBy: Optional[str] = None

@router.get("/messages", operation_id="listCommunicationMessages")
async def list_messages(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    type: Optional[str] = None,
    status: Optional[str] = None,
    patient_id: Optional[str] = None,
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
        
        if not type or type == "sms":
            sms_query = db.query(SMSLog)
            if status:
                sms_query = sms_query.filter(SMSLog.status == status)
            if patient_id:
                sms_query = sms_query.filter(SMSLog.patient_id == patient_id)
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
                msg_dict = sms.to_dict()
                msg_dict["messageType"] = "sms"
                messages.append(msg_dict)
        
        if not type or type == "email":
            email_query = db.query(EmailLog)
            if status:
                email_query = email_query.filter(EmailLog.status == status)
            if patient_id:
                email_query = email_query.filter(EmailLog.patient_id == patient_id)
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
                msg_dict = email.to_dict()
                msg_dict["messageType"] = "email"
                messages.append(msg_dict)
        
        messages.sort(key=lambda x: x.get("createdAt", ""), reverse=True)
        start = (page - 1) * per_page
        paginated = messages[start:start + per_page]
        total = len(messages)
        
        return {
            "success": True,
            "data": paginated,
            "meta": {"total": total, "page": page, "per_page": per_page, "total_pages": (total + per_page - 1) // per_page},
            "timestamp": now_utc().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/messages/send-sms", operation_id="createCommunicationMessageSendSms")
async def send_sms(
    data: SendSMS,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send SMS message"""
    try:
        sms_log = SMSLog()
        sms_log.patient_id = data.patientId
        sms_log.campaign_id = data.campaignId
        sms_log.phone_number = data.phoneNumber
        sms_log.message = data.message
        sms_log.status = "sent"
        sms_log.sent_at = now_utc()
        
        db.add(sms_log)
        db.commit()
        db.refresh(sms_log)
        
        if data.patientId:
            comm_history = CommunicationHistory()
            comm_history.patient_id = data.patientId
            comm_history.sms_log_id = sms_log.id
            comm_history.communication_type = "sms"
            comm_history.direction = "outbound"
            comm_history.content = sms_log.message
            comm_history.contact_method = sms_log.phone_number
            comm_history.status = "completed"
            db.add(comm_history)
            db.commit()
        
        return {"success": True, "data": sms_log.to_dict(), "timestamp": now_utc().isoformat()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/messages/send-email", operation_id="createCommunicationMessageSendEmail")
async def send_email(
    data: SendEmail,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Send Email message"""
    try:
        email_log = EmailLog()
        email_log.patient_id = data.patientId
        email_log.campaign_id = data.campaignId
        email_log.template_id = data.templateId
        email_log.to_email = data.toEmail
        email_log.from_email = data.fromEmail
        email_log.cc_emails_json = data.ccEmails
        email_log.bcc_emails_json = data.bccEmails
        email_log.subject = data.subject
        email_log.body_text = data.bodyText
        email_log.body_html = data.bodyHtml
        email_log.attachments_json = data.attachments
        email_log.status = "sent"
        email_log.sent_at = now_utc()
        
        db.add(email_log)
        db.commit()
        db.refresh(email_log)
        
        if data.patientId:
            comm_history = CommunicationHistory()
            comm_history.patient_id = data.patientId
            comm_history.email_log_id = email_log.id
            comm_history.communication_type = "email"
            comm_history.direction = "outbound"
            comm_history.subject = email_log.subject
            comm_history.content = email_log.body_text
            comm_history.contact_method = email_log.to_email
            comm_history.status = "completed"
            db.add(comm_history)
            db.commit()
        
        return {"success": True, "data": email_log.to_dict(), "timestamp": now_utc().isoformat()}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates", operation_id="listCommunicationTemplates")
async def list_templates(
    page: int = Query(1, ge=1),
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
        
        return {
            "success": True,
            "data": [t.to_dict() for t in templates],
            "meta": {"total": total, "page": page, "per_page": per_page, "total_pages": (total + per_page - 1) // per_page},
            "timestamp": now_utc().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates", operation_id="createCommunicationTemplates")
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
        template.name = data.name
        template.description = data.description
        template.template_type = data.templateType
        template.category = data.category
        template.subject = data.subject
        template.body_text = data.bodyText
        template.body_html = data.bodyHtml
        template.variables_json = data.variables
        template.is_active = data.isActive
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        return {"success": True, "data": template.to_dict(), "timestamp": now_utc().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/{template_id}", operation_id="getCommunicationTemplate")
async def get_template(template_id: str, db: Session = Depends(get_db), access: UnifiedAccess = Depends(require_access())):
    """Get a specific template"""
    template = db.get(CommunicationTemplate, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"success": True, "data": template.to_dict(), "timestamp": now_utc().isoformat()}

@router.put("/templates/{template_id}", operation_id="updateCommunicationTemplate")
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
        if data.templateType is not None:
            template.template_type = data.templateType
        if data.category is not None:
            template.category = data.category
        if data.subject is not None:
            template.subject = data.subject
        if data.bodyText is not None:
            template.body_text = data.bodyText
        if data.bodyHtml is not None:
            template.body_html = data.bodyHtml
        if data.variables is not None:
            template.variables_json = data.variables
        if data.isActive is not None:
            template.is_active = data.isActive
        
        db.commit()
        db.refresh(template)
        
        return {"success": True, "data": template.to_dict(), "timestamp": now_utc().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

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

@router.get("/history", operation_id="listCommunicationHistory")
async def list_communication_history(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    patient_id: Optional[str] = None,
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
        
        if patient_id:
            query = query.filter(CommunicationHistory.patient_id == patient_id)
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
        
        return {
            "success": True,
            "data": [h.to_dict() for h in history],
            "meta": {"total": total, "page": page, "per_page": per_page, "total_pages": (total + per_page - 1) // per_page},
            "timestamp": now_utc().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/history", operation_id="createCommunicationHistory")
async def create_communication_history(
    data: HistoryCreate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Create a manual communication history entry"""
    try:
        patient = db.get(Patient, data.patientId)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        history = CommunicationHistory()
        history.patient_id = data.patientId
        history.communication_type = data.communicationType
        history.direction = data.direction
        history.subject = data.subject
        history.content = data.content
        history.contact_method = data.contactMethod
        history.status = data.status
        history.priority = data.priority
        history.metadata_json = data.metadata
        history.initiated_by = data.initiatedBy
        
        db.add(history)
        db.commit()
        db.refresh(history)
        
        return {"success": True, "data": history.to_dict(), "timestamp": now_utc().isoformat()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stats", operation_id="listCommunicationStats")
async def communication_stats(
    days: int = Query(30, ge=1, le=365),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get communication statistics"""
    try:
        date_from = now_utc() - timedelta(days=days)
        
        sms_total = db.query(SMSLog).filter(SMSLog.created_at >= date_from).count()
        sms_sent = db.query(SMSLog).filter(and_(SMSLog.created_at >= date_from, SMSLog.status == "sent")).count()
        sms_failed = db.query(SMSLog).filter(and_(SMSLog.created_at >= date_from, SMSLog.status == "failed")).count()
        
        email_total = db.query(EmailLog).filter(EmailLog.created_at >= date_from).count()
        email_sent = db.query(EmailLog).filter(and_(EmailLog.created_at >= date_from, EmailLog.status == "sent")).count()
        email_failed = db.query(EmailLog).filter(and_(EmailLog.created_at >= date_from, EmailLog.status == "failed")).count()
        
        template_count = db.query(CommunicationTemplate).filter(CommunicationTemplate.is_active == True).count()
        history_total = db.query(CommunicationHistory).filter(CommunicationHistory.created_at >= date_from).count()
        
        stats = {
            "sms": {"total": sms_total, "sent": sms_sent, "failed": sms_failed, "successRate": (sms_sent / sms_total * 100) if sms_total > 0 else 0},
            "email": {"total": email_total, "sent": email_sent, "failed": email_failed, "successRate": (email_sent / email_total * 100) if email_total > 0 else 0},
            "templates": {"active": template_count},
            "history": {"total": history_total},
            "period": {"days": days, "from": date_from.isoformat(), "to": now_utc().isoformat()}
        }
        
        return {"success": True, "data": stats, "timestamp": now_utc().isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
