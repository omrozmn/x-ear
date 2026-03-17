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
    """
    Generate AI auto-reply using the FULL AI pipeline.

    Flow: intent_refiner → entity_resolver → tool_execution → response_formatter
    This means WhatsApp users can actually DO things:
    - "Yarın randevum var mı?" → DB query → real answer
    - "Stok durumu ne?" → low_stock_alerts tool → formatted response
    - "Mehmet Kaya'nın bilgileri" → entity resolve → party summary
    """
    db = SessionLocal()
    try:
        # 1. Get sector context
        from ai.services.sector_context import get_sector_context
        sector_ctx = get_sector_context(db, tenant_id)
        ai_desc = sector_ctx.get("ai_context", {}).get("system_description_tr", "CRM sistemi")
        party_term = sector_ctx.get("party_term", "müşteri")

        if not prompt_prefix or "X-Ear" in prompt_prefix:
            prompt_prefix = f"Sen {ai_desc} adına kibar, kısa ve yardımcı bir WhatsApp asistanısın."

        # 2. Classify intent
        refiner = get_intent_refiner()
        result = await refiner.refine_intent(
            user_message=f"{prompt_prefix}\n\n{party_term.capitalize()} mesaji: {message_text}",
            tenant_id=tenant_id,
            user_id="whatsapp_auto_reply",
            context={"channel": "whatsapp", "chat_title": chat_title, "sector": sector_ctx},
            language="tr",
        )

        if not result.is_success or not result.intent:
            return result.clarification_question or "Mesajınızı aldım. En kısa sürede dönüş yapacağım."

        # 3. Entity resolution (if party name mentioned)
        entities = result.intent.entities or {}
        if entities.get("party_name") and not entities.get("party_id"):
            try:
                from ai.services.entity_resolver import get_entity_resolver
                resolver = get_entity_resolver(db)
                resolution = resolver.resolve_party(entities["party_name"], tenant_id)
                if resolution.resolved and resolution.entity:
                    entities["party_id"] = resolution.entity.entity_id
                elif resolution.needs_clarification:
                    return resolution.clarification_message
            except Exception:
                pass

        # 4. Execute tool based on intent (read-only operations only for WhatsApp)
        from ai.services.response_formatter import get_response_formatter
        formatter = get_response_formatter(locale="tr")
        intent_type = str(result.intent.intent_type.value) if result.intent.intent_type else ""
        action_type = entities.get("action_type") or entities.get("query_type") or ""

        tool_result = None
        tool_id = None

        # Map common WhatsApp queries to tools
        if action_type in ("appointments_list", "check_appointment_availability") or "randevu" in message_text.lower():
            tool_id = "listAppointments"
            from ai.tools import get_tool_registry
            registry = get_tool_registry()
            tool_result = registry.execute_tool(
                tool_id="listAppointments",
                parameters={"tenant_id": tenant_id, "party_id": entities.get("party_id"), "per_page": 5},
                mode="simulate",
            )

        elif action_type in ("party_view", "get_party_comprehensive_summary") and entities.get("party_id"):
            tool_id = "get_party_comprehensive_summary"
            from ai.tools import get_tool_registry
            registry = get_tool_registry()
            tool_result = registry.execute_tool(
                tool_id="get_party_comprehensive_summary",
                parameters={"party_id": entities["party_id"]},
                mode="simulate",
            )

        elif "stok" in message_text.lower() or action_type == "get_low_stock_alerts":
            tool_id = "get_low_stock_alerts"
            from ai.tools import get_tool_registry
            registry = get_tool_registry()
            tool_result = registry.execute_tool(
                tool_id="get_low_stock_alerts",
                parameters={"tenant_id": tenant_id},
                mode="simulate",
            )

        elif "bugün" in message_text.lower() or "özet" in message_text.lower():
            from ai.services.daily_briefing import generate_daily_briefing, format_briefing
            briefing = generate_daily_briefing(db, tenant_id, locale="tr")
            return format_briefing(briefing, locale="tr")

        # 5. Format response
        if tool_result and tool_id:
            return formatter.format(
                tool_id=tool_id,
                result=tool_result.result if tool_result.result else {},
                success=tool_result.success,
                error=tool_result.error,
            )

        # Fallback to conversational response
        if result.intent.conversational_response:
            return result.intent.conversational_response
        return "Mesajınızı aldım. En kısa sürede dönüş yapacağım."

    except Exception as e:
        logger.error(f"WhatsApp AI reply failed: {e}")
        return "Mesajınızı aldım. En kısa sürede dönüş yapacağım."
    finally:
        db.close()


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
    return ResponseEnvelope(data=[WhatsAppInboxMessage.model_validate(item, from_attributes=True).model_dump(by_alias=True) for item in items])


# =============================================================================
# Incoming Webhook — Real-time WhatsApp → AI
# =============================================================================

@router.post("/webhook", operation_id="whatsappWebhookReceive")
async def webhook_receive(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Incoming webhook for WhatsApp messages.

    Third-party WhatsApp providers (WAHA, Baileys, etc.) can POST
    incoming messages here for real-time AI processing.

    Expected payload:
    {
        "tenant_id": "...",
        "phone": "905321234567",
        "message": "Yarın randevum var mı?",
        "chat_id": "...",
        "message_id": "..."
    }
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    tenant_id = body.get("tenant_id")
    phone = body.get("phone") or body.get("from")
    message_text = body.get("message") or body.get("text") or body.get("body", "")
    chat_id = body.get("chat_id") or phone
    message_id = body.get("message_id") or body.get("id")

    if not tenant_id or not phone or not message_text:
        raise HTTPException(status_code=400, detail="Missing required fields: tenant_id, phone, message")

    # Verify tenant exists
    from models.tenant import Tenant
    tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")

    # Store incoming message
    stored = _store_and_log_whatsapp_message(
        db=db,
        tenant_id=tenant_id,
        chat_id=chat_id,
        chat_title=phone,
        phone_number=phone,
        message_text=message_text,
        direction="inbound",
        external_message_id=message_id,
    )

    # Check if auto-reply is enabled
    auto_reply_enabled = _get_config_value(db, tenant_id, "auto_reply_enabled", "false") == "true"
    reply_text = None

    if auto_reply_enabled:
        auto_reply_prompt = _get_config_value(db, tenant_id, "auto_reply_prompt", "").strip()
        reply_text = await _generate_auto_reply(tenant_id, phone, message_text, auto_reply_prompt)

        # Send reply via WhatsApp
        try:
            manager = get_whatsapp_session_manager()
            manager.send_reply_to_chat(tenant_id, chat_id, reply_text)
            _store_and_log_whatsapp_message(
                db=db,
                tenant_id=tenant_id,
                chat_id=chat_id,
                chat_title=phone,
                phone_number=phone,
                message_text=reply_text,
                direction="outbound",
                external_message_id=f"auto-{message_id}" if message_id else None,
                initiated_by="whatsapp_webhook_ai",
            )
        except Exception as exc:
            logger.error("WhatsApp webhook auto-reply failed: %s", exc)

    db.commit()
    return {
        "status": "received",
        "message_stored": stored is not None,
        "auto_reply_sent": reply_text is not None,
        "reply_preview": reply_text[:100] if reply_text else None,
    }
