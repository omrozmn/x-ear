"""
Automation Schemas
"""
from typing import Optional, List, Dict, Any
from pydantic import Field
from .base import AppBaseModel

class AutomationStatus(AppBaseModel):
    status: str
    last_run: Optional[str] = Field(None, alias="lastRun")
    next_run: Optional[str] = Field(None, alias="nextRun")
    processed_today: Optional[int] = Field(None, alias="processedToday")
    synced_records: Optional[int] = Field(None, alias="syncedRecords")
    last_backup_size: Optional[str] = Field(None, alias="lastBackupSize")

class AutomationStatusResponse(AppBaseModel):
    automation: Dict[str, AutomationStatus]
    timestamp: str

class AutomationJobResponse(AppBaseModel):
    success: bool
    message: str
    job_id: str = Field(..., alias="jobId")
    timestamp: str

class AutomationLogEntry(AppBaseModel):
    id: str
    service: str
    level: str
    message: str
    timestamp: str

class AutomationLogsResponse(AppBaseModel):
    logs: List[AutomationLogEntry]
