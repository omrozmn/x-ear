"""Admin Integrations Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
import logging

from database import get_db
from models.integration_config import IntegrationConfig
from models.notification_template import NotificationTemplate
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from schemas.base import ResponseEnvelope
from schemas.notification_templates import EmailTemplateRead

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/admin/integrations", tags=["Admin Integrations"])

# Response models
class IntegrationListResponse(ResponseEnvelope):
    data: Optional[dict] = None

class IntegrationDetailResponse(ResponseEnvelope):
    data: Optional[dict] = None

@router.get("", operation_id="listAdminIntegrations", response_model=IntegrationListResponse)
async def get_integrations(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get all integrations"""
    try:
        configs = db.query(IntegrationConfig).all()
        
        integrations = {}
        for config in configs:
            if config.integration_type not in integrations:
                integrations[config.integration_type] = {}
            integrations[config.integration_type][config.config_key] = config.config_value
        
        return ResponseEnvelope(data={
            "integrations": integrations,
            "available": ["vatan_sms", "birfatura", "telegram"]
        })
    except Exception as e:
        logger.error(f"Get integrations error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class VatanSmsConfigUpdate(BaseModel):
    approvalEmail: Optional[str] = ""
    username: Optional[str] = ""
    password: Optional[str] = ""
    senderId: Optional[str] = ""
    isActive: Optional[bool] = False
    emailTemplate: Optional[dict] = None

class BirfaturaConfigUpdate(BaseModel):
    notificationEmail: Optional[str] = ""
    integrationKey: Optional[str] = ""
    appApiKey: Optional[str] = ""
    appSecretKey: Optional[str] = ""
    emailTemplate: Optional[dict] = None

class TelegramConfigUpdate(BaseModel):
    botToken: Optional[str] = ""
    chatId: Optional[str] = ""
    isActive: Optional[bool] = False

@router.post("/init-db", operation_id="createAdminIntegrationInitDb", response_model=ResponseEnvelope)
async def init_db(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("system.manage", admin_only=True))
):
    """Initialize integration config tables"""
    try:
        IntegrationConfig.__table__.create(db.get_bind(), checkfirst=True)
        return ResponseEnvelope(message="Integration config tables initialized")
    except Exception as e:
        logger.error(f"Init DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/vatan-sms/config", operation_id="listAdminIntegrationVatanSmConfig", response_model=IntegrationDetailResponse)
async def get_vatan_sms_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.read", admin_only=True))
):
    """Get VatanSMS integration configuration"""
    try:
        def get_config(key):
            return db.query(IntegrationConfig).filter_by(
                integration_type="vatan_sms", config_key=key
            ).first()
        
        email_config = get_config("document_approval_email")
        username_config = get_config("username")
        password_config = get_config("password")
        sender_id_config = get_config("sender_id")
        is_active_config = get_config("is_active")
        
        template = db.query(NotificationTemplate).filter_by(
            trigger_event="vatan_sms_document_uploaded", is_active=True
        ).first()
        
        return ResponseEnvelope(data={
            "approvalEmail": email_config.config_value if email_config else "",
            "username": username_config.config_value if username_config else "",
            "password": password_config.config_value if password_config else "",
            "senderId": sender_id_config.config_value if sender_id_config else "",
            "isActive": is_active_config.config_value == "true" if is_active_config else False,
            "emailTemplate": EmailTemplateRead.model_validate(template).model_dump(by_alias=True) if template else None
        })
    except Exception as e:
        logger.error(f"Get VatanSMS config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/vatan-sms/config", operation_id="updateAdminIntegrationVatanSmConfig", response_model=ResponseEnvelope)
async def update_vatan_sms_config(
    data: VatanSmsConfigUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.manage", admin_only=True))
):
    """Update VatanSMS integration configuration"""
    try:
        def update_or_create(key, value, description):
            config = db.query(IntegrationConfig).filter_by(
                integration_type="vatan_sms", config_key=key
            ).first()
            if config:
                config.config_value = value
            else:
                config = IntegrationConfig(
                    integration_type="vatan_sms",
                    config_key=key,
                    config_value=value,
                    description=description
                )
                db.add(config)
        
        update_or_create("document_approval_email", data.approvalEmail, "VatanSMS document approval email")
        update_or_create("username", data.username, "VatanSMS Username")
        update_or_create("password", data.password, "VatanSMS Password")
        update_or_create("sender_id", data.senderId, "VatanSMS Sender ID")
        update_or_create("is_active", "true" if data.isActive else "false", "VatanSMS Active Status")
        
        db.commit()
        return ResponseEnvelope(message="VatanSMS configuration updated successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Update VatanSMS config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/birfatura/config", operation_id="listAdminIntegrationBirfaturaConfig", response_model=IntegrationDetailResponse)
