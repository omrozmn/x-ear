from __future__ import annotations

import logging
import re
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ai.agents.intent_refiner import get_intent_refiner
from core.database import SessionLocal, engine
from core.models.communication import CommunicationHistory
from core.models.integration_config import IntegrationConfig
from core.models.party import Party
from core.models.whatsapp import WhatsAppMessage
from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.base import ResponseEnvelope
from schemas.whatsapp import (
    WhatsAppAIRequest,
    WhatsAppBulkSendRequest,
    WhatsAppBulkSendResult,
    WhatsAppConfigRead,
    WhatsAppConfigUpdate,
    WhatsAppInboxMessage,
    WhatsAppSendResult,
    WhatsAppSessionStatus,
    WhatsAppSingleSendRequest,
    WhatsAppSyncResult,
)
from services.whatsapp_session_service import get_whatsapp_session_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp"])
WhatsAppMessage.__table__.create(bind=engine, checkfirst=True)


def _tenant_id(access: UnifiedAccess) -> str:
    tenant_id = access.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return tenant_id


def _normalize_phone(raw: str, default_country_code: str = "90") -> str:
    digits = re.sub(r"\D", "", raw or "")
    if not digits:
        return ""
    if digits.startswith("00"):
        return digits[2:]
    if digits.startswith("0"):
        return f"{default_country_code}{digits[1:]}"
    if len(digits) == 10:
        return f"{default_country_code}{digits}"
    return digits


def _get_config_value(db: Session, tenant_id: str, key: str, fallback: str = "") -> str:
    config = db.query(IntegrationConfig).filter_by(
        tenant_id=tenant_id,
        integration_type="whatsapp_session",
        config_key=key,
    ).first()
    return config.config_value if config else fallback


def _upsert_config(db: Session, tenant_id: str, key: str, value: str, description: str) -> None:
    config = db.query(IntegrationConfig).filter_by(
        tenant_id=tenant_id,
        integration_type="whatsapp_session",
        config_key=key,
    ).first()
    if config:
        config.config_value = value
    else:
        db.add(
            IntegrationConfig(
                tenant_id=tenant_id,
                integration_type="whatsapp_session",
                config_key=key,
                config_value=value,
                description=description,
            )
        )


def _resolve_party_by_phone(db: Session, tenant_id: str, phone_number: str) -> Optional[Party]:
    digits = re.sub(r"\D", "", phone_number)
    if not digits:
        return None
    parties = db.query(Party).filter(Party.tenant_id == tenant_id).all()
    for party in parties:
        party_digits = re.sub(r"\D", "", party.phone or "")
        if party_digits.endswith(digits[-10:]):
            return party
    return None


def _log_whatsapp_history(
    db: Session,
    tenant_id: str,
    phone_number: str,
    message: str,
    direction: str,
    party_id: Optional[str] = None,
    chat_id: Optional[str] = None,
    chat_title: Optional[str] = None,
    external_message_id: Optional[str] = None,
    initiated_by: Optional[str] = None,
) -> None:
    party = db.get(Party, party_id) if party_id else _resolve_party_by_phone(db, tenant_id, phone_number)
    if not party:
        return
    history = CommunicationHistory(
        tenant_id=tenant_id,
        party_id=party.id,
        communication_type="whatsapp",
        direction=direction,
        content=message,
        contact_method=phone_number,
        status="completed",
        initiated_by=initiated_by,
    )
    history.metadata_json = {
        "channel": "whatsapp",
        "chatId": chat_id,
        "chatTitle": chat_title,
        "externalMessageId": external_message_id,
    }
    db.add(history)


def _store_whatsapp_message(
    db: Session,
    tenant_id: str,
    chat_id: str,
    chat_title: str,
    message_text: str,
    direction: str,
    phone_number: Optional[str] = None,
    external_message_id: Optional[str] = None,
) -> Optional[WhatsAppMessage]:
    exists = db.query(WhatsAppMessage).filter_by(
        tenant_id=tenant_id,
        chat_id=chat_id,
        external_message_id=external_message_id,
        direction=direction,
    ).first() if external_message_id else None
    if exists:
        return None

    party = _resolve_party_by_phone(db, tenant_id, phone_number or chat_title or "")
    msg = WhatsAppMessage(
        tenant_id=tenant_id,
        party_id=party.id if party else None,
        direction=direction,
        status="received" if direction == "inbound" else "sent",
        chat_id=chat_id,
        chat_title=chat_title,
        phone_number=phone_number,
        message_text=message_text,
        external_message_id=external_message_id,
    )
    db.add(msg)
    return msg


