"""
Sales Device Operations - Unified Access
----------------------------------------
Device assignment operations
"""

from flask import request
from models.base import db
from models.sales import DeviceAssignment
from models.device import Device
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.idempotency import idempotent
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

from . import sales_bp

@sales_bp.route('/device-assignments/<assignment_id>', methods=['PATCH'])
@unified_access(resource='sales', action='write')
def update_device_assignment(ctx, assignment_id):
    """
    Update a device assignment.
    
    Access:
    - Tenant scoped
    """
    try:
        assignment = db.session.get(DeviceAssignment, assignment_id)
        if not assignment:
            return error_response("Assignment not found", code='ASSIGNMENT_NOT_FOUND', status_code=404)
        
        # Get sale for tenant check
        if assignment.sale and ctx.tenant_id and assignment.sale.tenant_id != ctx.tenant_id:
            return error_response("Access denied", code='FORBIDDEN', status_code=403)
        
        data = request.get_json()
        if not data:
            return error_response("No data provided", code='NO_DATA', status_code=400)
        
        # Update allowed fields
        if 'status' in data:
            assignment.status = data['status']
        if 'notes' in data:
            assignment.notes = data['notes']
        
        assignment.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Device assignment updated: {assignment_id}")
        
        return success_response(
            data=assignment.to_dict() if hasattr(assignment, 'to_dict') else {'id': assignment.id},
            meta={'assignmentId': assignment_id}
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update device assignment error: {str(e)}", exc_info=True)
        return error_response(str(e), code='ASSIGNMENT_UPDATE_ERROR', status_code=500)


@sales_bp.route('/patients/<patient_id>/assign-devices-extended', methods=['POST'])
@unified_access(resource='sales', action='write')
@idempotent(methods=['POST'])
def assign_devices_to_patient(ctx, patient_id):
    """
    Assign devices to a patient (creates sale + assignments).
    
    Access:
    - Tenant scoped
    - Transactional operation
    """
    try:
        from models.patient import Patient
        from models.sales import Sale
        from models.base import gen_sale_id
        from uuid import uuid4
        
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return error_response("Patient not found", code='PATIENT_NOT_FOUND', status_code=404)
        
        # Tenant scope check
        if ctx.tenant_id and patient.tenant_id != ctx.tenant_id:
            return error_response("Access denied", code='FORBIDDEN', status_code=403)
        
        data = request.get_json()
        if not data:
            return error_response("No data provided", code='NO_DATA', status_code=400)
        
        device_assignments = data.get('device_assignments') or data.get('deviceAssignments') or []
        if not device_assignments:
            return error_response("No devices to assign", code='NO_DEVICES', status_code=400)
        
        # Create sale
        sale = Sale(
            id=gen_sale_id(),
            patient_id=patient_id,
            tenant_id=ctx.tenant_id or patient.tenant_id,
            branch_id=data.get('branch_id') or data.get('branchId'),
            sale_date=datetime.utcnow(),
            total_amount=data.get('total_amount') or data.get('totalAmount') or 0,
            status='pending',
            created_by=ctx.principal_id
        )
        db.session.add(sale)
        db.session.flush()  # Get sale.id
        
        # Create device assignments
        assignments_created = []
        for dev_data in device_assignments:
            device_id = dev_data.get('device_id') or dev_data.get('deviceId')
            if not device_id:
                continue
            
            device = db.session.get(Device, device_id)
            if not device:
                logger.warning(f"Device not found: {device_id}")
                continue
            
            assignment = DeviceAssignment(
                id=str(uuid4()),
                sale_id=sale.id,
                device_id=device_id,
                assigned_at=datetime.utcnow(),
                status='active',
                created_by=ctx.principal_id
            )
            db.session.add(assignment)
            assignments_created.append(assignment)
        
        db.session.commit()
        
        logger.info(f"Devices assigned to patient {patient_id}: {len(assignments_created)} devices")
        
        return success_response(
            data={
                'sale': sale.to_dict(),
                'assignments': [a.to_dict() if hasattr(a, 'to_dict') else {'id': a.id} for a in assignments_created]
            },
            meta={'saleId': sale.id, 'patientId': patient_id, 'assignmentCount': len(assignments_created)},
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Assign devices error: {str(e)}", exc_info=True)
        return error_response(str(e), code='DEVICE_ASSIGN_ERROR', status_code=500)
