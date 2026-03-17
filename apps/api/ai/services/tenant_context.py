"""
Tenant Context Generator for AI Layer

Generates a compact JSON summary of tenant statistics (~150 tokens).
Injected into every AI chat request so the LLM knows the tenant's
data landscape without querying the database.

Cached per tenant with hourly refresh.
"""

import logging
import threading
from datetime import datetime, timezone, timedelta, date
from typing import Dict, Any, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Cache: {tenant_id: {"data": dict, "expires_at": datetime}}
_cache: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()
_CACHE_TTL_SECONDS = 3600  # 1 hour


def get_tenant_context(db: Session, tenant_id: str) -> Dict[str, Any]:
    """
    Get compact tenant context for AI chat injection.

    Returns cached data if fresh, otherwise regenerates.
    ~150 tokens when serialized.
    """
    now = datetime.now(timezone.utc)

    with _cache_lock:
        cached = _cache.get(tenant_id)
        if cached and cached["expires_at"] > now:
            return cached["data"]

    # Generate fresh context
    context = _generate_context(db, tenant_id)

    with _cache_lock:
        _cache[tenant_id] = {
            "data": context,
            "expires_at": now + timedelta(seconds=_CACHE_TTL_SECONDS),
        }

    return context


def invalidate_tenant_context(tenant_id: str) -> None:
    """Invalidate cache for a tenant (call after significant data changes)."""
    with _cache_lock:
        _cache.pop(tenant_id, None)


def _generate_context(db: Session, tenant_id: str) -> Dict[str, Any]:
    """Generate tenant context from database. Runs ~5 COUNT queries."""
    try:
        from models.party import Party
        from models.appointment import Appointment
        from models.inventory import InventoryItem
        from models.sales import Sale

        today = date.today()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=7)

        # Tenant name
        from models.tenant import Tenant
        tenant = db.query(Tenant.name).filter(Tenant.id == tenant_id).first()
        tenant_name = tenant[0] if tenant else tenant_id

        # Party stats
        party_count = db.query(func.count(Party.id)).filter(
            Party.tenant_id == tenant_id
        ).scalar() or 0

        # Appointments this week
        appts_this_week = db.query(func.count(Appointment.id)).filter(
            Appointment.tenant_id == tenant_id,
            Appointment.date >= datetime.combine(week_start, datetime.min.time()),
            Appointment.date < datetime.combine(week_end, datetime.min.time()),
        ).scalar() or 0

        # Inventory: low stock count
        low_stock = db.query(func.count(InventoryItem.id)).filter(
            InventoryItem.tenant_id == tenant_id,
            InventoryItem.quantity <= InventoryItem.reorder_level,
        ).scalar() or 0

        # Active devices (assigned)
        try:
            from models.device import DeviceAssignment
            active_devices = db.query(func.count(DeviceAssignment.id)).filter(
                DeviceAssignment.tenant_id == tenant_id,
                DeviceAssignment.status == "ASSIGNED",
            ).scalar() or 0
        except Exception:
            active_devices = 0

        # Open invoices
        try:
            from models.invoice import Invoice
            open_invoices = db.query(func.count(Invoice.id)).filter(
                Invoice.tenant_id == tenant_id,
                Invoice.status == "active",
            ).scalar() or 0
        except Exception:
            open_invoices = 0

        return {
            "tenant": tenant_name,
            "stats": {
                "parties": party_count,
                "appointments_this_week": appts_this_week,
                "active_devices": active_devices,
                "open_invoices": open_invoices,
                "low_stock_items": low_stock,
            },
        }

    except Exception as e:
        logger.error(f"Failed to generate tenant context for {tenant_id}: {e}")
        return {"tenant": tenant_id, "stats": {}}
