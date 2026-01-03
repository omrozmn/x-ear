"""
Sales Module - Read Endpoints

Handles GET operations for sales and patient sales.
"""
from flask import Blueprint, request, jsonify
from models.base import db
from models.patient import Patient
from models.device import Device
from models.sales import Sale, DeviceAssignment, PaymentPlan, PaymentRecord
from services.pricing import calculate_device_pricing
from utils.decorators import unified_access
from utils.response import success_response, error_response
from datetime import datetime
import logging

from .helpers import (
    ERROR_SALE_NOT_FOUND,
    ERROR_PATIENT_NOT_FOUND,
    build_device_info,
    build_sale_data,
    create_device_name
)

logger = logging.getLogger(__name__)

read_bp = Blueprint('sales_read', __name__)


def _get_device_assignments_for_sale(sale):
    """Get device assignments for a sale, trying new method first, then legacy."""
    assignments = DeviceAssignment.query.filter_by(sale_id=sale.id).all()

    # If no assignments found by sale_id, try legacy method
    if not assignments:
        linked_ids = [getattr(sale, 'right_ear_assignment_id', None), getattr(sale, 'left_ear_assignment_id', None)]
        linked_ids = [lid for lid in linked_ids if lid]
        if linked_ids:
            assignments = DeviceAssignment.query.filter(DeviceAssignment.id.in_(linked_ids)).all()

    return assignments


def _build_device_info_with_lookup(assignment):
    """Build device information dictionary from assignment with device lookup."""
    device = db.session.get(Device, assignment.device_id)
    if not device:
        return None

    # Get inventory name if available
    device_name = None
    barcode = None
    if device.inventory_id:
        from models.inventory import InventoryItem
        inventory_item = db.session.get(InventoryItem, device.inventory_id)
        if inventory_item:
            device_name = inventory_item.name
            barcode = inventory_item.barcode

    device_name = create_device_name(device, device_name)

    return {
        'id': device.id,
        'name': device_name,
        'brand': device.brand,
        'model': device.model,
        'serialNumber': device.serial_number,
        'serialNumberLeft': device.serial_number_left,
        'serialNumberRight': device.serial_number_right,
        'barcode': barcode,
        'ear': assignment.ear,
        'listPrice': float(assignment.list_price) if assignment.list_price else None,
        'salePrice': float(assignment.sale_price) if assignment.sale_price else None,
        'sgk_coverage_amount': float(assignment.sgk_support) if assignment.sgk_support else None,
        'patient_responsible_amount': float(assignment.net_payable) if hasattr(assignment, 'net_payable') and assignment.net_payable is not None else None,
        # Backwards-compatible keys used by frontend components
        'sgkReduction': float(assignment.sgk_support) if assignment.sgk_support else None,
        'patientPayment': float(assignment.net_payable) if hasattr(assignment, 'net_payable') and assignment.net_payable is not None else None
    }


def _calculate_sgk_coverage(sale, assignments):
    """Calculate SGK coverage for a sale, recalculating if needed."""
    # If stored SGK coverage is zero, recalc with current settings for accurate display
    if (not sale.sgk_coverage or abs(float(sale.sgk_coverage)) < 0.01) and assignments:
        try:
            from app import get_settings
            settings_response = get_settings()
            settings = settings_response.get_json().get('settings', {})
            device_assignments_payload = []
            for a in assignments:
                device_assignments_payload.append({
                    'device_id': a.device_id,
                    'base_price': float(a.list_price) if a.list_price else 0.0,
                    'discount_type': a.discount_type,
                    'discount_value': float(a.discount_value or 0.0),
                    'sgk_scheme': a.sgk_scheme
                })
            pricing_preview = calculate_device_pricing(
                device_assignments=device_assignments_payload,
                accessories=[],
                services=[],
                sgk_scheme=assignments[0].sgk_scheme if assignments[0].sgk_scheme else settings.get('sgk', {}).get('default_scheme'),
                settings=settings
            )
            return pricing_preview.get('sgk_coverage_amount', 0)
        except Exception as e:
            logger.warning(f"Failed to recalculate SGK coverage: {e}")
            return 0
    return float(sale.sgk_coverage) if sale.sgk_coverage else 0


@read_bp.route('/sales', methods=['GET'])
@unified_access(resource='sales', action='read')
def get_sales(ctx):
    """Get all sales with pagination and filtering.
    
    Access:
    - Super Admin: All tenants (or specific tenant via X-Tenant-ID header)
    - Tenant Admin: All sales in tenant
    - Tenant User: Sales filtered by assigned branches
    """
    try:
        page = int(request.args.get('page', 1))
        per_page = min(int(request.args.get('per_page', 50)), 100)
        search = request.args.get('search', '').strip()
        
        query = Sale.query
        
        # Tenant scoping
        if ctx.tenant_id:
            query = query.filter_by(tenant_id=ctx.tenant_id)
            
            # Branch-level filtering for tenant users with 'admin' role
            if ctx.user and ctx.user.role == 'admin':
                user_branch_ids = [b.id for b in ctx.user.branches]
                if user_branch_ids:
                    query = query.filter(Sale.branch_id.in_(user_branch_ids))
                else:
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
                    'first_name': sale.patient.first_name,
                    'last_name': sale.patient.last_name
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
        logger.error(f"Get sales error: {str(e)}")
        return error_response(str(e), code='SALES_READ_ERROR', status_code=500)


@read_bp.route('/patients/<patient_id>/sales', methods=['GET'])
def get_patient_sales(patient_id):
    """Get all sales for a specific patient."""
    try:
        patient = db.session.get(Patient, patient_id)
        if not patient:
            return jsonify({
                "success": False, 
                "error": ERROR_PATIENT_NOT_FOUND, 
                "timestamp": datetime.now().isoformat()
            }), 404

        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        sales_pagination = Sale.query.filter_by(patient_id=patient_id).order_by(Sale.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
        sales = sales_pagination.items

        sales_data = []
        for sale in sales:
            assignments = _get_device_assignments_for_sale(sale)

            devices = []
            for assignment in assignments:
                device_info = _build_device_info_with_lookup(assignment)
                if device_info:
                    devices.append(device_info)

            payment_plan = PaymentPlan.query.filter_by(sale_id=sale.id).first()
            payment_records = PaymentRecord.query.filter_by(sale_id=sale.id).order_by(PaymentRecord.payment_date.desc()).all()

            from models.invoice import Invoice
            invoice = Invoice.query.filter_by(sale_id=sale.id).first()

            sgk_coverage_value = _calculate_sgk_coverage(sale, assignments)

            sales_data.append(build_sale_data(sale, devices, payment_plan, payment_records, invoice, sgk_coverage_value))

        return jsonify({
            "success": True,
            "data": sales_data,
            "meta": {
                "total": sales_pagination.total,
                "page": page,
                "perPage": per_page,
                "totalPages": sales_pagination.pages
            },
            "timestamp": datetime.now().isoformat()
        })

    except Exception as e:
        logger.error(f"Get patient sales error: {str(e)}")
        return jsonify({
            "success": False, 
            "error": str(e), 
            "timestamp": datetime.now().isoformat()
        }), 500
