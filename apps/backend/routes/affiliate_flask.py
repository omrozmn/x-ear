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
        return jsonify({'id': user.id, 'email': user.email}), 200
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
        return jsonify({'id': user.id, 'email': user.email, 'iban': user.iban, 'is_active': user.is_active, 'code': user.code}), 200
    except Exception as e:
        logger.exception('Get affiliate me failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500


@affiliate_bp.route('/<int:affiliate_id>', methods=['PATCH'])
def update_affiliate_iban(affiliate_id):
    try:
        payload = request.get_json() or {}
        iban = payload.get('iban')
        if not iban:
            return jsonify({'success': False, 'error': 'iban required'}), 400
        user = AffiliateService.update_iban(db.session, affiliate_id, iban)
        return jsonify({'id': user.id, 'iban': user.iban}), 200
    except Exception as e:
        logger.exception('Update affiliate IBAN failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 400


@affiliate_bp.route('/list', methods=['GET'])
def list_affiliates():
    try:
        skip = int(request.args.get('skip', 0))
        limit = int(request.args.get('limit', 100))
        users = AffiliateService.list_affiliates(db.session, skip, limit)
        return jsonify([{'id': u.id, 'email': u.email, 'iban': u.iban, 'is_active': u.is_active} for u in users]), 200
    except Exception as e:
        logger.exception('List affiliates failed: %s', e)
        return jsonify({'success': False, 'error': str(e)}), 500
