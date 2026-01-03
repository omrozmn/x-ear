"""
POS Commission Rates System
Handles installment-based commission calculations
"""

from flask import Blueprint, request, jsonify
from models.base import db
from models.user import User
from models.tenant import Tenant
from utils.decorators import unified_access
from utils.response import success_response, error_response
import logging

logger = logging.getLogger(__name__)

pos_commission_bp = Blueprint('pos_commission', __name__, url_prefix='/api/pos/commission')

# Default commission rates (can be overridden at tenant level)
DEFAULT_COMMISSION_RATES = {
    'paytr': {
        1: 2.99,   # Tek çekim %2.99
        2: 3.49,   # 2 taksit %3.49
        3: 3.99,   # 3 taksit %3.99
        6: 4.49,   # 6 taksit %4.49
        9: 4.99,   # 9 taksit %4.99
        12: 5.49   # 12 taksit %5.49
    },
    'iyzico': {
        1: 2.75,
        2: 3.25,
        3: 3.75,
        6: 4.25,
        9: 4.75,
        12: 5.25
    },
    'xear_pos': {  # X-Ear POS (default if tenant uses our infrastructure)
        1: 2.49,   # More competitive rates
        2: 2.99,
        3: 3.49,
        6: 3.99,
        9: 4.49,
        12: 4.99
    }
}

def get_system_commission_rates():
    """Get system-wide default commission rates"""
    # TODO: Integrate with Settings model later
    # For now, return defaults
    return DEFAULT_COMMISSION_RATES

def get_tenant_commission_rates(tenant_id):
    """Get tenant-specific commission rates (overrides system defaults)"""
    if not tenant_id:
        return None
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant or not tenant.settings:
        return None
    
    return tenant.settings.get('pos_commission_rates')

def calculate_commission(amount, installment_count, provider='xear_pos', tenant_id=None):
    """
    Calculate commission for a given amount and installment count
    Returns detailed calculation result
    """
    # Get rates (tenant overrides system)
    rates = None
    if tenant_id:
        rates = get_tenant_commission_rates(tenant_id)
    
    if not rates:
        rates = get_system_commission_rates()
    
    # Get provider rates
    provider_rates = rates.get(provider, rates.get('xear_pos', DEFAULT_COMMISSION_RATES['xear_pos']))
    
    # Get rate for installment count
    commission_rate = provider_rates.get(installment_count, provider_rates.get(1, 2.99))
    
    # Calculate
    gross_amount = float(amount)
    commission_amount = gross_amount * (commission_rate / 100)
    net_amount = gross_amount - commission_amount
    
    return {
        'gross_amount': round(gross_amount, 2),
        'commission_rate': commission_rate,
        'commission_amount': round(commission_amount, 2),
        'net_amount': round(net_amount, 2),
        'provider': provider,
        'installment_count': installment_count
    }

@pos_commission_bp.route('/calculate', methods=['POST'])
@unified_access(resource='pos', action='read')
def calculate_commission_endpoint(ctx):
    """Calculate commission for given amount and installments"""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
    
    data = request.get_json()
    amount = float(data.get('amount', 0))
    installment_count = int(data.get('installment_count', 1))
    provider = data.get('provider', 'xear_pos')
    
    if amount <= 0:
        return error_response('Invalid amount', code='INVALID_AMOUNT', status_code=400)
    
    result = calculate_commission(amount, installment_count, provider, ctx.tenant_id)
    
    return success_response(data=result)

@pos_commission_bp.route('/rates', methods=['GET'])
@unified_access(resource='pos', action='read')
def get_commission_rates(ctx):
    """Get commission rates for current tenant"""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
    
    # Get tenant rates (or system defaults)
    tenant_rates = get_tenant_commission_rates(ctx.tenant_id)
    system_rates = get_system_commission_rates()
    
    # Use tenant rates if available, otherwise system rates
    active_rates = tenant_rates if tenant_rates else system_rates
    
    return success_response(data={
        'rates': active_rates,
        'is_custom': tenant_rates is not None,
        'available_providers': list(active_rates.keys())
    })

@pos_commission_bp.route('/rates/tenant/<tenant_id>', methods=['GET'])
@unified_access(resource='admin.pos', action='read')
def get_tenant_rates_admin(ctx, tenant_id):
    """Get tenant-specific rates (admin only)"""
    # Check permissions
    if not ctx.is_admin and (not ctx.user or ctx.user.role not in ['admin', 'super_admin']):
        return error_response('Unauthorized', code='FORBIDDEN', status_code=403)
    
    tenant_rates = get_tenant_commission_rates(tenant_id)
    system_rates = get_system_commission_rates()
    
    return success_response(data={
        'tenant_rates': tenant_rates,
        'system_rates': system_rates,
        'effective_rates': tenant_rates if tenant_rates else system_rates
    })

