"""
UTS (Ulusal Takip Sistemi) API Routes
Handles hearing aid device registration with UTS system
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.user import User
from utils.authorization import admin_required
import logging

logger = logging.getLogger(__name__)

uts_bp = Blueprint('uts', __name__)


@uts_bp.route('/uts/registrations', methods=['GET'])
@jwt_required()
def list_registrations():
    """
    List UTS device registrations
    ---
    tags:
      - UTS
    security:
      - Bearer: []
    parameters:
      - name: status
        in: query
        type: string
        description: Filter by registration status
        enum: [pending, completed, failed]
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 20
    responses:
      200:
        description: List of UTS registrations
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: array
              items:
                type: object
                properties:
                  id:
                    type: string
                  device_id:
                    type: string
                  patient_id:
                    type: string
                  serial_number:
                    type: string
                  status:
                    type: string
                  registration_date:
                    type: string
                    format: date-time
                  uts_response:
                    type: object
            meta:
              type: object
              properties:
                total:
                  type: integer
                page:
                  type: integer
                per_page:
                  type: integer
      401:
        description: Unauthorized
      403:
        description: Forbidden
    """
    try:
        current_user_email = get_jwt_identity()
        user = User.query.filter_by(email=current_user_email).first()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # Get query parameters
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        # TODO: Implement actual UTS registration query
        # For now, return mock data
        registrations = []
        
        return jsonify({
            'success': True,
            'data': registrations,
            'meta': {
                'total': len(registrations),
                'page': page,
                'per_page': per_page
            }
        })
        
    except Exception as e:
        logger.error(f"Error listing UTS registrations: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@uts_bp.route('/uts/registrations/bulk', methods=['POST'])
@jwt_required()
def start_bulk_registration():
    """
    Start bulk UTS device registration job
    ---
    tags:
      - UTS
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - device_ids
          properties:
            device_ids:
              type: array
              items:
                type: string
              description: List of device IDs to register
            priority:
              type: string
              enum: [low, normal, high]
              default: normal
    responses:
      202:
        description: Bulk registration job started
        schema:
          type: object
          properties:
            success:
              type: boolean
            job_id:
              type: string
            message:
              type: string
      400:
        description: Bad request
      401:
        description: Unauthorized
      403:
        description: Forbidden
    """
    try:
        current_user_email = get_jwt_identity()
        user = User.query.filter_by(email=current_user_email).first()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        data = request.get_json()
        if not data or 'device_ids' not in data:
            return jsonify({'success': False, 'error': 'device_ids required'}), 400
        
        device_ids = data.get('device_ids', [])
        if not isinstance(device_ids, list) or len(device_ids) == 0:
            return jsonify({'success': False, 'error': 'device_ids must be non-empty array'}), 400
        
        priority = data.get('priority', 'normal')
        
        # TODO: Implement actual bulk registration job
        # For now, return mock job ID
        import uuid
        job_id = f"uts_job_{uuid.uuid4().hex[:8]}"
        
        return jsonify({
            'success': True,
            'job_id': job_id,
            'message': f'Bulk registration job started for {len(device_ids)} devices'
        }), 202
        
    except Exception as e:
        logger.error(f"Error starting bulk UTS registration: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@uts_bp.route('/uts/jobs/<job_id>', methods=['GET'])
@jwt_required()
def get_job_status(job_id):
    """
    Get UTS registration job status
    ---
    tags:
      - UTS
    security:
      - Bearer: []
    parameters:
      - name: job_id
        in: path
        type: string
        required: true
        description: Job ID to check status
    responses:
      200:
        description: Job status
        schema:
          type: object
          properties:
            success:
              type: boolean
            data:
              type: object
              properties:
                job_id:
                  type: string
                status:
                  type: string
                  enum: [pending, running, completed, failed]
                total:
                  type: integer
                processed:
                  type: integer
                failed:
                  type: integer
                started_at:
                  type: string
                  format: date-time
                completed_at:
                  type: string
                  format: date-time
                errors:
                  type: array
                  items:
                    type: object
      404:
        description: Job not found
      401:
        description: Unauthorized
      403:
        description: Forbidden
    """
    try:
        current_user_email = get_jwt_identity()
        user = User.query.filter_by(email=current_user_email).first()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # TODO: Implement actual job status check
        # For now, return mock status
        job_status = {
            'job_id': job_id,
            'status': 'completed',
            'total': 0,
            'processed': 0,
            'failed': 0,
            'started_at': None,
            'completed_at': None,
            'errors': []
        }
        
        return jsonify({'success': True, 'data': job_status})
        
    except Exception as e:
        logger.error(f"Error getting UTS job status: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500


@uts_bp.route('/uts/jobs/<job_id>/cancel', methods=['POST'])
@jwt_required()
def cancel_job(job_id):
    """
    Cancel UTS registration job
    ---
    tags:
      - UTS
    security:
      - Bearer: []
    parameters:
      - name: job_id
        in: path
        type: string
        required: true
        description: Job ID to cancel
    responses:
      200:
        description: Job cancelled
        schema:
          type: object
          properties:
            success:
              type: boolean
            message:
              type: string
      404:
        description: Job not found
      400:
        description: Job cannot be cancelled (already completed/failed)
      401:
        description: Unauthorized
      403:
        description: Forbidden
    """
    try:
        current_user_email = get_jwt_identity()
        user = User.query.filter_by(email=current_user_email).first()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        # TODO: Implement actual job cancellation
        # For now, return success
        
        return jsonify({
            'success': True,
            'message': f'Job {job_id} cancellation requested'
        })
        
    except Exception as e:
        logger.error(f"Error cancelling UTS job: {str(e)}")
        return jsonify({'success': False, 'error': str(e)}), 500
