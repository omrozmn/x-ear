"""
FastAPI Timeline Router - Migrated from Flask routes/timeline.py
Handles patient timeline events and activity logging
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime, timezone
import logging
import uuid
import json

from sqlalchemy.orm import Session

from database import get_db
logger = logging.getLogger(__name__)

from schemas.timeline import TimelineEventCreate, TimelineEventRead, TimelineListResponse
from schemas.base import ResponseEnvelope, ResponseMeta
from middleware.unified_access import UnifiedAccess, require_access
router = APIRouter(tags=["Timeline"])

# --- Schemas ---



# --- Routes ---

@router.get("/timeline", operation_id="listTimeline", response_model=ResponseEnvelope[TimelineListResponse])
def get_timeline(
    page: int = Query(1, ge=1, le=1000000),
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
                except (json.JSONDecodeError, TypeError):
                    details = {}
            
            timeline.append({
                'id': log.id,
                'partyId': log.entity_id if log.entity_type == 'patient' else None,
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
            data=TimelineListResponse(events=timeline),
            meta=ResponseMeta(
                page=page,
                per_page=per_page,
                total=len(timeline)
            )
        )
        
    except Exception as e:
        logger.error(f"Error getting timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/parties/{party_id}/timeline", operation_id="listPartyTimeline", response_model=ResponseEnvelope[TimelineListResponse])
def get_party_timeline(
    party_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Get timeline events for a patient"""
    ACTION_TITLES_TR = {
        'party_created': 'Hasta Oluşturuldu',
        'party_updated': 'Hasta Bilgileri Güncellendi',
        'party_deleted': 'Hasta Silindi',
        'sale': 'Satış',
        'sale_created': 'Satış Oluşturuldu',
        'sale_updated': 'Satış Güncellendi',
        'payment_received': 'Ödeme Alındı',
        'payment_record_created': 'Ödeme Kaydı Oluşturuldu',
        'promissory_notes_created': 'Senet Oluşturuldu',
        'promissory_note_collected': 'Senet Tahsil Edildi',
        'device_assigned': 'Cihaz Atandı',
        'device_assignment': 'Cihaz Atandı',
        'device_created': 'Cihaz Eklendi',
        'device_updated': 'Cihaz Güncellendi',
        'device_deleted': 'Cihaz Silindi',
        'device_stock_updated': 'Stok Güncellendi',
        'hearing_test_created': 'İşitme Testi Eklendi',
        'hearing_test_updated': 'İşitme Testi Güncellendi',
        'document_upload': 'Belge Yüklendi',
        'note_created': 'Not Eklendi',
        'note_updated': 'Not Güncellendi',
        'note_deleted': 'Not Silindi',
        'note_added': 'Not Eklendi',
        'appointment_created': 'Randevu Oluşturuldu',
        'appointment_updated': 'Randevu Güncellendi',
        'appointment_deleted': 'Randevu Silindi',
        'appointment_rescheduled': 'Randevu Yeniden Planlandı',
        'appointment_cancelled': 'Randevu İptal Edildi',
        'appointment_completed': 'Randevu Tamamlandı',
        'anamnesis_updated': 'Anamnez Güncellendi',
        'rem_saved': 'REM Doğrulaması Kaydedildi',
    }

    CATEGORY_MAP = {
        'party_created': 'hasta',
        'party_updated': 'hasta',
        'party_deleted': 'hasta',
        'sale': 'satis',
        'sale_created': 'satis',
        'sale_updated': 'satis',
        'payment_received': 'odeme',
        'payment_record_created': 'odeme',
        'promissory_notes_created': 'odeme',
        'promissory_note_collected': 'odeme',
        'device_assigned': 'cihaz',
        'device_assignment': 'cihaz',
        'device_created': 'cihaz',
        'device_updated': 'cihaz',
        'device_deleted': 'cihaz',
        'device_stock_updated': 'cihaz',
        'hearing_test_created': 'isitme_testi',
        'hearing_test_updated': 'isitme_testi',
        'document_upload': 'belge',
        'note_created': 'not',
        'note_updated': 'not',
        'note_deleted': 'not',
        'note_added': 'not',
        'appointment_created': 'randevu',
        'appointment_updated': 'randevu',
        'appointment_deleted': 'randevu',
        'appointment_rescheduled': 'randevu',
        'appointment_cancelled': 'randevu',
        'appointment_completed': 'randevu',
        'anamnesis_updated': 'anamnez',
        'rem_saved': 'isitme_testi',
    }

    try:
        from core.models.party import Party
        from models.user import ActivityLog
        
        patient = db.get(Party, party_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Party not found")
        
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
            activity_logs = db.query(ActivityLog).filter(
                ActivityLog.entity_id == party_id,
                ActivityLog.entity_type.in_(['patient', 'party'])
            ).order_by(ActivityLog.created_at.desc()).limit(100).all()

            # Resolve user display names
            user_ids = {log.user_id for log in activity_logs if log.user_id and log.user_id not in ('system', 'Sistem')}
            user_names = {}
            if user_ids:
                try:
                    from core.models.user import User
                    users = db.query(User).filter(User.id.in_(user_ids)).all()
                    for u in users:
                        name_parts = []
                        if getattr(u, 'first_name', None):
                            name_parts.append(u.first_name)
                        if getattr(u, 'last_name', None):
                            name_parts.append(u.last_name)
                        user_names[u.id] = ' '.join(name_parts) if name_parts else (u.email or u.id)
                except Exception:
                    pass
            
            for log in activity_logs:
                details = {}
                if hasattr(log, 'details_json') and log.details_json:
                    details = log.details_json
                elif log.details:
                    try:
                        details = json.loads(log.details) if isinstance(log.details, str) else log.details
                    except (json.JSONDecodeError, TypeError):
                        details = {}

                action = log.action or ''
                # Use detail-level title if present, otherwise translate action
                title = ''
                if details and details.get('title'):
                    title = details['title']
                else:
                    title = ACTION_TITLES_TR.get(action, action.replace('_', ' ').title())

                user_display = 'Sistem'
                uid = log.user_id or ''
                if uid and uid not in ('system', 'Sistem'):
                    user_display = user_names.get(uid, uid)
                
                # Build clean metadata from details (exclude internal/redundant keys)
                metadata = {}
                if details:
                    skip_keys = {'title', 'action', 'party_id'}
                    # Flatten nested 'details' dict if present
                    nested = details.get('details', {})
                    flat = {**details}
                    if isinstance(nested, dict):
                        flat.update(nested)
                    flat.pop('details', None)
                    for k, v in flat.items():
                        if k not in skip_keys and v is not None and v != '':
                            metadata[k] = v

                # Resolve product_id to product name
                if 'product_id' in metadata:
                    pid = metadata.pop('product_id')
                    if 'product_name' not in metadata:
                        try:
                            from core.models.inventory import InventoryItem
                            item = db.query(InventoryItem).filter(InventoryItem.id == pid).first()
                            if item:
                                parts = []
                                if getattr(item, 'brand', None):
                                    parts.append(item.brand)
                                if getattr(item, 'model', None):
                                    parts.append(item.model)
                                metadata['product_name'] = ' '.join(parts) if parts else (getattr(item, 'name', None) or pid)
                        except Exception:
                            metadata['product_name'] = pid

                timeline.append({
                    'id': log.id,
                    'partyId': party_id,
                    'type': action,
                    'eventType': CATEGORY_MAP.get(action, 'general'),
                    'title': title,
                    'description': details.get('description', '') if details else '',
                    'timestamp': log.created_at.isoformat() if log.created_at else datetime.now(timezone.utc).isoformat(),
                    'user': user_display,
                    'source': 'activity_log',
                    'category': CATEGORY_MAP.get(action, 'genel'),
                    'priority': details.get('priority', 'normal') if details else 'normal',
                    'details': metadata if metadata else None,
                })
        except Exception as e:
            logger.warning(f"Could not load activity logs: {e}")
        
        # Sort by timestamp (newest first)
        timeline.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return ResponseEnvelope(
            data=TimelineListResponse(events=timeline),
            meta=ResponseMeta(
                total=len(timeline)
            )
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting patient timeline: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parties/{party_id}/timeline", operation_id="createPartyTimeline", status_code=201, response_model=ResponseEnvelope[TimelineEventRead])
def add_timeline_event(
    party_id: str,
    request_data: TimelineEventCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Add a new timeline event for a patient"""
    try:
        from core.models.party import Party
        from models.user import ActivityLog
        
        patient = db.get(Party, party_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Party not found")
        
        # Tenant check
        if access.tenant_id and patient.tenant_id != access.tenant_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        now = datetime.now(timezone.utc)
        
        # Create timeline event
        event = {
            'id': request_data.id or str(uuid.uuid4()),
            'partyId': party_id,
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
                entity_id=party_id,
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
        
        logger.info(f"✅ Timeline event added to party {party_id}: {event['title']}")
        
        return ResponseEnvelope(data=TimelineEventRead(**event))
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error adding timeline event: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/parties/{party_id}/activities", operation_id="createPartyActivities", status_code=201, response_model=ResponseEnvelope[TimelineEventRead])
def log_party_activity(
    party_id: str,
    request_data: TimelineEventCreate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Log an activity for a patient (alias for timeline event)"""
    return add_timeline_event(party_id, request_data, access, db)

@router.delete("/parties/{party_id}/timeline/{event_id}", operation_id="deletePartyTimeline")
def delete_timeline_event(
    party_id: str,
    event_id: str,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db)
):
    """Delete a timeline event"""
    try:
        from core.models.party import Party
        
        patient = db.get(Party, party_id)
        if not patient:
            raise HTTPException(status_code=404, detail="Party not found")
        
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
            
            logger.info(f"✅ Timeline event deleted from party {party_id}: {event_id}")
            
            return ResponseEnvelope(message='Timeline event deleted')
        
        raise HTTPException(status_code=404, detail="Timeline event not found")
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting timeline event: {e}")
        raise HTTPException(status_code=500, detail=str(e))
