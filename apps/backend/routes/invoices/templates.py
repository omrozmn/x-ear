"""
Invoice Templates Operations
----------------------------
Template management for invoice generation.
"""

from flask import jsonify, request
from datetime import datetime
from uuid import uuid4

from . import invoices_bp
from utils.decorators import unified_access
import logging

logger = logging.getLogger(__name__)


def now_utc():
    """Return current UTC timestamp"""
    return datetime.now()


@invoices_bp.route('/invoices/templates', methods=['GET'])
@unified_access(resource='invoices', action='read')
def get_invoice_templates(ctx):
    """Get available invoice templates - Unified Access"""
    try:
        # For now, return predefined templates
        # In a real implementation, these would be stored in database
        templates = [
            {
                'id': 'standard',
                'name': 'Standard Invoice',
                'description': 'Default invoice template with company branding',
                'fields': ['invoiceNumber', 'date', 'customerInfo', 'items', 'totals', 'paymentTerms'],
                'isDefault': True
            },
            {
                'id': 'detailed',
                'name': 'Detailed Invoice',
                'description': 'Comprehensive invoice with item descriptions and specifications',
                'fields': ['invoiceNumber', 'date', 'customerInfo', 'items', 'itemDetails', 'totals', 'paymentTerms', 'notes'],
                'isDefault': False
            },
            {
                'id': 'sgk',
                'name': 'SGK Invoice',
                'description': 'Invoice template for SGK submissions',
                'fields': ['invoiceNumber', 'date', 'customerInfo', 'sgkInfo', 'items', 'totals', 'sgkCoverage'],
                'isDefault': False
            },
            {
                'id': 'proforma',
                'name': 'Proforma Invoice',
                'description': 'Proforma invoice template for quotations',
                'fields': ['proformaNumber', 'date', 'customerInfo', 'items', 'totals', 'validityPeriod'],
                'isDefault': False
            }
        ]
        
        return jsonify({
            'success': True,
            'data': templates,
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Get invoice templates error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500


@invoices_bp.route('/invoices/templates', methods=['POST'])
@unified_access(resource='invoices', action='write')
def create_invoice_template(ctx):
    """Create a custom invoice template - Unified Access"""
    try:
        data = request.get_json()
        
        if not data.get('name') or not data.get('fields'):
            return jsonify({
                'success': False,
                'error': 'Template name and fields are required'
            }), 400
        
        # In a real implementation, this would be saved to database
        template = {
            'id': str(uuid4()),
            'name': data['name'],
            'description': data.get('description', ''),
            'fields': data['fields'],
            'isDefault': data.get('isDefault', False),
            'isCustom': True,
            'createdAt': now_utc().isoformat(),
            'createdBy': ctx.principal_id
        }
        
        logger.info(f"Invoice template created: {template['id']} by {ctx.principal_id}")
        
        return jsonify({
            'success': True,
            'data': template,
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 201
        
    except Exception as e:
        logger.error(f"Create invoice template error: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'requestId': str(uuid4()),
            'timestamp': now_utc().isoformat()
        }), 500
