"""
Daily Briefing Generator for AI Layer

Generates a morning briefing summary for the tenant.
Triggered when user asks "bugün ne var?", "günlük özet", "daily brief".

Zero LLM tokens — pure SQL aggregation + template formatting.
"""

import logging
from datetime import datetime, timezone, timedelta, date, time
from typing import Dict, Any, List

from sqlalchemy import func, and_
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)


def generate_daily_briefing(db: Session, tenant_id: str, locale: str = "tr") -> Dict[str, Any]:
    """Generate today's briefing for a tenant."""
    today = date.today()
    today_start = datetime.combine(today, time.min)
    today_end = datetime.combine(today, time.max)
    tomorrow = today + timedelta(days=1)
    tomorrow_start = datetime.combine(tomorrow, time.min)
    tomorrow_end = datetime.combine(tomorrow, time.max)

    briefing = {
        "date": today.isoformat(),
        "sections": [],
    }

    # 1. Today's appointments
    try:
        from models.appointment import Appointment
        todays_apts = db.query(Appointment).filter(
            Appointment.tenant_id == tenant_id,
            Appointment.date >= today_start,
            Appointment.date <= today_end,
            Appointment.status != "cancelled",
        ).order_by(Appointment.date.asc()).all()

        apt_list = [
            {"time": a.date.strftime("%H:%M") if a.date else "", "partyId": a.party_id, "type": a.appointment_type or "", "status": a.status}
            for a in todays_apts[:15]
        ]
        briefing["sections"].append({
            "key": "appointments_today",
            "title": "Bugünkü Randevular" if locale == "tr" else "Today's Appointments",
            "count": len(todays_apts),
            "items": apt_list,
        })
    except Exception as e:
        logger.warning(f"Briefing: appointments failed: {e}")

    # 2. Tomorrow's preview
    try:
        from models.appointment import Appointment
        tomorrows_count = db.query(func.count(Appointment.id)).filter(
            Appointment.tenant_id == tenant_id,
            Appointment.date >= tomorrow_start,
            Appointment.date <= tomorrow_end,
            Appointment.status != "cancelled",
        ).scalar() or 0
        briefing["sections"].append({
            "key": "appointments_tomorrow",
            "title": "Yarınki Randevular" if locale == "tr" else "Tomorrow's Appointments",
            "count": tomorrows_count,
        })
    except Exception:
        pass

    # 3. Overdue payments
    try:
        from core.models.sales import PaymentInstallment, Sale
        overdue = db.query(
            func.count(PaymentInstallment.id).label('count'),
            func.sum(PaymentInstallment.amount).label('total')
        ).join(Sale, PaymentInstallment.sale_id == Sale.id).filter(
            Sale.tenant_id == tenant_id,
            PaymentInstallment.status == 'pending',
            PaymentInstallment.due_date < today_start,
        ).first()

        if overdue and overdue[0] and overdue[0] > 0:
            briefing["sections"].append({
                "key": "overdue_payments",
                "title": "Vadesi Geçmiş Ödemeler" if locale == "tr" else "Overdue Payments",
                "count": overdue[0],
                "total_amount": float(overdue[1] or 0),
            })
    except Exception as e:
        logger.warning(f"Briefing: overdue payments failed: {e}")

    # 4. Low stock alerts
    try:
        from models.inventory import InventoryItem
        low_stock_count = db.query(func.count(InventoryItem.id)).filter(
            InventoryItem.tenant_id == tenant_id,
            InventoryItem.quantity <= InventoryItem.reorder_level,
        ).scalar() or 0

        if low_stock_count > 0:
            briefing["sections"].append({
                "key": "low_stock",
                "title": "Stok Uyarıları" if locale == "tr" else "Stock Alerts",
                "count": low_stock_count,
            })
    except Exception:
        pass

    # 5. Birthdays today
    try:
        from models.party import Party
        from sqlalchemy import extract
        birthdays = db.query(Party).filter(
            Party.tenant_id == tenant_id,
            extract('month', Party.birth_date) == today.month,
            extract('day', Party.birth_date) == today.day,
        ).all()

        if birthdays:
            briefing["sections"].append({
                "key": "birthdays",
                "title": "Doğum Günleri" if locale == "tr" else "Birthdays",
                "count": len(birthdays),
                "names": [f"{p.first_name} {p.last_name}" for p in birthdays[:5]],
            })
    except Exception:
        pass

    # 6. Pending AI insights
    try:
        from ai.models.opportunity import AIOpportunity
        pending_insights = db.query(func.count(AIOpportunity.id)).filter(
            AIOpportunity.tenant_id == tenant_id,
            AIOpportunity.status == "new",
        ).scalar() or 0

        if pending_insights > 0:
            briefing["sections"].append({
                "key": "ai_insights",
                "title": "AI Önerileri" if locale == "tr" else "AI Insights",
                "count": pending_insights,
            })
    except Exception:
        pass

    return briefing


def format_briefing(briefing: Dict[str, Any], locale: str = "tr") -> str:
    """Format briefing dict into natural language."""
    lines = []

    if locale == "tr":
        lines.append(f"**Günlük Brifing — {briefing['date']}**\n")
    else:
        lines.append(f"**Daily Briefing — {briefing['date']}**\n")

    for section in briefing.get("sections", []):
        key = section["key"]
        title = section["title"]
        count = section.get("count", 0)

        if key == "appointments_today":
            lines.append(f"📅 **{title}**: {count} randevu")
            for apt in section.get("items", [])[:5]:
                lines.append(f"  • {apt['time']} — {apt.get('type', '')} ({apt.get('status', '')})")

        elif key == "appointments_tomorrow":
            lines.append(f"📅 **{title}**: {count} randevu")

        elif key == "overdue_payments":
            total = section.get("total_amount", 0)
            lines.append(f"💸 **{title}**: {count} adet, toplam {total:,.0f} ₺")

        elif key == "low_stock":
            lines.append(f"⚠️ **{title}**: {count} ürün kritik seviyede")

        elif key == "birthdays":
            names = ", ".join(section.get("names", []))
            lines.append(f"🎂 **{title}**: {names}")

        elif key == "ai_insights":
            lines.append(f"🤖 **{title}**: {count} yeni öneri bekliyor")

    if not briefing.get("sections"):
        lines.append("Bugün için özel bir durum yok. İyi çalışmalar!" if locale == "tr" else "Nothing special today. Have a good day!")

    return "\n".join(lines)
