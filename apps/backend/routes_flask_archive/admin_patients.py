from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.patient import Patient
from models.tenant import Tenant
from models.sales import DeviceAssignment, Sale
from models.user import ActivityLog
# from models.document import Document
import logging
from utils.tenant_security import UnboundSession

logger = logging.getLogger(__name__)

admin_patients_bp = Blueprint('admin_patients', __name__, url_prefix='/api/admin/patients')

@admin_patients_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.PATIENTS_READ)
def get_all_patients(ctx):
    """Get list of ALL patients from ALL tenants"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        
        with UnboundSession():
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
            
        return success_response(data={
            'patients': patients_list,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit
            }
        })
    except Exception as e:
        logger.error(f"Get all patients error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)


@admin_patients_bp.route('/<patient_id>', methods=['GET'])
@unified_access(permission=AdminPermissions.PATIENTS_READ)
def get_patient_detail(ctx, patient_id):
    """Get single patient detail by ID (admin can access any patient)"""
    try:
        with UnboundSession():
            patient = db.session.get(Patient, patient_id)
            if not patient:
                return error_response('Patient not found', code='NOT_FOUND', status_code=404)
            
            patient_dict = patient.to_dict()
            if patient.tenant_id:
                tenant = db.session.get(Tenant, patient.tenant_id)
                if tenant:
                    patient_dict['tenant_name'] = tenant.name
            
            return success_response(data=patient_dict)
    except Exception as e:
        logger.error(f"Get patient detail error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)


@admin_patients_bp.route('/<patient_id>/devices', methods=['GET'])
@unified_access(permission=AdminPermissions.PATIENTS_READ)
def get_patient_devices(ctx, patient_id):
    """Get devices for a patient (admin can access any patient)"""
    try:
        with UnboundSession():
            patient = db.session.get(Patient, patient_id)
            if not patient:
                return error_response('Patient not found', code='NOT_FOUND', status_code=404)
            
            devices = DeviceAssignment.query.filter_by(patient_id=patient_id).all()
            devices_list = [d.to_dict() for d in devices]
            
            return success_response(data={'devices': devices_list})
    except Exception as e:
        logger.error(f"Get patient devices error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)


@admin_patients_bp.route('/<patient_id>/sales', methods=['GET'])
@unified_access(permission=AdminPermissions.PATIENTS_READ)
def get_patient_sales(ctx, patient_id):
    """Get sales for a patient (admin can access any patient)"""
    try:
        with UnboundSession():
            patient = db.session.get(Patient, patient_id)
            if not patient:
                return error_response('Patient not found', code='NOT_FOUND', status_code=404)
            
            sales = Sale.query.filter_by(patient_id=patient_id).all()
            sales_list = [s.to_dict() for s in sales]
            
            return success_response(data={'sales': sales_list})
    except Exception as e:
        logger.error(f"Get patient sales error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)


@admin_patients_bp.route('/<patient_id>/timeline', methods=['GET'])
@unified_access(permission=AdminPermissions.PATIENTS_READ)
def get_patient_timeline(ctx, patient_id):
    """Get timeline/activity log for a patient (admin can access any patient)"""
    try:
        with UnboundSession():
            patient = db.session.get(Patient, patient_id)
            if not patient:
                return error_response('Patient not found', code='NOT_FOUND', status_code=404)
            
            activities = ActivityLog.query.filter_by(entity_id=patient_id).order_by(ActivityLog.created_at.desc()).all()
            timeline_list = [a.to_dict() for a in activities]
            
            return success_response(data={'timeline': timeline_list})
    except Exception as e:
        logger.error(f"Get patient timeline error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)


@admin_patients_bp.route('/<patient_id>/documents', methods=['GET'])
@unified_access(permission=AdminPermissions.PATIENTS_READ)
def get_patient_documents(ctx, patient_id):
    """Get documents for a patient (admin can access any patient)"""
    try:
        with UnboundSession():
            patient = db.session.get(Patient, patient_id)
            if not patient:
                return error_response('Patient not found', code='NOT_FOUND', status_code=404)
            
            # documents = Document.query.filter_by(patient_id=patient_id).all()
            # documents_list = [d.to_dict() for d in documents]
            documents_list = [] # Placeholder until Document model is created
            
            return success_response(data={'documents': documents_list})
    except Exception as e:
        logger.error(f"Get patient documents error: {e}")
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)
