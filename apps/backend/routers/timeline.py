"""
FastAPI Timeline Router - Migrated from Flask routes/timeline.py
Handles patient timeline events and activity logging
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional, List
from datetime import datetime, timezone
from pydantic import BaseModel
import logging
import uuid
import json

from sqlalchemy.orm import Session

from database import get_db
from schemas.base import ResponseEnvelope
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Timeline"])

# --- Schemas ---

class TimelineEventCreate(BaseModel):
    type: str
    title: str
    description: Optional[str] = ""
    details: Optional[dict] = None
    timestamp: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    user: Optional[str] = "system"
    icon: Optional[str] = "fa-circle"
    color: Optional[str] = "blue"
    category: Optional[str] = "general"
    id: Optional[str] = None

# --- Routes ---

@router.get("/timeline")
def get_timeline(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get all timeline events across all patients"""
    try:
        from models.user import ActivityLog
        
        # Build query with tenant scoping
        query = db.query(ActivityLog)
        if access.tenant_id:
            query = query.filter(ActivityLog.tenant_id == access.tenant_id)
        
        activity_logs = query.order_by(ActivityLog.created_at.desc()).limit(per_page * page).all()
        
        timeline = []
        for log in activity_logs:
            details = {}
            if hasattr(log, 'details_json') and log.details_json:
                details = log.details_json
            elif log.details:
                try:
                    details = json.loads(log.details) if isinstance(log.details, str) else log.details
                except:
                    details = {}
            
            timeline.append({
                'id': log.id,
                'patientId': log.entity_id if log.entity_type == 'patient' else None,
                'type': log.action,
                'title': log.action.replace('_', ' ').title() if log.action else '',
                'description': details.get('description', '') if details else '',
                'timestamp': log.created_at.isoformat() if log.created_at else datetime.now(timezone.utc).isoformat(),
                'user': log.user_id or 'system',
                'source': 'activity_log',
                'entityType': log.entity_type,
                'entityId': log.entity_id
            })
        
        return ResponseEnvelope(
            data=timeline,
            meta={
                'page': page,
                'perPage': per_page,
                'total': len(timeline)
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/patients/{patient_id}/timeline")
def get_patient_timeline(
    patient_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get timeline events for a patient"""
    try:
        from models.patient import Patient
        from models.user import ActivityLog
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get timeline from patient's custom data field
        timeline = []
        try:
            custom_data = patient.custom_data_json or {}
            timeline = custom_data.get('timeline', [])
        except Exception as e:
            logger.error(f"Error parsing patient custom data: {e}")
        
        # Also get from ActivityLog table
        try:
            activity_logs = db.query(ActivityLog).filter_by(
                entity_type='patient',
                entity_id=patient_id
            ).order_by(ActivityLog.created_at.desc()).limit(100).all()
            
            for log in activity_logs:
                details = {}
                if hasattr(log, 'details_json') and log.details_json:
                    details = log.details_json
                elif log.details:
                    try:
                        details = json.loads(log.details) if isinstance(log.details, str) else log.details
                    except:
                        details = {}
                
                timeline.append({
                    'id': log.id,
                    'patientId': patient_id,
                    'type': log.action,
                    'title': log.action.replace('_', ' ').title() if log.action else '',
                    'description': details.get('description', '') if details else '',
                    'timestamp': log.created_at.isoformat() if log.created_at else datetime.now(timezone.utc).isoformat(),
                    'user': log.user_id or 'system',
                    'source': 'activity_log'
                })
        except Exception as e:
            logger.warning(f"Could not load activity logs: {e}")
        
        # Sort by timestamp (newest first)
        timeline.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return ResponseEnvelope(
            data=timeline,
            meta={
                'total': len(timeline),
                'patient_id': patient_id
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patients/{patient_id}/timeline", status_code=201)
def add_timeline_event(
    patient_id: str,
    request_data: TimelineEventCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Add a new timeline event for a patient"""
    try:
        from models.patient import Patient
        from models.user import ActivityLog
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        now = datetime.now(timezone.utc)
        
        # Create timeline event
        event = {
            'id': request_data.id or str(uuid.uuid4()),
            'patientId': patient_id,
            'type': request_data.type,
            'title': request_data.title,
            'description': request_data.description or '',
            'details': request_data.details or {},
            'timestamp': request_data.timestamp or now.isoformat(),
            'date': request_data.date or now.strftime('%d.%m.%Y'),
            'time': request_data.time or now.strftime('%H:%M'),
            'user': request_data.user,
            'icon': request_data.icon,
            'color': request_data.color,
            'category': request_data.category
        }
        
        # Save to patient's custom_data
        custom_data = patient.custom_data_json or {}
        
        if 'timeline' not in custom_data:
            custom_data['timeline'] = []
        custom_data['timeline'].insert(0, event)
        
        patient.custom_data_json = custom_data
        
        # Also log to ActivityLog table
        try:
            activity_log = ActivityLog(
                user_id=event['user'],
                action=event['type'],
                entity_type='patient',
                entity_id=patient_id,
                tenant_id=access.tenant_id,
                details=json.dumps({
                    'title': event['title'],
                    'description': event['description'],
                    'details': event['details']
                })
            )
            db.add(activity_log)
        except Exception as e:
            logger.warning(f"Could not add to ActivityLog: {e}")
        
        db.commit()
        
        logger.info(f"✅ Timeline event added to patient {patient_id}: {event['title']}")
        
        return ResponseEnvelope(data=event)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding timeline event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/patients/{patient_id}/activities", status_code=201)
def log_patient_activity(
    patient_id: str,
    request_data: TimelineEventCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Log an activity for a patient (alias for timeline event)"""
    return add_timeline_event(patient_id, request_data, access, db)

@router.delete("/patients/{patient_id}/timeline/{event_id}")
def delete_timeline_event(
    patient_id: str,
    event_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a timeline event"""
    try:
        from models.patient import Patient
        
        patient = db.get(Patient, patient_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Get timeline from custom_data
        custom_data = patient.custom_data_json or {}
        timeline = custom_data.get('timeline', [])
        
        # Filter out the event to delete
        initial_length = len(timeline)
        timeline = [e for e in timeline if e.get('id') != event_id]
        
        if len(timeline) < initial_length:
            custom_data['timeline'] = timeline
            patient.custom_data_json = custom_data
            db.commit()
            
            logger.info(f"✅ Timeline event deleted from patient {patient_id}: {event_id}")
            
            return ResponseEnvelope(message='Timeline event deleted')
        
        raise HTTPException(status_code=404, detail="Timeline event not found")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting timeline event: {e}")
        raise HTTPException(status_code=500, detail=str(e))
