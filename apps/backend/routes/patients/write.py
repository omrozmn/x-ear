"""
Patients Write Operations
-------------------------
POST/PUT/DELETE endpoints for patient CRUD operations.
All endpoints use @unified_access for tenant scoping and permission checks.
"""

from flask import request, jsonify, make_response
from models.base import db
from models.patient import Patient
from datetime import datetime
import json
import logging
import sqlite3
from . import patients_bp
from utils.decorators import unified_access
from utils.query_policy import get_or_404_scoped
from utils.idempotency import idempotent
from utils.optimistic_locking import optimistic_lock, with_transaction
from utils.activity_logging import log_action
from utils.tc_validator import validate_tc_number

logger = logging.getLogger(__name__)


@patients_bp.route('/patients', methods=['POST'])
@unified_access(resource='patients', action='create')
@idempotent(methods=['POST'])
@log_action(action="patient.created", entity_id_from_response="data.id")
def create_patient(ctx):
    """Create a new patient - Unified Access"""
    # ... (code continues)

@patients_bp.route('/patients/<patient_id>', methods=['PUT','PATCH'])
@unified_access(resource='patients', action='edit')
@idempotent(methods=['PUT', 'PATCH'])
@optimistic_lock(Patient, id_param='patient_id')
@with_transaction
@log_action(action="patient.updated", entity_id_param="patient_id")
def update_patient(ctx, patient_id):
    """Update an existing patient - Unified Access"""
    try:
        data = request.get_json()
        if not data:
            return jsonify({'success': False, 'error': 'No data provided'}), 400

        # Get patient with tenant scoping
        patient = get_or_404_scoped(ctx, Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404

        # Key mapping and Normalization (Copied logic)
        key_map = {
            'firstName': 'first_name', 'lastName': 'last_name', 'tcNumber': 'tc_number', 'identityNumber': 'identity_number',
            'birthDate': 'birth_date', 'gender': 'gender', 'address': 'address', 'status': 'status', 'segment': 'segment',
            'acquisitionType': 'acquisition_type', 'conversionStep': 'conversion_step', 'referredBy': 'referred_by',
            'priorityScore': 'priority_score', 'branchId': 'branch_id', 'tags': 'tags', 'sgkInfo': 'sgk_info',
            'phone': 'phone', 'email': 'email', 'city': 'address_city', 'district': 'address_district',
            'addressCity': 'address_city', 'addressDistrict': 'address_district'
        }
        allowed_attrs = {'first_name','last_name','tc_number','identity_number','phone','email','gender','status','segment','acquisition_type','conversion_step','referred_by','priority_score','branch_id','address_city','address_district','address_full'}

        for k, v in data.items():
            if k == 'tags':
                patient.tags = json.dumps(v) if v is not None else json.dumps([])
                continue
            if k == 'sgkInfo':
                patient.sgk_info = json.dumps(v) if v is not None else json.dumps({'rightEarDevice': 'available', 'leftEarDevice': 'available', 'rightEarBattery': 'available', 'leftEarBattery': 'available'})
                continue
            if k == 'birthDate' and v:
                try:
                    patient.birth_date = datetime.fromisoformat(v)
                except (ValueError, TypeError): pass
                continue
            if k == 'address' or k == 'addressFull':
                if isinstance(v, dict):
                    patient.address_city = v.get('city')
                    patient.address_district = v.get('district')
                    patient.address_full = v.get('fullAddress') or v.get('address')
                elif isinstance(v, str):
                    patient.address_full = v
                continue

            normalized = key_map.get(k, k)
            if normalized in allowed_attrs and hasattr(patient, normalized):
                setattr(patient, normalized, v)
                continue
            if hasattr(patient, k):
                try: setattr(patient, k, v)
                except Exception: pass
                continue

        db.session.commit()
        
        # Explicit log activity call (legacy behavior preserved)
        from app import log_activity
        changes_list = []
        for k, v in data.items():
             if k in ('photo', 'documents', 'notes'): continue
             changes_list.append(f"{k}: {v}")
        change_msg = ", ".join(changes_list)
        if len(change_msg) > 100: change_msg = change_msg[:97] + "..."
        
        log_activity('system', 'update', 'patient', patient.id, {'changes': data}, request, message=f"Hasta güncellendi: {change_msg}")
        
        logger.info(f"Patient updated: {patient.id} by {ctx.principal_id}")
        
        return jsonify({'success': True, 'data': patient.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        if isinstance(e, sqlite3.OperationalError) and 'readonly' in str(e).lower():
            return jsonify({'success': False, 'error': 'Database write failed: read-only database'}), 503
        return jsonify({'success': False, 'error': str(e)}), 500


@patients_bp.route('/patients/<patient_id>', methods=['DELETE'])
@unified_access(resource='patients', action='delete')
@log_action(action="patient.deleted", entity_id_param="patient_id", is_critical=True)
def delete_patient(ctx, patient_id):
    """Delete a patient - Unified Access"""
    try:
        # Get patient with tenant scoping
        patient = get_or_404_scoped(ctx, Patient, patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404
            
        db.session.delete(patient)
        db.session.commit()
        
        logger.info(f"Patient deleted: {patient_id} by {ctx.principal_id}")
        
        return jsonify({'success': True, 'message': 'Patient deleted'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500