def _store_and_log_whatsapp_message(
    db: Session,
    tenant_id: str,
    chat_id: str,
    chat_title: str,
    message_text: str,
    direction: str,
    phone_number: Optional[str] = None,
    external_message_id: Optional[str] = None,
    party_id: Optional[str] = None,
    initiated_by: Optional[str] = None,
) -> Optional[WhatsAppMessage]:
    stored = _store_whatsapp_message(
        db=db,
        tenant_id=tenant_id,
        chat_id=chat_id,
        chat_title=chat_title,
        message_text=message_text,
        direction=direction,
        phone_number=phone_number,
        external_message_id=external_message_id,
    )
    if not stored:
        return None

    _log_whatsapp_history(
        db=db,
        tenant_id=tenant_id,
        phone_number=phone_number or chat_title or chat_id,
        message=message_text,
        direction=direction,
        party_id=party_id or stored.party_id,
        chat_id=chat_id,
        chat_title=chat_title,
        external_message_id=external_message_id,
        initiated_by=initiated_by,
    )
    return stored


async def _generate_auto_reply(tenant_id: str, chat_title: str, message_text: str, prompt_prefix: str) -> str:
    refiner = get_intent_refiner()
    result = await refiner.refine_intent(
        user_message=f"{prompt_prefix}\n\nHasta mesaji: {message_text}",
        tenant_id=tenant_id,
        user_id="whatsapp_auto_reply",
        context={"channel": "whatsapp", "chat_title": chat_title},
        language="tr",
    )
    if result.intent and result.intent.conversational_response:
        return result.intent.conversational_response
    if result.clarification_question:
        return result.clarification_question
    return "Mesajinizi aldim. En kisa surede size donus yapacagim."


async def sync_whatsapp_inbox_for_tenant(tenant_id: str, limit: int = 10) -> dict:
    db = SessionLocal()
    try:
        manager = get_whatsapp_session_manager()
        auto_reply_enabled = _get_config_value(db, tenant_id, "auto_reply_enabled", "false") == "true"
        auto_reply_prompt = _get_config_value(db, tenant_id, "auto_reply_prompt", "").strip() or (
            "Sen X-Ear CRM adina kibar, kisa ve yardimci bir WhatsApp asistanisin."
        )

        payload = manager.sync_recent(tenant_id, limit=limit)
        imported = 0
        auto_replied = 0
        for chat in payload.get("chats", []):
            chat_id = chat.get("chatId") or chat.get("chatTitle")
            chat_title = chat.get("chatTitle") or chat_id
            for item in chat.get("messages", []):
                local_id = item.get("localId")
                direction = item.get("direction", "inbound")
                text = item.get("messageText", "").strip()
                if not text:
                    continue
                stored = _store_and_log_whatsapp_message(
                    db=db,
                    tenant_id=tenant_id,
                    chat_id=chat_id,
                    chat_title=chat_title,
                    phone_number=chat_title,
                    message_text=text,
                    direction=direction,
                    external_message_id=local_id,
                )
                if stored:
                    imported += 1
                    if direction == "inbound" and auto_reply_enabled:
                        reply_text = await _generate_auto_reply(tenant_id, chat_title, text, auto_reply_prompt)
                        try:
                            manager.send_reply_to_chat(tenant_id, chat_id, reply_text)
                            _store_and_log_whatsapp_message(
                                db=db,
                                tenant_id=tenant_id,
                                chat_id=chat_id,
                                chat_title=chat_title,
                                phone_number=chat_title,
                                message_text=reply_text,
                                direction="outbound",
                                external_message_id=f"auto-{local_id}",
                                initiated_by="whatsapp_auto_reply",
                            )
                            auto_replied += 1
                        except Exception as exc:
                            logger.error("WhatsApp auto-reply hatasi: %s", exc)
        db.commit()
        return {"imported": imported, "autoReplied": auto_replied}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@router.get("/session/status", response_model=ResponseEnvelope[WhatsAppSessionStatus], operation_id="getWhatsAppSessionStatus")
