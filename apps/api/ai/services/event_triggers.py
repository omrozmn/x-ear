"""
Event-Driven Insight Triggers for AI Layer

Listens to critical business events and creates immediate insights
instead of waiting for the hourly scheduled analysis.

Events:
- Appointment cancelled/no-show → immediate follow-up suggestion
- Stock hits zero → critical alert
- Payment overdue → payment reminder insight
- New patient created → welcome campaign suggestion

Integration: Call trigger_event() from routers/services after DB commit.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


class EventType:
    APPOINTMENT_CANCELLED = "appointment_cancelled"
    APPOINTMENT_NO_SHOW = "appointment_no_show"
    STOCK_ZERO = "stock_zero"
    PAYMENT_OVERDUE = "payment_overdue"
    NEW_PATIENT = "new_patient"
    DEVICE_WARRANTY_EXPIRED = "device_warranty_expired"
    INVOICE_NOT_SENT = "invoice_not_sent_48h"


def trigger_event(
    db: Session,
    event_type: str,
    tenant_id: str,
    entity_type: str,
    entity_id: str,
    data: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    """
    Trigger an immediate insight from a business event.

    Args:
        db: Database session
        event_type: One of EventType constants
        tenant_id: Tenant ID
        entity_type: "party", "appointment", "inventory", "invoice"
        entity_id: Entity ID
        data: Additional event data

    Returns:
        Opportunity ID if created, None if suppressed/duplicate
    """
    data = data or {}

    try:
        from ai.models.opportunity import AIOpportunity

        # Dedup: Don't create duplicate insights for same entity within 24h
        existing = db.query(AIOpportunity).filter(
            AIOpportunity.tenant_id == tenant_id,
            AIOpportunity.entity_id == entity_id,
            AIOpportunity.category == event_type,
            AIOpportunity.status.in_(["new", "viewed"]),
        ).first()

        if existing:
            logger.debug(f"Suppressed duplicate event insight: {event_type} for {entity_id}")
            return None

        # Build insight based on event type
        insight = _build_insight(event_type, entity_type, entity_id, data)
        if not insight:
            return None

        opportunity = AIOpportunity(
            tenant_id=tenant_id,
            entity_type=entity_type,
            entity_id=entity_id,
            category=event_type,
            priority=insight["priority"],
            title=insight["title"],
            summary=insight["summary"],
            evidence=insight.get("evidence", {}),
            recommended_action=insight.get("recommended_action"),
            status="new",
            source="event_trigger",
            confidence=insight.get("confidence", 0.9),
            impact_score=insight.get("impact", 0.7),
        )
        db.add(opportunity)
        db.commit()

        logger.info(f"Event-driven insight created: {event_type} for {entity_id} (tenant: {tenant_id})")
        return opportunity.id

    except Exception as e:
        logger.error(f"Event trigger failed for {event_type}/{entity_id}: {e}")
        db.rollback()
        return None


def _build_insight(event_type: str, entity_type: str, entity_id: str, data: Dict) -> Optional[Dict]:
    """Build insight details based on event type."""

    if event_type == EventType.APPOINTMENT_CANCELLED:
        party_name = data.get("party_name", "Hasta")
        return {
            "priority": "high",
            "title": f"Randevu İptali: {party_name}",
            "summary": f"{party_name} randevusunu iptal etti. Yeniden planlama veya takip önerilir.",
            "evidence": {"party_name": party_name, "cancelled_date": data.get("date")},
            "recommended_action": "reschedule_appointment",
            "confidence": 0.95,
            "impact": 0.7,
        }

    if event_type == EventType.APPOINTMENT_NO_SHOW:
        party_name = data.get("party_name", "Hasta")
        return {
            "priority": "high",
            "title": f"Randevuya Gelmedi: {party_name}",
            "summary": f"{party_name} randevusuna gelmedi. SMS hatırlatma veya telefon araması önerilir.",
            "evidence": {"party_name": party_name, "missed_date": data.get("date")},
            "recommended_action": "notification_send",
            "confidence": 1.0,
            "impact": 0.8,
        }

    if event_type == EventType.STOCK_ZERO:
        product_name = data.get("product_name", "Ürün")
        return {
            "priority": "critical",
            "title": f"Stok Tükendi: {product_name}",
            "summary": f"{product_name} stoku sıfıra düştü! Acil sipariş gerekli.",
            "evidence": {"product": product_name, "last_stock_date": data.get("date")},
            "recommended_action": "notification_send",
            "confidence": 1.0,
            "impact": 0.95,
        }

    if event_type == EventType.PAYMENT_OVERDUE:
        party_name = data.get("party_name", "Hasta")
        amount = data.get("amount", 0)
        return {
            "priority": "high",
            "title": f"Ödeme Gecikti: {party_name}",
            "summary": f"{party_name} — {amount:,.0f} ₺ tutarında ödeme vadesi geçti.",
            "evidence": {"party_name": party_name, "amount": amount, "due_date": data.get("due_date")},
            "recommended_action": "notification_send",
            "confidence": 1.0,
            "impact": 0.8,
        }

    if event_type == EventType.NEW_PATIENT:
        party_name = data.get("party_name", "Yeni Hasta")
        return {
            "priority": "medium",
            "title": f"Yeni Hasta: {party_name}",
            "summary": f"{party_name} kaydedildi. Hoş geldiniz SMS'i ve ilk randevu önerilir.",
            "evidence": {"party_name": party_name},
            "recommended_action": "notification_send",
            "confidence": 0.9,
            "impact": 0.5,
        }

    if event_type == EventType.DEVICE_WARRANTY_EXPIRED:
        party_name = data.get("party_name", "Hasta")
        device = data.get("device_name", "Cihaz")
        return {
            "priority": "medium",
            "title": f"Garanti Bitti: {party_name} - {device}",
            "summary": f"{party_name}'ın {device} cihazının garantisi sona erdi. Uzatılmış garanti teklifi önerilir.",
            "evidence": {"party_name": party_name, "device": device},
            "recommended_action": "notification_send",
            "confidence": 0.9,
            "impact": 0.6,
        }

    if event_type == EventType.INVOICE_NOT_SENT:
        invoice_number = data.get("invoice_number", "")
        return {
            "priority": "critical",
            "title": f"Fatura GİB'e Gönderilmedi: {invoice_number}",
            "summary": f"Fatura {invoice_number} 48 saatten fazla süredir GİB'e gönderilmedi. Yasal süre aşılıyor!",
            "evidence": {"invoice_number": invoice_number},
            "recommended_action": "generate_and_send_e_invoice",
            "confidence": 1.0,
            "impact": 0.95,
        }

    logger.warning(f"Unknown event type: {event_type}")
    return None