async def get_birfatura_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.read", admin_only=True))
):
    """Get BirFatura integration configuration"""
    try:
        def get_config(key):
            return db.query(IntegrationConfig).filter_by(
                integration_type="birfatura", config_key=key
            ).first()
        
        email_config = get_config("notification_email")
        integration_key = get_config("integration_key")
        app_api_key = get_config("app_api_key")
        app_secret_key = get_config("app_secret_key")
        
        template = db.query(NotificationTemplate).filter_by(
            trigger_event="birfatura_invoice_sent", is_active=True
        ).first()
        
        return ResponseEnvelope(data={
            "notificationEmail": email_config.config_value if email_config else "",
            "integrationKey": integration_key.config_value if integration_key else "",
            "appApiKey": app_api_key.config_value if app_api_key else "",
            "appSecretKey": app_secret_key.config_value if app_secret_key else "",
            "emailTemplate": EmailTemplateRead.model_validate(template).model_dump(by_alias=True) if template else None
        })
    except Exception as e:
        logger.error(f"Get BirFatura config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/birfatura/config", operation_id="updateAdminIntegrationBirfaturaConfig", response_model=ResponseEnvelope)
async def update_birfatura_config(
    data: BirfaturaConfigUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.manage", admin_only=True))
):
    """Update BirFatura integration configuration"""
    try:
        def update_or_create(key, value, description):
            config = db.query(IntegrationConfig).filter_by(
                integration_type="birfatura", config_key=key
            ).first()
            if config:
                config.config_value = value
            else:
                config = IntegrationConfig(
                    integration_type="birfatura",
                    config_key=key,
                    config_value=value,
                    description=description
                )
                db.add(config)
        
        update_or_create("notification_email", data.notificationEmail, "BirFatura notification email")
        update_or_create("integration_key", data.integrationKey, "BirFatura Integration Key")
        update_or_create("app_api_key", data.appApiKey, "BirFatura App API Key")
        update_or_create("app_secret_key", data.appSecretKey, "BirFatura App Secret Key")
        
        db.commit()
        return ResponseEnvelope(message="BirFatura configuration updated successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Update BirFatura config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/telegram/config", operation_id="listAdminIntegrationTelegramConfig", response_model=IntegrationDetailResponse)
async def get_telegram_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.read", admin_only=True))
):
    """Get Telegram integration configuration"""
    try:
        def get_config(key):
            return db.query(IntegrationConfig).filter_by(
                integration_type="telegram", config_key=key
            ).first()
        
        bot_token = get_config("bot_token")
        chat_id = get_config("chat_id")
        is_active = get_config("is_active")
        
        return ResponseEnvelope(data={
            "botToken": bot_token.config_value if bot_token else "",
            "chatId": chat_id.config_value if chat_id else "",
            "isActive": is_active.config_value == "true" if is_active else False
        })
    except Exception as e:
        logger.error(f"Get Telegram config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/telegram/config", operation_id="updateAdminIntegrationTelegramConfig", response_model=ResponseEnvelope)
async def update_telegram_config(
    data: TelegramConfigUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access("integrations.manage", admin_only=True))
):
    """Update Telegram integration configuration"""
    try:
        def update_or_create(key, value, description):
            config = db.query(IntegrationConfig).filter_by(
                integration_type="telegram", config_key=key
            ).first()
            if config:
                config.config_value = value
            else:
                config = IntegrationConfig(
                    integration_type="telegram",
                    config_key=key,
                    config_value=value,
                    description=description
                )
                db.add(config)
        
        update_or_create("bot_token", data.botToken, "Telegram Bot Token")
        update_or_create("chat_id", data.chatId, "Telegram Chat ID")
        update_or_create("is_active", "true" if data.isActive else "false", "Telegram Active Status")
        
        db.commit()
        return ResponseEnvelope(message="Telegram configuration updated successfully")
    except Exception as e:
        db.rollback()
        logger.error(f"Update Telegram config error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
