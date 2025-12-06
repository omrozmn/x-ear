from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.patient import Patient
from models.tenant import Tenant
import logging

logger = logging.getLogger(__name__)

admin_patients_bp = Blueprint('admin_patients', __name__, url_prefix='/api/admin/patients')

@admin_patients_bp.route('', methods=['GET'])
@jwt_required()
def get_all_patients():
    """Get list of ALL patients from ALL tenants"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        
        query = Patient.query
        
        if search:
            query = query.filter(
                (Patient.first_name.ilike(f'%{search}%')) |
                (Patient.last_name.ilike(f'%{search}%')) |
                (Patient.tc_kimlik.ilike(f'%{search}%')) |
                (Patient.phone.ilike(f'%{search}%'))
            )
            
        total = query.count()
        patients = query.order_by(Patient.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        patients_list = []
        for p in patients:
            p_dict = p.to_dict()
            if p.tenant_id:
                tenant = db.session.get(Tenant, p.tenant_id)
                if tenant:
                    p_dict['tenant_name'] = tenant.name
            patients_list.append(p_dict)
            
        return jsonify({
            'success': True,
            'data': {
                'patients': patients_list,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
    except Exception as e:
        logger.error(f"Get all patients error: {e}")
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500
