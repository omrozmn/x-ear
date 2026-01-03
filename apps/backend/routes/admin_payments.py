from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.sales import PaymentRecord
from utils.decorators import unified_access
from utils.admin_permissions import AdminPermissions

admin_payments_bp = Blueprint('admin_payments', __name__, url_prefix='/api/admin/payments')

@admin_payments_bp.route('/pos/transactions', methods=['GET'])
@unified_access(permission=AdminPermissions.PAYMENTS_READ)
def get_pos_transactions(ctx):
    """Get all POS transactions for admin panel"""
    try:
        provider = request.args.get('provider')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = int(request.args.get('limit', 100))
        
        with UnboundSession():
            query = PaymentRecord.query.filter(PaymentRecord.pos_provider.isnot(None))
            
            if provider:
                query = query.filter_by(pos_provider=provider)
                
            if start_date:
                try:
                     s_dt = datetime.fromisoformat(start_date)
                     query = query.filter(PaymentRecord.payment_date >= s_dt)
                except: 
                    pass
                    
            if end_date:
                try:
                     e_dt = datetime.fromisoformat(end_date)
                     query = query.filter(PaymentRecord.payment_date <= e_dt)
                except:
                    pass
                    
            query = query.order_by(PaymentRecord.payment_date.desc()).limit(limit)
            records = query.all()
            
        return jsonify({
            'success': True,
            'data': [p.to_dict() for p in records]
        })
        
    except Exception as e:
        logger.error(f"Admin get POS transactions error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
