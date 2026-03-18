"""
Blog Automation Scheduler

Runs periodic checks for active blog automations and triggers content pipeline runs.
Uses APScheduler (same pattern as billing_scheduler).
"""

import logging
from datetime import datetime, timezone, timedelta

from database import SessionLocal

logger = logging.getLogger(__name__)

_scheduler = None


def check_and_run_automations():
    """Check all active automations and trigger runs when due."""
    from core.models.blog_automation import BlogAutomation, BlogAutomationRun

    db = SessionLocal()
    try:
        automations = db.query(BlogAutomation).filter(
            BlogAutomation.is_active == True
        ).all()

        now = datetime.now(timezone.utc)

        for auto in automations:
            # Check if it's time to run
            if auto.last_run_at:
                next_run = auto.last_run_at + timedelta(hours=auto.schedule_interval_hours)
                if now < next_run:
                    continue

            # Check no run is currently active
            active_run = db.query(BlogAutomationRun).filter(
                BlogAutomationRun.automation_id == auto.id,
                BlogAutomationRun.status.in_(['pending', 'running']),
            ).first()
            if active_run:
                continue

            # Create new run
            run = BlogAutomationRun(
                automation_id=auto.id,
                status='pending',
                trigger_type='scheduled',
            )
            db.add(run)
            db.commit()
            db.refresh(run)

            logger.info(f"Scheduled run {run.id} for automation '{auto.name}' ({auto.sector})")

            # Execute pipeline
            try:
                from services.blog_content_pipeline import execute_automation_run
                execute_automation_run(run.id)
            except Exception as e:
                logger.error(f"Pipeline execution failed for run {run.id}: {e}")

    except Exception as e:
        logger.error(f"Blog automation scheduler error: {e}", exc_info=True)
    finally:
        db.close()


def start_scheduler(interval_minutes: int = 60):
    """Start the blog automation scheduler."""
    global _scheduler
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        _scheduler = BackgroundScheduler()
        _scheduler.add_job(
            check_and_run_automations,
            'interval',
            minutes=interval_minutes,
            id='blog_automation_checker',
            replace_existing=True,
            next_run_time=datetime.now(timezone.utc) + timedelta(minutes=5),  # First run after 5 min
        )
        _scheduler.start()
        logger.info(f"Blog automation scheduler started (interval: {interval_minutes}min)")
    except Exception as e:
        logger.error(f"Failed to start blog automation scheduler: {e}")


def stop_scheduler():
    """Stop the blog automation scheduler."""
    global _scheduler
    if _scheduler:
        _scheduler.shutdown(wait=False)
        logger.info("Blog automation scheduler stopped")
        _scheduler = None
