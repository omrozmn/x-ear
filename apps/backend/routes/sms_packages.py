from flask import Blueprint, jsonify, request
from models.sms_package import SmsPackage, db
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.user import User

# Public Blueprint
sms_packages_public_bp = Blueprint('sms_packages_public', __name__, url_prefix='/api/sms-packages')

@sms_packages_public_bp.route('', methods=['GET'])
def list_public_packages():
    """List all active SMS packages (Public)"""
    try:
        packages = SmsPackage.query.filter_by(is_active=True).order_by(SmsPackage.price).all()
        return jsonify({
            'success': True,
            'data': [p.to_dict() for p in packages]
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


# Admin Blueprint
admin_sms_packages_bp = Blueprint('admin_sms_packages', __name__, url_prefix='/api/admin/sms/packages')

@admin_sms_packages_bp.route('', methods=['GET'])
@jwt_required()
def list_admin_packages():
    """List all SMS packages (Admin)"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        
        pagination = SmsPackage.query.order_by(SmsPackage.price).paginate(page=page, per_page=limit, error_out=False)
        
        return jsonify({
            'success': True,
            'data': [p.to_dict() for p in pagination.items],
            'pagination': {
                'total': pagination.total,
                'pages': pagination.pages,
                'current_page': pagination.page,
                'per_page': pagination.per_page
            }
        }), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_sms_packages_bp.route('', methods=['POST'])
@jwt_required()
def create_package():
    try:
        data = request.get_json()
        data = data.get('data', data) # Handle nested data wrapper if present
        
        pkg = SmsPackage(
            name=data['name'],
            description=data.get('description'),
            sms_count=int(data['smsCount']), # Frontend sends camelCase
            price=float(data['price']),
            is_active=data.get('isActive', True)
        )
        db.session.add(pkg)
        db.session.commit()
        return jsonify({'success': True, 'data': pkg.to_dict()}), 201
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@admin_sms_packages_bp.route('/<package_id>', methods=['PUT'])
@jwt_required()
def update_package(package_id):
    try:
        pkg = SmsPackage.query.get(package_id)
        if not pkg:
            return jsonify({'success': False, 'message': 'Package not found'}), 404
            
        data = request.get_json()
        data = data.get('data', data)
        
        if 'name' in data: pkg.name = data['name']
        if 'description' in data: pkg.description = data['description']
        if 'smsCount' in data: pkg.sms_count = int(data['smsCount'])
        if 'price' in data: pkg.price = float(data['price'])
        if 'isActive' in data: pkg.is_active = data['isActive']
        
        db.session.commit()
        return jsonify({'success': True, 'data': pkg.to_dict()}), 200
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
