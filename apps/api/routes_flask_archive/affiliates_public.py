from flask import Blueprint, jsonify
from models.affiliate_user import AffiliateUser

affiliate_public_bp = Blueprint('affiliate_public', __name__, url_prefix='/api/affiliates')

@affiliate_public_bp.route('/check/<code>', methods=['GET'])
def check_affiliate(code):
    """Check if affiliate code exists and return basic info (Public)"""
    try:
        affiliate = AffiliateUser.query.filter_by(code=code).first()
        
        if not affiliate:
            # Also try checking by ID if it looks like one? Or maybe 'code' is the referral_code
            return jsonify({'success': False, 'message': 'Affiliate not found'}), 404
            
        return jsonify({
            'success': True,
            'data': {
                'id': affiliate.id,
                'name': f"{affiliate.first_name} {affiliate.last_name}",
                'code': affiliate.code
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
