"""
Sales Module - Pricing Endpoints

Handles pricing calculations, previews, and recalculations.
"""
from flask import Blueprint, request, jsonify
from models.base import db
from models.sales import Sale, DeviceAssignment
from services.pricing import calculate_device_pricing
from datetime import datetime
import logging

from .helpers import ERROR_NO_DATA_PROVIDED

logger = logging.getLogger(__name__)

pricing_bp = Blueprint('sales_pricing', __name__)


def _get_sales_for_recalc(payload):
    """Get filtered sales for recalculation."""
    patient_id = payload.get('patientId') or request.args.get('patientId')
    sale_id = payload.get('saleId') or request.args.get('saleId')
    limit_val = payload.get('limit') or request.args.get('limit')
    limit = int(limit_val) if limit_val else None

    q = Sale.query
    if sale_id:
        q = q.filter_by(id=sale_id)
    if patient_id:
        q = q.filter_by(patient_id=patient_id)

    sales = q.order_by(Sale.created_at.desc()).all()
    if limit:
        sales = sales[:limit]

    return sales


def _get_assignments_for_sale(sale):
    """Get device assignments for a sale, trying new method first, then legacy."""
    assignments = DeviceAssignment.query.filter_by(sale_id=sale.id).all()
    if not assignments:
        # Legacy linkage: try right/left ear assignment ids if present
        linked_ids = [getattr(sale, 'right_ear_assignment_id', None), getattr(sale, 'left_ear_assignment_id', None)]
        linked_ids = [lid for lid in linked_ids if lid]
        if linked_ids:
            assignments = DeviceAssignment.query.filter(DeviceAssignment.id.in_(linked_ids)).all()
    return assignments


def _prepare_device_assignments_payload(assignments):
    """Prepare device assignments payload for pricing calculation."""
    return [{
        'device_id': a.device_id,
        'base_price': float(a.list_price) if a.list_price else 0.0,
        'discount_type': a.discount_type,
        'discount_value': float(a.discount_value or 0.0),
        'sgk_scheme': a.sgk_scheme
    } for a in assignments]


def _update_sale_pricing(sale, pricing_calc):
    """Update sale with recalculated pricing."""
    sale.list_price_total = pricing_calc.get('total_amount', sale.list_price_total)
    sale.total_amount = pricing_calc.get('total_amount', sale.total_amount)
    sale.discount_amount = pricing_calc.get('total_discount', sale.discount_amount)
    sale.final_amount = pricing_calc.get('sale_price_total', sale.final_amount)
    sale.sgk_coverage = pricing_calc.get('sgk_coverage_amount', sale.sgk_coverage)
    sale.patient_payment = pricing_calc.get('patient_responsible_amount', sale.patient_payment)


def calculate_product_pricing(product, data):
    """Calculate pricing for product sale."""
    # Allow override from data (frontend sale price)
    override_price = data.get('price') or data.get('amount') or data.get('base_price')
    
    if override_price is not None:
        try:
            base_price = float(override_price)
        except (ValueError, TypeError):
            base_price = float(product.price or 0)
    else:
        base_price = float(product.price or 0)

    # Calculate discount
    discount_type = data.get('discount_type') or 'percentage'
    discount_value = float(data.get('discount_value') or 0)

    if discount_type == 'percentage':
        discount = base_price * (discount_value / 100)
    else:
        discount = discount_value

    final_price = base_price - discount
    return base_price, discount, max(0, final_price)


def calculate_sgk_coverage(sale, assignments):
    """Calculate SGK coverage for a sale."""
    sgk_coverage_value = 0
    
    if assignments:
        for assignment in assignments:
            if assignment.sgk_support:
                sgk_coverage_value += float(assignment.sgk_support)
    elif hasattr(sale, 'sgk_coverage') and sale.sgk_coverage:
        sgk_coverage_value = float(sale.sgk_coverage)
    
    return sgk_coverage_value


@pricing_bp.route('/pricing-preview', methods=['POST'])
def pricing_preview():
    """Generate pricing preview for devices/accessories/services."""
    try:
        data = request.get_json() or {}
        if not data:
            return jsonify({
                "success": False, 
                "error": ERROR_NO_DATA_PROVIDED, 
                "timestamp": datetime.now().isoformat()
            }), 400

        device_assignments = data.get('device_assignments', [])
        accessories = data.get('accessories', [])
        services = data.get('services', [])
        sgk_scheme = data.get('sgk_scheme')

        from app import get_settings
        settings_response = get_settings()
        if not settings_response.get_json().get('success'):
            return jsonify({
                "success": False, 
                "error": "Unable to load settings", 
                "timestamp": datetime.now().isoformat()
            }), 500
        settings = settings_response.get_json()['settings']

        sgk_scheme = sgk_scheme or settings['sgk']['default_scheme']

        pricing = calculate_device_pricing(device_assignments, accessories, services, sgk_scheme, settings)

        return jsonify({
            "success": True, 
            "pricing": pricing, 
            "timestamp": datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Pricing preview error: {str(e)}")
        return jsonify({
            "success": False, 
            "error": str(e), 
            "timestamp": datetime.now().isoformat()
        }), 500


@pricing_bp.route('/sales/recalc', methods=['POST'])
def recalc_sales():
    """Recalculate SGK and patient payment amounts for sales.
    
    Optional filters in body or query: patientId, saleId, limit.
    """
    try:
        payload = request.get_json(silent=True) or {}
        sales = _get_sales_for_recalc(payload)

        from app import get_settings
        settings_response = get_settings()
        settings = settings_response.get_json().get('settings', {})

        updated = 0
        processed = 0
        errors = []

        for s in sales:
            processed += 1
            try:
                assignments = _get_assignments_for_sale(s)
                if not assignments:
                    continue

                device_assignments_payload = _prepare_device_assignments_payload(assignments)
                sgk_scheme = assignments[0].sgk_scheme if assignments and assignments[0].sgk_scheme else settings.get('sgk', {}).get('default_scheme')

                pricing_calc = calculate_device_pricing(
                    device_assignments=device_assignments_payload,
                    accessories=[],
                    services=[],
                    sgk_scheme=sgk_scheme,
                    settings=settings
                )

                _update_sale_pricing(s, pricing_calc)
                db.session.add(s)
                updated += 1
            except Exception as ie:
                errors.append({'sale_id': s.id, 'error': str(ie)})

        try:
            db.session.commit()
        except Exception as ce:
            db.session.rollback()
            return jsonify({
                'success': False, 
                'error': str(ce), 
                'updated': updated, 
                'processed': processed, 
                'errors': errors
            }), 500

        return jsonify({
            'success': True, 
            'updated': updated, 
            'processed': processed, 
            'errors': errors, 
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Recalc sales error: {str(e)}")
        return jsonify({
            'success': False, 
            'error': str(e), 
            'timestamp': datetime.now().isoformat()
        }), 500
