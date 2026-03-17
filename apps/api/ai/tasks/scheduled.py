"""
Scheduled Tasks for AI Layer

Implements cron jobs for periodic maintenance tasks:
- Data retention cleanup (daily at 2 AM UTC)

Requirements:
- 1.2: Run daily to identify AI requests older than retention period
"""

import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from database import SessionLocal
from ai.services.data_retention import DataRetentionService


logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler: AsyncIOScheduler | None = None


def cleanup_expired_ai_prompts():
    """
    Scheduled task to cleanup expired AI prompts.
    
    Runs daily at 2 AM UTC to delete AI requests older than the
    configured retention period (default: 90 days).
    
    Requirements:
    - 1.2: Run daily to identify AI requests older than 90 days
    - 1.4: Log all deletion operations with request_id and timestamp
    """
    logger.info("Starting scheduled AI prompt cleanup")
    
    db = SessionLocal()
    try:
        service = DataRetentionService(db)
        result = service.cleanup_expired_prompts()
        
        logger.info(
            f"AI prompt cleanup completed: "
            f"deleted={result['deleted_count']}, "
            f"errors={result['error_count']}, "
            f"legal_holds_skipped={result['skipped_legal_hold']}, "
            f"retention_days={result['retention_days']}"
        )
        
        if result['error_count'] > 0:
            logger.error(
                f"AI prompt cleanup encountered {result['error_count']} error(s)"
            )
        
    except Exception as e:
        logger.error(f"AI prompt cleanup failed: {e}", exc_info=True)
    finally:
        db.close()


def run_proactive_insights():
    """
    Scheduled task to run proactive AI insight analysis.

    Wraps the async orchestrator in a sync function for APScheduler.
    Runs all registered analyzers for all tenants, refines findings,
    and bridges them to the AI Inbox.
    """
    logger.info("Starting scheduled proactive AI analysis")
    try:
        from ai.insights.orchestrator import run_proactive_analysis_cycle
        asyncio.run(run_proactive_analysis_cycle())
        logger.info("Proactive AI analysis completed")
    except Exception as e:
        logger.error(f"Proactive AI analysis failed: {e}", exc_info=True)


def _run_billing_cycle():
    """Scheduled task to run recurring billing."""
    logger.info("Starting scheduled billing cycle")
    try:
        from services.billing_scheduler import run_billing_cycle
        run_billing_cycle()
    except Exception as e:
        logger.error(f"Billing cycle failed: {e}", exc_info=True)


def start_scheduler():
    """
    Start the APScheduler for AI Layer scheduled tasks.

    Schedules:
    - cleanup_expired_ai_prompts: Daily at 2 AM UTC
    - run_proactive_insights: Every 60 minutes
    """
    global scheduler

    if scheduler is not None:
        logger.warning("Scheduler already started")
        return

    scheduler = AsyncIOScheduler()

    # Schedule daily cleanup at 2 AM UTC
    scheduler.add_job(
        cleanup_expired_ai_prompts,
        trigger=CronTrigger(hour=2, minute=0, timezone='UTC'),
        id='cleanup_expired_ai_prompts',
        name='Cleanup Expired AI Prompts',
        replace_existing=True,
    )

    # Schedule proactive AI analysis every 60 minutes
    scheduler.add_job(
        run_proactive_insights,
        trigger=IntervalTrigger(minutes=60),
        id='run_proactive_insights',
        name='Proactive AI Insight Analysis',
        replace_existing=True,
    )

    # Schedule recurring billing cycle daily at 6 AM UTC
    scheduler.add_job(
        _run_billing_cycle,
        trigger=CronTrigger(hour=6, minute=0, timezone='UTC'),
        id='run_billing_cycle',
        name='Recurring Billing & Dunning',
        replace_existing=True,
    )

    scheduler.start()
    logger.info("AI Layer scheduler started (cleanup + proactive insights)")


def stop_scheduler():
    """Stop the APScheduler."""
    global scheduler
    
    if scheduler is None:
        logger.warning("Scheduler not running")
        return
    
    scheduler.shutdown()
    scheduler = None
    logger.info("AI Layer scheduler stopped")
