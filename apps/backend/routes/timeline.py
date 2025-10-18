"""
Patient Timeline/Activity API
Handles timeline events and activity logging for patients
"""

from flask import Blueprint, request, jsonify, make_response
from models.base import db
from models.patient import Patient
from models.user import ActivityLog
from datetime import datetime
import json
import logging
import uuid

logger = logging.getLogger(__name__)

timeline_bp = Blueprint('timeline', __name__)


@timeline_bp.route('/timeline', methods=['GET'])
def get_timeline():
    """Get all timeline events across all patients"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # Get activity logs as timeline events
        activity_logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(per_page * page).all()
        
        timeline = []
        for log in activity_logs:
            details = log.details_json if log.details_json else {}
            timeline.append({
                'id': log.id,
                'patientId': log.entity_id if log.entity_type == 'patient' else None,
                'type': log.action,
                'title': log.action.replace('_', ' ').title(),
                'description': details.get('description', '') if details else '',
                'timestamp': log.created_at.isoformat() if log.created_at else datetime.now().isoformat(),
                'user': log.user_id or 'system',
                'source': 'activity_log',
                'entityType': log.entity_type,
                'entityId': log.entity_id
            })
        
        return jsonify({
            'success': True,
            'data': timeline,
            'meta': {
                'page': page,
                'perPage': per_page,
                'total': len(timeline)
            },
            'timestamp': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting timeline: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@timeline_bp.route('/patients/<patient_id>/timeline', methods=['GET'])
def get_patient_timeline(patient_id):
    """Get timeline events for a patient"""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        # Get timeline from patient's custom data field
        timeline = []
        try:
            custom_data = patient.custom_data_json or {}
            timeline = custom_data.get('timeline', [])
        except Exception as e:
            logger.error(f"Error parsing patient custom data: {e}")

        # Also get from ActivityLog table (using entity_type, not resource_type)
        try:
            activity_logs = ActivityLog.query.filter_by(
                entity_type='patient',
                entity_id=patient_id
            ).order_by(ActivityLog.created_at.desc()).limit(100).all()

            # Merge both sources
            for log in activity_logs:
                details = log.details_json if log.details_json else {}
                timeline.append({
                    'id': log.id,
                    'patientId': patient_id,
                    'type': log.action,
                    'title': log.action.replace('_', ' ').title(),
                    'description': details.get('description', '') if details else '',
                    'timestamp': log.created_at.isoformat() if log.created_at else datetime.now().isoformat(),
                    'user': log.user_id or 'system',
                    'source': 'activity_log'
                })
        except Exception as e:
            logger.warning(f"Could not load activity logs: {e}")

        # Sort by timestamp (newest first)
        timeline.sort(key=lambda x: x.get('timestamp', ''), reverse=True)

        return jsonify({
            'success': True,
            'data': timeline,
            'meta': {
                'total': len(timeline),
                'patient_id': patient_id
            },
            'timestamp': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting patient timeline: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@timeline_bp.route('/patients/<patient_id>/timeline', methods=['POST'])
def add_timeline_event(patient_id):
    """Add a new timeline event for a patient"""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        # Validate required fields
        required_fields = ['type', 'title']
        missing = [f for f in required_fields if not data.get(f)]
        if missing:
            return jsonify({'success': False, 'error': f'Missing required fields: {", ".join(missing)}'}), 400

        # Create timeline event
        event = {
            'id': data.get('id') or str(uuid.uuid4()),
            'patientId': patient_id,
            'type': data['type'],
            'title': data['title'],
            'description': data.get('description', ''),
            'details': data.get('details', {}),
            'timestamp': data.get('timestamp') or datetime.now().isoformat(),
            'date': data.get('date', datetime.now().strftime('%d.%m.%Y')),
            'time': data.get('time', datetime.now().strftime('%H:%M')),
            'user': data.get('user', 'system'),
            'icon': data.get('icon', 'fa-circle'),
            'color': data.get('color', 'blue'),
            'category': data.get('category', 'general')
        }

        # Save to patient's custom_data
        custom_data = patient.custom_data_json or {}

        # Add event to timeline array
        if 'timeline' not in custom_data:
            custom_data['timeline'] = []
        custom_data['timeline'].insert(0, event)  # Insert at beginning (newest first)

        # Save back to patient
        patient.custom_data_json = custom_data

        # Also log to ActivityLog table for consistency (using entity_type, not resource_type)
        try:
            activity_log = ActivityLog(
                user_id=event['user'],
                action=event['type'],
                entity_type='patient',
                entity_id=patient_id,
                details=json.dumps({
                    'title': event['title'],
                    'description': event['description'],
                    'details': event['details']
                })
            )
            db.session.add(activity_log)
        except Exception as e:
            logger.warning(f"Could not add to ActivityLog: {e}")

        db.session.commit()

        logger.info(f"✅ Timeline event added to patient {patient_id}: {event['title']}")

        resp = make_response(jsonify({
            'success': True,
            'data': event,
            'timestamp': datetime.now().isoformat()
        }), 201)
        resp.headers['Location'] = f"/api/patients/{patient_id}/timeline/{event['id']}"
        return resp

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding timeline event: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@timeline_bp.route('/patients/<patient_id>/activities', methods=['POST'])
def log_patient_activity(patient_id):
    """Log an activity for a patient (alias for timeline event)"""
    return add_timeline_event(patient_id)


@timeline_bp.route('/patients/<patient_id>/timeline/<event_id>', methods=['DELETE'])
def delete_timeline_event(patient_id, event_id):
    """Delete a timeline event"""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        # Get timeline from custom_data
        if patient.custom_data:
            try:
                custom_data = json.loads(patient.custom_data) if isinstance(patient.custom_data, str) else patient.custom_data
                timeline = custom_data.get('timeline', [])
                
                # Filter out the event to delete
                initial_length = len(timeline)
                timeline = [e for e in timeline if e.get('id') != event_id]
                
                if len(timeline) < initial_length:
                    custom_data['timeline'] = timeline
                    patient.custom_data = json.dumps(custom_data)
                    db.session.commit()
                    
                    logger.info(f"✅ Timeline event deleted from patient {patient_id}: {event_id}")
                    
                    return jsonify({
                        'success': True,
                        'message': 'Timeline event deleted',
                        'timestamp': datetime.now().isoformat()
                    }), 200
            except Exception as e:
                logger.error(f"Error parsing patient custom data: {e}")

        return jsonify({'success': False, 'error': 'Timeline event not found'}), 404

    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting timeline event: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
