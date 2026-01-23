"""
Scheduled Tasks for AI Layer

Implements cron jobs for periodic maintenance tasks:
- Data retention cleanup (daily at 2 AM UTC)

Requirements:
- 1.2: Run daily to identify AI requests older than retention period
"""

import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

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


def start_scheduler():
    """
    Start the APScheduler for AI Layer scheduled tasks.
    
    Schedules:
    - cleanup_expired_ai_prompts: Daily at 2 AM UTC
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
    
    scheduler.start()
    logger.info("AI Layer scheduler started")


def stop_scheduler():
    """Stop the APScheduler."""
    global scheduler
    
    if scheduler is None:
        logger.warning("Scheduler not running")
        return
    
    scheduler.shutdown()
    scheduler = None
    logger.info("AI Layer scheduler stopped")