async def get_session_status(
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    manager = get_whatsapp_session_manager()
    return ResponseEnvelope(data=manager.status(tenant_id))


@router.post("/session/start", response_model=ResponseEnvelope[WhatsAppSessionStatus], operation_id="createWhatsAppSessionStart")
async def start_session(
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    manager = get_whatsapp_session_manager()
    try:
        data = manager.start(tenant_id)
    except Exception as exc:
        logger.error("WhatsApp session baslatma hatasi: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    return ResponseEnvelope(data=data, message="WhatsApp session hazir")


@router.post("/session/disconnect", response_model=ResponseEnvelope[dict], operation_id="createWhatsAppSessionDisconnect")
async def disconnect_session(
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    manager = get_whatsapp_session_manager()
    try:
        data = manager.disconnect(tenant_id)
    except Exception as exc:
        logger.error("WhatsApp session kapatma hatasi: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    return ResponseEnvelope(data=data, message="WhatsApp session kapatildi")


@router.get("/config", response_model=ResponseEnvelope[WhatsAppConfigRead], operation_id="getWhatsAppConfig")
async def get_config(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    data = {
        "aiTargetPhone": _get_config_value(db, tenant_id, "ai_target_phone", ""),
        "defaultCountryCode": _get_config_value(db, tenant_id, "default_country_code", "90"),
        "autoReplyEnabled": _get_config_value(db, tenant_id, "auto_reply_enabled", "false") == "true",
        "autoReplyPrompt": _get_config_value(db, tenant_id, "auto_reply_prompt", ""),
    }
    return ResponseEnvelope(data=data)


@router.put("/config", response_model=ResponseEnvelope[WhatsAppConfigRead], operation_id="updateWhatsAppConfig")
async def update_config(
    payload: WhatsAppConfigUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    _upsert_config(db, tenant_id, "ai_target_phone", payload.ai_target_phone or "", "WhatsApp AI hedef numarasi")
    _upsert_config(db, tenant_id, "default_country_code", payload.default_country_code or "90", "WhatsApp varsayilan ulke kodu")
    _upsert_config(db, tenant_id, "auto_reply_enabled", "true" if payload.auto_reply_enabled else "false", "WhatsApp otomatik yanit aktif")
    _upsert_config(db, tenant_id, "auto_reply_prompt", payload.auto_reply_prompt or "", "WhatsApp otomatik yanit promptu")
    db.commit()
    return ResponseEnvelope(data={
        "aiTargetPhone": payload.ai_target_phone or "",
        "defaultCountryCode": payload.default_country_code or "90",
        "autoReplyEnabled": payload.auto_reply_enabled,
        "autoReplyPrompt": payload.auto_reply_prompt or "",
    })


@router.post("/messages/send", response_model=ResponseEnvelope[WhatsAppSendResult], operation_id="createWhatsAppSendMessage")
async def send_message(
    payload: WhatsAppSingleSendRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    manager = get_whatsapp_session_manager()
    default_country_code = _get_config_value(db, tenant_id, "default_country_code", "90")
    normalized_phone = _normalize_phone(payload.phone_number, default_country_code)
    try:
        data = manager.send_message(tenant_id, normalized_phone, payload.message)
        _store_and_log_whatsapp_message(
            db=db,
            tenant_id=tenant_id,
            chat_id=normalized_phone,
            chat_title=normalized_phone,
            phone_number=normalized_phone,
            message_text=payload.message,
            direction="outbound",
            party_id=payload.party_id,
            initiated_by="whatsapp_manual_send",
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("WhatsApp mesaj gonderim hatasi: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    return ResponseEnvelope(data=data, message="WhatsApp mesaji gonderildi")


@router.post("/messages/send-bulk", response_model=ResponseEnvelope[WhatsAppBulkSendResult], operation_id="createWhatsAppSendBulk")
async def send_bulk(
    payload: WhatsAppBulkSendRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    default_country_code = _get_config_value(db, tenant_id, "default_country_code", "90")

    messages: List[dict[str, str]] = []
    parties_map: dict[str, str] = {}

    if payload.phone_numbers:
        for phone_number in payload.phone_numbers:
            normalized = _normalize_phone(phone_number, default_country_code)
            if normalized:
                messages.append({"phoneNumber": normalized, "message": payload.message})

    if payload.party_ids:
        parties = db.query(Party).filter(Party.tenant_id == tenant_id, Party.id.in_(payload.party_ids)).all()
        for party in parties:
            normalized = _normalize_phone(party.phone, default_country_code)
            if normalized:
                messages.append({"phoneNumber": normalized, "message": payload.message})
                parties_map[normalized] = party.id

    if payload.filters:
        query = db.query(Party).filter(Party.tenant_id == tenant_id)
        if payload.filters.status:
            query = query.filter(Party.status == payload.filters.status)
        if payload.filters.segment:
            query = query.filter(Party.segment == payload.filters.segment)
        for party in query.all():
            normalized = _normalize_phone(party.phone, default_country_code)
            if normalized:
                messages.append({"phoneNumber": normalized, "message": payload.message})
                parties_map[normalized] = party.id

    deduped: list[dict[str, str]] = []
    seen = set()
    for item in messages:
        phone = item["phoneNumber"]
        if phone in seen:
            continue
        seen.add(phone)
        deduped.append(item)

    if not deduped:
        raise HTTPException(status_code=400, detail="Gonderilecek WhatsApp alicisi bulunamadi")

    manager = get_whatsapp_session_manager()
    try:
        result = manager.send_bulk(tenant_id, deduped)
        for entry in result.get("results", []):
            if entry.get("ok"):
                _store_and_log_whatsapp_message(
                    db=db,
                    tenant_id=tenant_id,
                    chat_id=entry["phoneNumber"],
                    chat_title=entry["phoneNumber"],
                    phone_number=entry["phoneNumber"],
                    message_text=payload.message,
                    direction="outbound",
                    party_id=parties_map.get(entry["phoneNumber"]),
                    initiated_by="whatsapp_bulk_send",
                )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("WhatsApp toplu gonderim hatasi: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))

    return ResponseEnvelope(data=result, message="WhatsApp toplu gonderim tamamlandi")


@router.post("/messages/send-ai", response_model=ResponseEnvelope[WhatsAppSendResult], operation_id="createWhatsAppSendAi")
async def send_ai_message(
    payload: WhatsAppAIRequest,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    default_country_code = _get_config_value(db, tenant_id, "default_country_code", "90")
    target_phone = payload.phone_number or _get_config_value(db, tenant_id, "ai_target_phone", "")
    normalized_phone = _normalize_phone(target_phone, default_country_code)
    if not normalized_phone:
        raise HTTPException(status_code=400, detail="AI chatbot hedef numarasi tanimli degil")
    manager = get_whatsapp_session_manager()
    try:
        result = manager.send_message(tenant_id, normalized_phone, payload.prompt)
        _store_and_log_whatsapp_message(
            db=db,
            tenant_id=tenant_id,
            chat_id=normalized_phone,
            chat_title=normalized_phone,
            phone_number=normalized_phone,
            message_text=payload.prompt,
            direction="outbound",
            initiated_by="whatsapp_ai_request",
        )
        db.commit()
    except Exception as exc:
        db.rollback()
        logger.error("WhatsApp AI mesaj hatasi: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    return ResponseEnvelope(data=result, message="AI talebi WhatsApp uzerinden gonderildi")


@router.post("/inbox/sync", response_model=ResponseEnvelope[WhatsAppSyncResult], operation_id="createWhatsAppInboxSync")
async def sync_inbox(
    limit: int = 10,
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    try:
        payload = await sync_whatsapp_inbox_for_tenant(tenant_id, limit=limit)
    except Exception as exc:
        logger.error("WhatsApp inbox sync hatasi: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))
    return ResponseEnvelope(data=payload, message="WhatsApp inbox senkronize edildi")


@router.get("/inbox", response_model=ResponseEnvelope[List[WhatsAppInboxMessage]], operation_id="listWhatsAppInbox")
async def list_inbox(
    limit: int = 100,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access()),
):
    tenant_id = _tenant_id(access)
    items = (
        db.query(WhatsAppMessage)
        .filter(WhatsAppMessage.tenant_id == tenant_id)
        .order_by(WhatsAppMessage.created_at.desc())
        .limit(limit)
        .all()
    )
    return ResponseEnvelope(data=[item.to_dict() for item in items])
