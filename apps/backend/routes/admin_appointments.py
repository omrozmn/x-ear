from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.appointment import Appointment
from models.patient import Patient
from models.tenant import Tenant
from sqlalchemy import or_
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

admin_appointments_bp = Blueprint('admin_appointments', __name__, url_prefix='/api/admin/appointments')

@admin_appointments_bp.route('', methods=['GET'])
@jwt_required()
def get_all_appointments():
    """Get list of ALL appointments from ALL tenants"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        tenant_id = request.args.get('tenant_id')
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        query = Appointment.query
        
        # Join with Patient to search by patient name
        query = query.join(Patient)
        
        if search:
            query = query.filter(
                (Patient.first_name.ilike(f'%{search}%')) |
                (Patient.last_name.ilike(f'%{search}%')) |
                (Patient.phone.ilike(f'%{search}%'))
            )
            
        if tenant_id:
            query = query.filter(Appointment.tenant_id == tenant_id)
            
        if status:
            query = query.filter(Appointment.status == status)
            
        if start_date:
            try:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                query = query.filter(Appointment.date >= start)
            except ValueError:
                pass
                
        if end_date:
            try:
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                query = query.filter(Appointment.date <= end)
            except ValueError:
                pass
            
        total = query.count()
        appointments = query.order_by(Appointment.date.desc(), Appointment.time.desc()).offset((page - 1) * limit).limit(limit).all()
        
        appointments_list = []
        for appt in appointments:
            appt_dict = appt.to_dict()
            
            # Add patient info
            if appt.patient:
                appt_dict['patientName'] = f"{appt.patient.first_name} {appt.patient.last_name}"
                
            # Add tenant info
            if appt.tenant_id:
                tenant = db.session.get(Tenant, appt.tenant_id)
                if tenant:
                    appt_dict['tenantName'] = tenant.name
                    
            appointments_list.append(appt_dict)
            
        return jsonify({
            'success': True,
            'data': {
                'appointments': appointments_list,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
    except Exception as e:
        logger.error(f"Get all appointments error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500
