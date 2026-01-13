"""
Sales Read Operations - Unified Access
--------------------------------------
GET endpoints for sales data retrieval using AccessContext
"""

from flask import request, jsonify
from models.base import db
from models.sales import Sale, PaymentRecord
from models.patient import Patient
from models.user import User
from utils.decorators import unified_access
from utils.response import success_response, error_response
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

from . import sales_bp

@sales_bp.route('/sales', methods=['GET'])
@unified_access(resource='sales', action='read')
def get_sales(ctx):
    """
    Get all sales with pagination and filtering.
    
    Access:
    - Super Admin: All sales across all tenants (or specific tenant if X-Tenant-ID provided)
    - Tenant Admin: All sales in their tenant
    - Tenant User: Sales filtered by assigned branches (if applicable)
    """
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 50)), 100)
        search = request.args.get('search', '').strip()
        
        # Base query
        query = Sale.query
        
        # Apply tenant scope (ABAC)
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        
        # Row-level filtering for tenant users (branch-based)
        if ctx.is_tenant_user:
            # Get user for branch access
            user = db.session.get(User, ctx.principal_id)
            if user and user.branches:
                user_branch_ids = [b.id for b in user.branches]
                query = query.filter(Sale.branch_id.in_(user_branch_ids))
            else:
                # User has no branch access - return empty
                return success_response(
                    data=[],
                    meta={
                        'page': page,
                        'perPage': per_page,
                        'total': 0,
                        'totalPages': 0,
                        'tenantScope': ctx.tenant_id
                    }
                )
        
        # Search functionality
        if search:
            query = query.join(Patient).filter(
                db.or_(
                    Patient.first_name.ilike(f'%{search}%'),
                    Patient.last_name.ilike(f'%{search}%'),
                    Sale.id.ilike(f'%{search}%')
                )
            )
        
        # Order by sale date descending
        query = query.order_by(Sale.sale_date.desc())
        
        # Paginate
        paginated = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        sales_data = []
        for sale in paginated.items:
            sale_dict = sale.to_dict()
            # Add patient info
            if sale.patient:
                sale_dict['patient'] = {
                    'id': sale.patient.id,
                    'firstName': sale.patient.first_name,
                    'lastName': sale.patient.last_name
                }
            sales_data.append(sale_dict)
        
        return success_response(
            data=sales_data,
            meta={
                'page': page,
                'perPage': per_page,
                'total': paginated.total,
                'totalPages': paginated.pages,
                'tenantScope': ctx.tenant_id
            }
        )
        
    except Exception as e:
        logger.error(f"Get sales error: {str(e)}", exc_info=True)
        return error_response(str(e), code='SALES_READ_ERROR', status_code=500)


@sales_bp.route('/patients/<patient_id>/sales', methods=['GET'])
@unified_access(resource='sales', action='read')
def get_patient_sales(ctx, patient_id):
    """
    Get all sales for a specific patient.
    
    Access:
    - Respects tenant scope
    - Returns sales for the specified patient only
    """
    try:
        # Verify patient exists and is in scope
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return error_response("Patient not found", code='PATIENT_NOT_FOUND', status_code=404)
        
        # Tenant scope check
        if ctx.tenant_id and patient.tenant_id != ctx.tenant_id:
            return error_response("Access denied", code='FORBIDDEN', status_code=403)
        
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        
        # Query sales
        query = Sale.query.filter_by(patient_id=patient_id)
        
        # Apply tenant scope
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
        
        paginated = query.order_by(Sale.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        sales_data = []
        for sale in paginated.items:
            # Get enriched sale data
            sale_dict = _build_enriched_sale_dict(sale)
            sales_data.append(sale_dict)
        
        return success_response(
            data=sales_data,
            meta={
                'total': paginated.total,
                'page': page,
                'perPage': per_page,
                'totalPages': paginated.pages,
                'patientId': patient_id
            }
        )
        
    except Exception as e:
        logger.error(f"Get patient sales error: {str(e)}", exc_info=True)
        return error_response(str(e), code='PATIENT_SALES_ERROR', status_code=500)


def _build_enriched_sale_dict(sale):
    """Build enriched sale dictionary with related data"""
    from models.sales import DeviceAssignment, PaymentPlan
    from models.invoice import Invoice
    
    sale_dict = sale.to_dict()
    
    # Add device assignments
    assignments = DeviceAssignment.query.filter_by(sale_id=sale.id).all()
    sale_dict['devices'] = [_build_device_info(a) for a in assignments]
    
    # Add payment plan
    payment_plan = PaymentPlan.query.filter_by(sale_id=sale.id).first()
    if payment_plan:
        sale_dict['paymentPlan'] = payment_plan.to_dict()
    
    # Add payment records
    payment_records = PaymentRecord.query.filter_by(sale_id=sale.id)\
        .order_by(PaymentRecord.payment_date.desc()).all()
    sale_dict['paymentRecords'] = [p.to_dict() for p in payment_records]
    
    # Add invoice info
    invoice = Invoice.query.filter_by(sale_id=sale.id).first()
    if invoice:
        sale_dict['invoice'] = {
            'id': invoice.id,
            'invoiceNumber': invoice.invoice_number,
            'status': invoice.status
        }
    
    # Calculate SGK coverage if applicable
    sgk_coverage = sum(
        float(a.sgk_contribution or 0) 
        for a in assignments 
        if hasattr(a, 'sgk_contribution')
    )
    sale_dict['sgkCoverage'] = sgk_coverage
    
    return sale_dict


def _build_device_info(assignment):
    """Build device information from assignment"""
    try:
        device_dict = {
            'assignmentId': assignment.id,
            'assignedAt': assignment.assigned_at.isoformat() if assignment.assigned_at else None,
            'status': assignment.status
        }
        
        if assignment.device:
            device_dict.update({
                'deviceId': assignment.device.id,
                'name': assignment.device.name,
                'serialNumber': assignment.device.serial_number,
                'category': assignment.device.category
            })
        
        return device_dict
    except Exception as e:
        logger.warning(f"Error building device info: {e}")
        return {}