@pos_commission_bp.route('/rates/tenant/<tenant_id>', methods=['PUT'])
@unified_access(resource='admin.pos', action='write')
def update_tenant_rates_admin(ctx, tenant_id):
    """Update tenant-specific rates (admin only)"""
    if not ctx.is_admin and (not ctx.user or ctx.user.role not in ['admin', 'super_admin']):
        return error_response('Unauthorized', code='FORBIDDEN', status_code=403)
    
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        return error_response('Tenant not found', code='NOT_FOUND', status_code=404)
    
    data = request.get_json()
    rates = data.get('rates')
    
    if not rates:
        return error_response('Rates required', code='MISSING_RATES', status_code=400)
    
    # Validate rates structure
    for provider, provider_rates in rates.items():
        if not isinstance(provider_rates, dict):
            return error_response(f'Invalid rates for {provider}', code='INVALID_FORMAT', status_code=400)
    
    # Update tenant settings
    if not tenant.settings:
        tenant.settings = {}
    
    tenant.settings['pos_commission_rates'] = rates
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(tenant, "settings")
    
    db.session.commit()
    
    return success_response(message='Tenant rates updated')

@pos_commission_bp.route('/rates/system', methods=['GET'])
@unified_access(resource='admin.pos', action='read')
def get_system_rates_endpoint(ctx):
    """Get system-wide default rates (admin only)"""
    if not ctx.is_admin and (not ctx.user or ctx.user.role not in ['admin', 'super_admin']):
        return error_response('Unauthorized', code='FORBIDDEN', status_code=403)
    
    rates = get_system_commission_rates()
    
    return success_response(data={
        'rates': rates,
        'defaults': DEFAULT_COMMISSION_RATES
    })

@pos_commission_bp.route('/rates/system', methods=['PUT'])
@unified_access(resource='admin.pos', action='write')
def update_system_rates(ctx):
    """Update system-wide default rates (super admin only)"""
    # Strict super admin check
    is_super_admin = False
    if ctx.is_admin and str(ctx.principal_id).startswith('admin_'):
         # Additional check could be done here if needed, but ctx.is_admin usually implies it
         is_super_admin = True
    elif ctx.user and ctx.user.role == 'super_admin':
         is_super_admin = True

    if not is_super_admin:
        return error_response('Unauthorized. Super admin required.', code='FORBIDDEN', status_code=403)
    
    data = request.get_json()
    rates = data.get('rates')
    
    if not rates:
        return error_response('Rates required', code='MISSING_RATES', status_code=400)
    
    # Validate rates structure
    for provider, provider_rates in rates.items():
        if not isinstance(provider_rates, dict):
            return error_response(f'Invalid rates for {provider}', code='INVALID_FORMAT', status_code=400)
    
    # Update system settings
    return error_response('System-level rates update not yet implemented. Use tenant-level rates.', code='NOT_IMPLEMENTED', status_code=501)

@pos_commission_bp.route('/installment-options', methods=['POST'])
@unified_access(resource='pos', action='read')
def get_installment_options(ctx):
    """Get installment options with calculated amounts for each"""
    if not ctx.tenant_id:
        return error_response('Tenant context required', code='TENANT_REQUIRED', status_code=400)
    
    data = request.get_json()
    amount = float(data.get('amount', 0))
    provider = data.get('provider', 'xear_pos')
    
    if amount <= 0:
        return error_response('Invalid amount', code='INVALID_AMOUNT', status_code=400)
    
    # Get available installment counts
    installments = [1, 2, 3, 6, 9, 12]
    
    options = []
    for inst_count in installments:
        calc = calculate_commission(amount, inst_count, provider, ctx.tenant_id)
        options.append({
            'installment_count': inst_count,
            'label': 'Tek Çekim' if inst_count == 1 else f'{inst_count} Taksit',
            'gross_amount': calc['gross_amount'],
            'commission_rate': calc['commission_rate'],
            'commission_amount': calc['commission_amount'],
            'net_amount': calc['net_amount'],
            'monthly_payment': round(calc['gross_amount'] / inst_count, 2) if inst_count > 1 else None
        })
    
    return success_response(data={
        'options': options,
        'provider': provider
    })
