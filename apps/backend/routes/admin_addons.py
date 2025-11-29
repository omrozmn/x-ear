"""
Admin Add-ons routes for managing additional features/packages
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from datetime import datetime
from models.base import db
from models.addon import AddOn, AddOnType
import logging
import uuid

logger = logging.getLogger(__name__)

admin_addons_bp = Blueprint('admin_addons', __name__, url_prefix='/api/admin/addons')

@admin_addons_bp.route('', methods=['GET'])
@jwt_required()
def list_addons():
    """List all add-ons"""
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 20, type=int)
        addon_type = request.args.get('type', '')
        is_active = request.args.get('is_active', '')
        
        query = AddOn.query
        
        if addon_type:
            query = query.filter_by(addon_type=AddOnType[addon_type.upper()])
        if is_active:
            query = query.filter_by(is_active=is_active.lower() == 'true')
            
        query = query.order_by(AddOn.created_at.desc())
        
        total = query.count()
        addons = query.offset((page - 1) * limit).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': {
                'addons': [a.to_dict() for a in addons],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
        
    except Exception as e:
        logger.error(f"List addons error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_addons_bp.route('', methods=['POST'])
@jwt_required()
def create_addon():
    """Create a new add-on"""
    try:
        data = request.get_json()
        
        if not data.get('name') or data.get('price') is None:
            return jsonify({
                'success': False,
                'error': {'message': 'Name and price are required'}
            }), 400
            
        # Generate slug
        import re
        slug = data.get('slug')
        if not slug:
            slug = re.sub(r'[^\w\s-]', '', data['name'].lower())
            slug = re.sub(r'[-\s]+', '-', slug).strip('-')

        addon = AddOn(
            id=str(uuid.uuid4()),
            name=data['name'],
            slug=slug,
            description=data.get('description'),
            addon_type=AddOnType[data.get('addon_type', 'FLAT_FEE').upper()],
            price=data['price'],
            currency=data.get('currency', 'TRY'),
            unit_name=data.get('unit_name'),
            limit_amount=data.get('limit_amount'),
            is_active=data.get('is_active', True)
        )
        
        db.session.add(addon)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {'addon': addon.to_dict()}
        }), 201
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create addon error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500

@admin_addons_bp.route('/<addon_id>', methods=['GET'])
@jwt_required()
def get_addon(addon_id):
    """Get add-on details"""
    try:
        addon = AddOn.query.get(addon_id)
        if not addon:
            return jsonify({
                'success': False,
                'error': {'message': 'Add-on not found'}
            }), 404
            
        return jsonify({
            'success': True,
            'data': {'addon': addon.to_dict()}
        }), 200
        
    except Exception as e:
        logger.error(f"Get addon error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_addons_bp.route('/<addon_id>', methods=['PUT'])
@jwt_required()
def update_addon(addon_id):
    """Update add-on"""
    try:
        addon = AddOn.query.get(addon_id)
        if not addon:
            return jsonify({
                'success': False,
                'error': {'message': 'Add-on not found'}
            }), 404
            
        data = request.get_json()
        
        if 'name' in data:
            addon.name = data['name']
        if 'slug' in data:
            addon.slug = data['slug']
        if 'description' in data:
            addon.description = data['description']
        if 'addon_type' in data:
            addon.addon_type = AddOnType[data['addon_type'].upper()]
        if 'price' in data:
            addon.price = data['price']
        if 'currency' in data:
            addon.currency = data['currency']
        if 'unit_name' in data:
            addon.unit_name = data['unit_name']
        if 'limit_amount' in data:
            addon.limit_amount = data['limit_amount']
        if 'is_active' in data:
            addon.is_active = data['is_active']
            
        addon.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': {'addon': addon.to_dict()}
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update addon error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e)}
        }), 500

@admin_addons_bp.route('/<addon_id>', methods=['DELETE'])
@jwt_required()
def delete_addon(addon_id):
    """Delete add-on (soft delete by setting is_active=False)"""
    try:
        addon = AddOn.query.get(addon_id)
        if not addon:
            return jsonify({
                'success': False,
                'error': {'message': 'Add-on not found'}
            }), 404
            
        addon.is_active = False
        addon.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Add-on deleted successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete addon error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500
