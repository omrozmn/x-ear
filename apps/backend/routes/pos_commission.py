"""
POS Commission Rates System
Handles installment-based commission calculations
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.user import User
from models.tenant import Tenant
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
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant or not tenant.settings:
        return None
    
    return tenant.settings.get('pos_commission_rates')

def calculate_commission(amount, installment_count, provider='xear_pos', tenant_id=None):
    """
    Calculate commission for a given amount and installment count
    Returns: {
        'gross_amount': original amount,
        'commission_rate': rate percentage,
        'commission_amount': calculated commission,
        'net_amount': amount after commission,
        'provider': provider name
    }
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
@jwt_required()
def calculate_commission_endpoint():
    """Calculate commission for given amount and installments"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 401
    
    data = request.get_json()
    amount = float(data.get('amount', 0))
    installment_count = int(data.get('installment_count', 1))
    provider = data.get('provider', 'xear_pos')
    
    if amount <= 0:
        return jsonify({'success': False, 'error': 'Invalid amount'}), 400
    
    result = calculate_commission(amount, installment_count, provider, user.tenant_id)
    
    return jsonify({
        'success': True,
        'data': result
    })

@pos_commission_bp.route('/rates', methods=['GET'])
@jwt_required()
def get_commission_rates():
    """Get commission rates for current tenant"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 401
    
    # Get tenant rates (or system defaults)
    tenant_rates = get_tenant_commission_rates(user.tenant_id)
    system_rates = get_system_commission_rates()
    
    # Use tenant rates if available, otherwise system rates
    active_rates = tenant_rates if tenant_rates else system_rates
    
    return jsonify({
        'success': True,
        'data': {
            'rates': active_rates,
            'is_custom': tenant_rates is not None,
            'available_providers': list(active_rates.keys())
        }
    })

@pos_commission_bp.route('/rates/tenant/<tenant_id>', methods=['GET'])
@jwt_required()
def get_tenant_rates_admin(tenant_id):
    """Get tenant-specific rates (admin only)"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user or user.role not in ['admin', 'super_admin']:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    tenant_rates = get_tenant_commission_rates(tenant_id)
    system_rates = get_system_commission_rates()
    
    return jsonify({
        'success': True,
        'data': {
            'tenant_rates': tenant_rates,
            'system_rates': system_rates,
            'effective_rates': tenant_rates if tenant_rates else system_rates
        }
    })

@pos_commission_bp.route('/rates/tenant/<tenant_id>', methods=['PUT'])
@jwt_required()
def update_tenant_rates_admin(tenant_id):
    """Update tenant-specific rates (admin only)"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user or user.role not in ['admin', 'super_admin']:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    tenant = db.session.get(Tenant, tenant_id)
    if not tenant:
        return jsonify({'success': False, 'error': 'Tenant not found'}), 404
    
    data = request.get_json()
    rates = data.get('rates')
    
    if not rates:
        return jsonify({'success': False, 'error': 'Rates required'}), 400
    
    # Validate rates structure
    for provider, provider_rates in rates.items():
        if not isinstance(provider_rates, dict):
            return jsonify({'success': False, 'error': f'Invalid rates for {provider}'}), 400
    
    # Update tenant settings
    if not tenant.settings:
        tenant.settings = {}
    
    tenant.settings['pos_commission_rates'] = rates
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(tenant, "settings")
    
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Tenant rates updated'})

@pos_commission_bp.route('/rates/system', methods=['GET'])
@jwt_required()
def get_system_rates_endpoint():
    """Get system-wide default rates (admin only)"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user or user.role not in ['admin', 'super_admin']:
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    rates = get_system_commission_rates()
    
    return jsonify({
        'success': True,
        'data': {
            'rates': rates,
            'defaults': DEFAULT_COMMISSION_RATES
        }
    })

@pos_commission_bp.route('/rates/system', methods=['PUT'])
@jwt_required()
def update_system_rates():
    """Update system-wide default rates (super admin only)"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user or user.role != 'super_admin':
        return jsonify({'success': False, 'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    rates = data.get('rates')
    
    if not rates:
        return jsonify({'success': False, 'error': 'Rates required'}), 400
    
    # Validate rates structure
    for provider, provider_rates in rates.items():
        if not isinstance(provider_rates, dict):
            return jsonify({'success': False, 'error': f'Invalid rates for {provider}'}), 400
    
    # Update system settings
    # TODO: Integrate with Settings model
    # For now, return error - use tenant-level rates instead
    return jsonify({'success': False, 'error': 'System-level rates update not yet implemented. Use tenant-level rates.'}), 501
    
    return jsonify({'success': True, 'message': 'System rates updated'})

@pos_commission_bp.route('/installment-options', methods=['POST'])
@jwt_required()
def get_installment_options():
    """Get installment options with calculated amounts for each"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'success': False, 'error': 'User not found'}), 401
    
    data = request.get_json()
    amount = float(data.get('amount', 0))
    provider = data.get('provider', 'xear_pos')
    
    if amount <= 0:
        return jsonify({'success': False, 'error': 'Invalid amount'}), 400
    
    # Get available installment counts
    installments = [1, 2, 3, 6, 9, 12]
    
    options = []
    for inst_count in installments:
        calc = calculate_commission(amount, inst_count, provider, user.tenant_id)
        options.append({
            'installment_count': inst_count,
            'label': 'Tek Çekim' if inst_count == 1 else f'{inst_count} Taksit',
            'gross_amount': calc['gross_amount'],
            'commission_rate': calc['commission_rate'],
            'commission_amount': calc['commission_amount'],
            'net_amount': calc['net_amount'],
            'monthly_payment': round(calc['gross_amount'] / inst_count, 2) if inst_count > 1 else None
        })
    
    return jsonify({
        'success': True,
        'data': {
            'options': options,
            'provider': provider
        }
    })
