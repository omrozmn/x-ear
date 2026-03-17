from __future__ import annotations

import asyncio
import logging
import os
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: Optional[BackgroundScheduler] = None


def _run_whatsapp_sync_job() -> None:
    from routers.whatsapp import sync_whatsapp_inbox_for_tenant
    from services.whatsapp_session_service import get_whatsapp_session_manager

    manager = get_whatsapp_session_manager()
    tenant_ids = manager.list_connected_tenant_ids()
    if not tenant_ids:
        return

    synced = 0
    for tenant_id in tenant_ids:
        if not manager.begin_sync(tenant_id):
            continue
        try:
            result = asyncio.run(sync_whatsapp_inbox_for_tenant(tenant_id, limit=12))
            imported = result.get("imported", 0)
            auto_replied = result.get("autoReplied", 0)
            if imported or auto_replied:
                logger.info(
                    "[whatsapp-auto-sync] tenant=%s imported=%s auto_replied=%s",
                    tenant_id,
                    imported,
                    auto_replied,
                )
            synced += 1
            manager.end_sync(tenant_id, success=True)
        except Exception as exc:
            manager.end_sync(tenant_id, success=False)
            logger.error("[whatsapp-auto-sync] tenant=%s error=%s", tenant_id, exc)

    if synced:
        logger.info("[whatsapp-auto-sync] completed tenants=%s", synced)


def start_scheduler(interval_seconds: int = 15) -> BackgroundScheduler:
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _run_whatsapp_sync_job,
        trigger=IntervalTrigger(seconds=interval_seconds),
        id="whatsapp_inbox_auto_sync",
        name="WhatsApp Inbox Auto Sync",
        replace_existing=True,
        max_instances=1,
        misfire_grace_time=10,
    )
    _scheduler.start()
    logger.info("[whatsapp-auto-sync] scheduler started interval=%ss", interval_seconds)
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[whatsapp-auto-sync] scheduler stopped")


def get_scheduler_interval_seconds() -> int:
    raw = os.getenv("WHATSAPP_AUTO_SYNC_INTERVAL_SECONDS", "15").strip()
    try:
        parsed = int(raw)
    except ValueError:
        return 15
    return max(10, parsed)
