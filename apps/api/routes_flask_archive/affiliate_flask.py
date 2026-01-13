from flask import Blueprint, request, jsonify
from models.base import db
from services.affiliate_service import AffiliateService
import logging

logger = logging.getLogger(__name__)

affiliate_bp = Blueprint('affiliate', __name__)


@affiliate_bp.route('/register', methods=['POST'])
def register_affiliate():
    try:
        payload = request.get_json() or {}
        email = payload.get('email')
        password = payload.get('password')
        iban = payload.get('iban') if 'iban' in payload else None
        if not email or not password:
            return jsonify({'success': False, 'error': 'email and password required'}), 400
        affiliate = AffiliateService.create_affiliate(db.session, email, password, iban)
        return jsonify({'id': affiliate.id, 'email': affiliate.email, 'code': affiliate.code}), 201
    except Exception as e:
        logger.exception('Failed to register affiliate: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 400


@affiliate_bp.route('/login', methods=['POST'])
def login_affiliate():
    try:
        payload = request.get_json() or {}
        email = payload.get('email')
        password = payload.get('password')
        if not email or not password:
            return jsonify({'success': False, 'error': 'email and password required'}), 400
        user = AffiliateService.authenticate(db.session, email, password)
        if not user:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
        
        # Calculate display_id
        created_date = user.created_at.strftime('%y%m%d') if user.created_at else '000000'
        display_id = f"{created_date}{user.id}"
            
        return jsonify({'id': user.id, 'email': user.email, 'display_id': display_id, 'is_active': user.is_active, 'code': user.code}), 200
    except Exception as e:
        logger.exception('Affiliate login failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@affiliate_bp.route('/me', methods=['GET'])
def get_me():
    try:
        affiliate_id = request.args.get('affiliate_id')
        if not affiliate_id:
            return jsonify({'success': False, 'error': 'affiliate_id required'}), 400
        user = AffiliateService.get_affiliate_by_id(db.session, int(affiliate_id))
        if not user:
            return jsonify({'success': False, 'error': 'Affiliate not found'}), 404
        
        created_date = user.created_at.strftime('%y%m%d') if user.created_at else '000000'
        display_id = f"{created_date}{user.id}"

        return jsonify({
            'id': user.id, 
            'email': user.email, 
            'iban': user.iban, 
            'account_holder_name': user.account_holder_name,
            'phone_number': user.phone_number,
            'is_active': user.is_active, 
            'code': user.code,
            'display_id': display_id
        }), 200
    except Exception as e:
        logger.exception('Get affiliate me failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@affiliate_bp.route('/<int:affiliate_id>', methods=['PATCH'])
def update_affiliate_payment(affiliate_id):
    try:
        payload = request.get_json() or {}
        iban = payload.get('iban')
        account_holder_name = payload.get('account_holder_name')
        phone_number = payload.get('phone_number')

        # IBAN not mandatory if updating partial info, but service handles validation if provided
        user = AffiliateService.update_payment_info(db.session, affiliate_id, iban, account_holder_name, phone_number)
        
        return jsonify({
            'id': user.id, 
            'iban': user.iban, 
            'account_holder_name': user.account_holder_name,
            'phone_number': user.phone_number
        }), 200
    except Exception as e:
        logger.exception('Update affiliate payment failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 400

@affiliate_bp.route('/<int:affiliate_id>/commissions', methods=['GET'])
def get_commissions(affiliate_id):
    try:
        commissions = AffiliateService.get_commissions(db.session, affiliate_id)
        return jsonify([
            {
                "id": c.id,
                "event": c.event,
                "amount": float(c.amount), # specific conversion for Decimal
                "status": c.status,
                "created_at": c.created_at.isoformat() if c.created_at else None
            }
            for c in commissions
        ]), 200
    except Exception as e:
        logger.exception('Get commissions failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@affiliate_bp.route('/list', methods=['GET'])
def list_affiliates():
    try:
        skip = int(request.args.get('skip', 0))
        limit = int(request.args.get('limit', 100))
        
        from utils.tenant_security import UnboundSession
        with UnboundSession():
            users = AffiliateService.list_affiliates(db.session, skip, limit)
            
            results = []
            for u in users:
                created_date = u.created_at.strftime('%y%m%d') if u.created_at else '000000'
                display_id = f"{created_date}{u.id}"
                results.append({
                    'id': u.id, 
                    'email': u.email, 
                    'iban': u.iban,
                    'account_holder_name': u.account_holder_name,
                    'phone_number': u.phone_number,
                    'is_active': u.is_active,
                    'display_id': display_id,
                    'created_at': u.created_at.isoformat() if u.created_at else None
                })

        return jsonify(results), 200
    except Exception as e:
        logger.exception('List affiliates failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500

@affiliate_bp.route('/lookup', methods=['GET'])
def lookup_affiliate():
    try:
        code = request.args.get('code')
        if not code:
            return jsonify({'success': False, 'error': 'Code required'}), 400
            
        affiliate = AffiliateService.get_affiliate_by_code(db.session, code)
        if not affiliate:
             return jsonify({'success': False, 'error': 'Invalid code'}), 404
             
        # Return public info only
        name = affiliate.account_holder_name or f"Affiliate {affiliate.code}"
        return jsonify({'success': True, 'name': name, 'code': affiliate.code}), 200
    except Exception as e:
        logger.exception('Lookup affiliate failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500
