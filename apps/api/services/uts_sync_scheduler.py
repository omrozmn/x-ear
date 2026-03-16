from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from sqlalchemy.orm.attributes import flag_modified

logger = logging.getLogger(__name__)

_scheduler: Optional[BackgroundScheduler] = None


def _sync_tenant_states(db, tenant) -> int:
    import json as _json
    from core.models.inventory import InventoryItem
    from routers.uts import (
        UTS_TEKIL_URUN_QUERY_PATH,
        _build_base_url,
        _build_primary_headers,
        _extract_first_message,
        _get_effective_token,
        _get_raw_uts_settings,
        _get_serial_states,
        _parse_tekil_urun_item,
        _post_uts_json,
    )

    settings = _get_raw_uts_settings(tenant)
    if not settings.get("enabled"):
        return 0

    token = _get_effective_token(settings)
    if not token:
        return 0

    base_url = _build_base_url(settings.get("environment") or "test", settings.get("base_url_override"))
    auth_scheme = settings.get("auth_scheme") or "uts_token"
    serial_states = _get_serial_states(settings)
    member_number = (settings.get("member_number") or "").strip() or None

    # ── Auto-discover: add inventory items with barcode + serials ──
    inventory_items = db.query(InventoryItem).filter(
        InventoryItem.tenant_id == tenant.id,
    ).all()
    for inv_item in inventory_items:
        barcode = (inv_item.barcode or "").strip()
        if not barcode:
            continue
        raw_serials = inv_item.available_serials
        if isinstance(raw_serials, str):
            try:
                raw_serials = _json.loads(raw_serials)
            except (ValueError, TypeError):
                raw_serials = []
        if not isinstance(raw_serials, list):
            continue
        for serial in raw_serials:
            if not isinstance(serial, str) or not serial.strip():
                continue
            serial_key = f"{barcode}::{serial.strip()}::"
            if serial_key not in serial_states:
                serial_states[serial_key] = {
                    "status": "not_owned",
                    "inventory_id": inv_item.id,
                    "inventory_name": inv_item.name,
                    "product_name": f"{inv_item.brand or ''} {inv_item.name}".strip(),
                    "product_number": barcode,
                    "serial_number": serial.strip(),
                    "lot_batch_number": None,
                }
                logger.info("[uts-sync] discovered serial %s from inventory %s", serial_key, inv_item.id)

    synced = 0
    now_iso = datetime.now(timezone.utc).isoformat()
    for serial_key, raw_state in serial_states.items():
        if not isinstance(raw_state, dict):
            continue
        product_number = (raw_state.get("product_number") or "").strip()
        serial_number = (raw_state.get("serial_number") or "").strip()
        lot_batch_number = (raw_state.get("lot_batch_number") or "").strip()
        if not product_number or (not serial_number and not lot_batch_number):
            continue

        json_data = {"UNO": product_number}
        if serial_number:
            json_data["SNO"] = serial_number
        if lot_batch_number:
            json_data["LNO"] = lot_batch_number
        try:
            response = _post_uts_json(
                base_url,
                UTS_TEKIL_URUN_QUERY_PATH,
                auth_scheme,
                token,
                json_data,
            )
        except Exception as exc:
            logger.warning("[uts-sync] query failed for %s: %s", serial_key, exc)
            continue
        body_text = (response.text or "").strip()
        try:
            payload = response.json()
        except ValueError:
            payload = {"rawText": body_text[:1000]}

        records = []
        if isinstance(payload, dict) and isinstance(payload.get("SNC"), list):
            records = [item for item in payload["SNC"] if isinstance(item, dict)]

        # Determine status from UTS response
        # tekilUrun/sorgula returns ONLY items that belong to authenticated firm.
        # If SNC has records → owned. If empty → not on our account.
        if records:
            next_status = "owned"
        else:
            next_status = "not_owned"

        raw_state["status"] = next_status
        raw_state["last_message"] = _extract_first_message(payload if isinstance(payload, dict) else None, "UTS sync tamamlandi")
        raw_state["last_movement_type"] = "sync"
        raw_state["raw_response"] = body_text[:4000] if body_text else None
        raw_state["updated_at"] = now_iso
        synced += 1

    settings["serial_states"] = serial_states
    settings["last_sync"] = {
        "ok": True,
        "message": f"{synced} seri kaydi senkronize edildi",
        "synced_records": synced,
        "synced_at": now_iso,
    }
    tenant_settings = tenant.settings or {}
    tenant_settings["uts_integration"] = settings
    tenant.settings = tenant_settings
    flag_modified(tenant, "settings")
    db.commit()
    return synced


def run_sync_job() -> None:
    from core.database import SessionLocal
    from models.tenant import Tenant

    db = SessionLocal()
    try:
        total = 0
        tenants = db.query(Tenant).all()
        for tenant in tenants:
            try:
                total += _sync_tenant_states(db, tenant)
            except Exception as exc:
                logger.error("[uts-sync] tenant=%s error=%s", tenant.id, exc)
        if total:
            logger.info("[uts-sync] synced_records=%s", total)
    finally:
        db.close()


def start_scheduler(interval_minutes: int = 30) -> BackgroundScheduler:
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        run_sync_job,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id="uts_serial_state_sync",
        name="UTS Serial State Sync",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=60,
    )
    _scheduler.start()
    logger.info("[uts-sync] scheduler started interval=%sm", interval_minutes)
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[uts-sync] scheduler stopped")


def get_scheduler_interval_minutes() -> int:
    raw = os.getenv("UTS_SYNC_INTERVAL_MINUTES", "30").strip()
    try:
        parsed = int(raw)
    except ValueError:
        return 30
    return max(5, parsed)
