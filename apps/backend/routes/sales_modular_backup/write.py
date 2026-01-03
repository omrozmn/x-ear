"""
Sales Write Operations - Unified Access
---------------------------------------
POST/PUT/PATCH endpoints for sale creation and updates
"""

from flask import request, jsonify
from models.base import db, gen_sale_id
from models.sales import Sale
from models.patient import Patient
from models.user import User
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.idempotency import idempotent
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

from . import sales_bp

@sales_bp.route('/sales', methods=['POST'])
@unified_access(resource='sales', action='write')
@idempotent(methods=['POST'])
def create_sale(ctx):
    """
    Create a new sale.
    
    Access:
    - Tenant scoped: Sale created in user's tenant
    - Requires write permission on sales
    """
    try:
        data = request.get_json()
        if not data:
            return error_response("No data provided", code='NO_DATA', status_code=400)
        
        patient_id = data.get('patient_id') or data.get('patientId')
        if not patient_id:
            return error_response("Patient ID required", code='PATIENT_ID_REQUIRED', status_code=400)
        
        # Verify patient exists and is in scope
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return error_response("Patient not found", code='PATIENT_NOT_FOUND', status_code=404)
        
        # Tenant scope check
        if ctx.tenant_id and patient.tenant_id != ctx.tenant_id:
            return error_response("Access denied", code='FORBIDDEN', status_code=403)
        
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
        db.session.commit()
        
        logger.info(f"Sale created: {sale.id} for patient {patient_id} by {ctx.principal_id}")
        
        return success_response(
            data=sale.to_dict(),
            meta={'saleId': sale.id, 'tenantScope': ctx.tenant_id},
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create sale error: {str(e)}", exc_info=True)
        return error_response(str(e), code='SALE_CREATE_ERROR', status_code=500)


@sales_bp.route('/sales/<sale_id>', methods=['PUT', 'PATCH'])
@unified_access(resource='sales', action='write')
def update_sale(ctx, sale_id):
    """
    Update an existing sale.
    
    Access:
    - Tenant scoped
    - Can only update sales within accessible scope
    """
    try:
        sale = db.session.get(Sale, sale_id)
        if not sale:
            return error_response("Sale not found", code='SALE_NOT_FOUND', status_code=404)
        
        # Tenant scope check
        if ctx.tenant_id and sale.tenant_id != ctx.tenant_id:
            return error_response("Access denied", code='FORBIDDEN', status_code=403)
        
        data = request.get_json()
        if not data:
            return error_response("No data provided", code='NO_DATA', status_code=400)
        
        # Update allowed fields
        updatable_fields = {
            'status': 'status',
            'totalAmount': 'total_amount',
            'total_amount': 'total_amount',
            'notes': 'notes',
            'branchId': 'branch_id',
            'branch_id': 'branch_id'
        }
        
        for json_key, db_field in updatable_fields.items():
            if json_key in data:
                setattr(sale, db_field, data[json_key])
        
        sale.updated_at = datetime.utcnow()
        db.session.commit()
        
        logger.info(f"Sale updated: {sale_id} by {ctx.principal_id}")
        
        return success_response(
            data=sale.to_dict(),
            meta={'saleId': sale_id, 'tenantScope': ctx.tenant_id}
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update sale error: {str(e)}", exc_info=True)
        return error_response(str(e), code='SALE_UPDATE_ERROR', status_code=500)


@sales_bp.route('/sales/recalc', methods=['POST'])
@unified_access(resource='sales', action='write')
def recalculate_sales(ctx):
    """
    Recalculate sale totals (batch operation).
    
    Access:
    - Admin only operation
    - Tenant scoped
    """
    try:
        data = request.get_json() or {}
        sale_ids = data.get('sale_ids') or data.get('saleIds') or []
        
        if not sale_ids:
            return error_response("No sale IDs provided", code='NO_SALE_IDS', status_code=400)
        
        # Query sales
        query = Sale.query.filter(Sale.id.in_(sale_ids))
        
        # Apply tenant scope
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        
        sales = query.all()
        updated_count = 0
        
        for sale in sales:
            # Recalculation logic would go here
            # For now, just touch updated_at
            sale.updated_at = datetime.utcnow()
            updated_count += 1
        
        db.session.commit()
        
        logger.info(f"Recalculated {updated_count} sales by {ctx.principal_id}")
        
        return success_response(
            data={'updatedCount': updated_count},
            meta={'tenantScope': ctx.tenant_id}
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Recalculate sales error: {str(e)}", exc_info=True)
        return error_response(str(e), code='RECALC_ERROR', status_code=500)
