"""
Auto-sync scheduler for BirFatura invoices.
Runs every 15 minutes for all tenants that have BirFatura credentials configured.
"""
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

logger = logging.getLogger(__name__)

_scheduler: Optional[BackgroundScheduler] = None


def _run_sync_job():
    """Sync invoices for all tenants with BirFatura configured."""
    # Import here to avoid circular imports at module load time
    from core.database import SessionLocal
    from models.tenant import Tenant
    from services.birfatura.invoice_sync import InvoiceSyncService

    db = SessionLocal()
    try:
        tenants = db.query(Tenant).all()
        end_date = datetime.now(timezone.utc)
        # Sync the last 24 hours each run (overlapping window to avoid gaps)
        start_date = end_date - timedelta(hours=24)

        synced_tenants = 0
        for tenant in tenants:
            # Check for credentials: per-tenant settings OR global env vars
            settings = (tenant.settings or {}).get('invoice_integration', {})
            has_tenant_creds = bool(settings.get('api_key'))
            has_global_creds = bool(os.getenv('BIRFATURA_API_KEY')) and bool(os.getenv('BIRFATURA_SECRET_KEY'))
            is_mock = os.getenv('BIRFATURA_MOCK', '') == '1'
            if not has_tenant_creds and not has_global_creds and not is_mock:
                continue  # Skip only when no credentials exist anywhere

            try:
                svc = InvoiceSyncService(db)
                stats = svc.sync_invoices(tenant.id, start_date, end_date)
                new_total = stats.get('incoming', 0) + stats.get('outgoing', 0)
                if new_total:
                    logger.info(f"[auto-sync] tenant={tenant.id} incoming={stats.get('incoming')} outgoing={stats.get('outgoing')}")
                synced_tenants += 1
            except Exception as e:
                logger.error(f"[auto-sync] tenant={tenant.id} error: {e}")

        if synced_tenants:
            logger.info(f"[auto-sync] Completed for {synced_tenants} tenants")
    except Exception as e:
        logger.error(f"[auto-sync] Fatal error: {e}")
    finally:
        db.close()


def start_scheduler(interval_minutes: int = 15) -> BackgroundScheduler:
    """Start the background invoice sync scheduler."""
    global _scheduler
    if _scheduler and _scheduler.running:
        return _scheduler

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        _run_sync_job,
        trigger=IntervalTrigger(minutes=interval_minutes),
        id="birfatura_invoice_sync",
        name="BirFatura Invoice Auto-Sync",
        replace_existing=True,
        max_instances=1,  # Prevent overlapping runs
        misfire_grace_time=60,
    )
    _scheduler.start()
    logger.info(f"[auto-sync] Scheduler started (interval={interval_minutes}m)")
    return _scheduler


def stop_scheduler():
    """Stop the background scheduler gracefully."""
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[auto-sync] Scheduler stopped")
