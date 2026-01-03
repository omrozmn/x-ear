"""
Sales Pricing Operations - Unified Access
-----------------------------------------
Pricing preview and calculations
"""

from flask import request
from utils.decorators import unified_access
from utils.response import success_response, error_response
from services.pricing import calculate_device_pricing
import logging

logger = logging.getLogger(__name__)

from . import sales_bp

@sales_bp.route('/pricing-preview', methods=['POST'])
@unified_access(resource='sales', action='read')
def pricing_preview(ctx):
    """
    Calculate pricing preview for sale configuration.
    
    Access:
    - Requires read permission (calculation only, no data changes)
    """
    try:
        data = request.get_json() or {}
        if not data:
            return error_response("No data provided", code='NO_DATA', status_code=400)
        
        device_assignments = data.get('device_assignments') or data.get('deviceAssignments') or []
        accessories = data.get('accessories', [])
        services = data.get('services', [])
        sgk_scheme = data.get('sgk_scheme') or data.get('sgkScheme')
        
        # Get settings (simplified - in production would use proper settings service)
        try:
            from app import get_settings
            settings_response = get_settings()
            if not settings_response.get_json().get('success'):
                # Fallback to default scheme
                sgk_scheme = sgk_scheme or 'standard'
                settings = {'sgk': {'default_scheme': 'standard'}}
            else:
                settings = settings_response.get_json()['settings']
                sgk_scheme = sgk_scheme or settings.get('sgk', {}).get('default_scheme', 'standard')
        except Exception as e:
            logger.warning(f"Could not load settings: {e}")
            sgk_scheme = sgk_scheme or 'standard'
            settings = {'sgk': {'default_scheme': 'standard'}}
        
        # Calculate pricing
        pricing = calculate_device_pricing(
            device_assignments, 
            accessories, 
            services, 
            sgk_scheme, 
            settings
        )
        
        return success_response(
            data=pricing,
            meta={'sgkScheme': sgk_scheme}
        )
        
    except Exception as e:
        logger.error(f"Pricing preview error: {str(e)}", exc_info=True)
        return error_response(str(e), code='PRICING_ERROR', status_code=500)


@sales_bp.route('/sales/logs', methods=['POST'])
@unified_access(resource='sales', action='write')
def create_sale_log(ctx):
    """
    Create activity log for sales operations.
    
    Access:
    - Tenant scoped
    """
    try:
        from models.user import ActivityLog
        from uuid import uuid4
        from datetime import datetime
        from models.base import db
        
        data = request.get_json() or {}
        if not data:
            return error_response("No data provided", code='NO_DATA', status_code=400)
        
        log = ActivityLog(
            id=str(uuid4()),
            user_id=ctx.principal_id,
            action=data.get('action', 'sale_operation'),
            details=data.get('details'),
            timestamp=datetime.utcnow()
        )
        
        db.session.add(log)
        db.session.commit()
        
        return success_response(
            data={'logId': log.id},
            meta={'userId': ctx.principal_id},
            status_code=201
        )
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create sale log error: {str(e)}", exc_info=True)
        return error_response(str(e), code='LOG_CREATE_ERROR', status_code=500)
