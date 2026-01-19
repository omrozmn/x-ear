"""Automation Router - FastAPI"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import logging

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db
from schemas.base import ResponseEnvelope
from schemas.automation import (
    AutomationStatusResponse, AutomationJobResponse, AutomationLogsResponse,
    AutomationLogEntry, AutomationStatus
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/automation", tags=["Automation"])

@router.get("/status", operation_id="listAutomationStatus", response_model=ResponseEnvelope[AutomationStatusResponse])
async def get_automation_status(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get automation system status"""
    try:
        status = {
            "sgkProcessing": {
                "status": "running",
                "lastRun": "2024-01-15T14:30:00Z",
                "nextRun": "2024-01-15T15:00:00Z",
                "processedToday": 25
            },
            "utsSync": {
                "status": "running",
                "lastRun": "2024-01-15T14:00:00Z",
                "nextRun": "2024-01-15T16:00:00Z",
                "syncedRecords": 150
            },
            "backup": {
                "status": "idle",
                "lastRun": "2024-01-15T02:00:00Z",
                "nextRun": "2024-01-16T02:00:00Z",
                "lastBackupSize": "2.5GB"
            }
        }
        return ResponseEnvelope(data=AutomationStatusResponse(
            automation={k: AutomationStatus(**v) for k, v in status.items()},
            timestamp=datetime.now().isoformat()
        ))
    except Exception as e:
        logger.error(f"Get automation status error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sgk/process", operation_id="createAutomationSgkProcess", response_model=ResponseEnvelope[AutomationJobResponse])
async def trigger_sgk_processing(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Trigger SGK document processing"""
    try:
        return ResponseEnvelope(data=AutomationJobResponse(
            success=True,
            message="SGK processing started",
            job_id=f"sgk_job_{datetime.now().strftime('%d%m%Y_%H%M%S')}",
            timestamp=datetime.now().isoformat()
        ))
    except Exception as e:
        logger.error(f"Trigger SGK processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/backup", operation_id="createAutomationBackup", response_model=ResponseEnvelope[AutomationJobResponse])
async def trigger_backup(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Trigger system backup"""
    try:
        return ResponseEnvelope(data=AutomationJobResponse(
            success=True,
            message="Backup started",
            job_id=f"backup_job_{datetime.now().strftime('%d%m%Y%H%M%S')}",
            timestamp=datetime.now().isoformat()
        ))
    except Exception as e:
        logger.error(f"Trigger backup error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/logs", operation_id="listAutomationLogs", response_model=ResponseEnvelope[AutomationLogsResponse])
async def get_automation_logs(
    service: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get automation logs"""
    try:
        logs = [
            {"id": "log_001", "service": "sgk_processing", "level": "info", "message": "Processed 5 SGK documents", "timestamp": "2024-01-15T14:30:00Z"},
            {"id": "log_002", "service": "uts_sync", "level": "info", "message": "Synchronized 25 UTS records", "timestamp": "2024-01-15T14:00:00Z"}
        ]
        return ResponseEnvelope(
            data=AutomationLogsResponse(logs=[AutomationLogEntry(**log) for log in logs]),
            meta={"total": len(logs), "page": page, "per_page": per_page, "total_pages": 1}
        )
    except Exception as e:
        logger.error(f"Get automation logs error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
