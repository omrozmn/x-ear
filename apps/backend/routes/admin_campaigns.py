from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.campaign import Campaign
from utils.admin_permissions import require_admin_permission, AdminPermissions
from sqlalchemy import or_
from datetime import datetime

admin_campaigns_bp = Blueprint('admin_campaigns', __name__, url_prefix='/api/admin/campaigns')

@admin_campaigns_bp.route('', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.CAMPAIGNS_READ)
def get_campaigns():
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status')

        query = Campaign.query

        if search:
            query = query.filter(
                or_(
                    Campaign.name.ilike(f'%{search}%'),
                    Campaign.description.ilike(f'%{search}%')
                )
            )
        
        if status:
            if status == 'active':
                query = query.filter(Campaign.is_active == True)
            elif status == 'inactive':
                query = query.filter(Campaign.is_active == False)

        total = query.count()
        campaigns = query.order_by(Campaign.created_at.desc()).offset((page - 1) * limit).limit(limit).all()

        return jsonify({
            'success': True,
            'data': {
                'campaigns': [c.to_dict() for c in campaigns],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_campaigns_bp.route('', methods=['POST'])
@jwt_required()
@require_admin_permission(AdminPermissions.CAMPAIGNS_MANAGE)
def create_campaign():
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'success': False, 'error': {'message': 'Campaign name is required'}}), 400

        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')) if data.get('start_date') else None
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00')) if data.get('end_date') else None

        new_campaign = Campaign(
            name=data['name'],
            description=data.get('description'),
            discount_type=data.get('discount_type', 'PERCENTAGE'),
            discount_value=data.get('discount_value', 0),
            start_date=start_date,
            end_date=end_date,
            is_active=data.get('is_active', True),
            target_audience=data.get('target_audience', 'ALL'),
            created_at=datetime.utcnow()
        )

        db.session.add(new_campaign)
        db.session.commit()

        return jsonify({
            'success': True,
            'data': {'campaign': new_campaign.to_dict()}
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_campaigns_bp.route('/<int:id>', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.CAMPAIGNS_READ)
def get_campaign(id):
    try:
        campaign = db.session.get(Campaign, id)
        if not campaign:
            return jsonify({'success': False, 'error': {'message': 'Campaign not found'}}), 404

        return jsonify({
            'success': True,
            'data': {'campaign': campaign.to_dict()}
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_campaigns_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
@require_admin_permission(AdminPermissions.CAMPAIGNS_MANAGE)
def update_campaign(id):
    try:
        campaign = db.session.get(Campaign, id)
        if not campaign:
            return jsonify({'success': False, 'error': {'message': 'Campaign not found'}}), 404

        data = request.get_json()
        
        if 'name' in data:
            campaign.name = data['name']
        if 'description' in data:
            campaign.description = data['description']
        if 'discount_type' in data:
            campaign.discount_type = data['discount_type']
        if 'discount_value' in data:
            campaign.discount_value = data['discount_value']
        if 'start_date' in data:
            campaign.start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00')) if data['start_date'] else None
        if 'end_date' in data:
            campaign.end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00')) if data['end_date'] else None
        if 'is_active' in data:
            campaign.is_active = data['is_active']
        if 'target_audience' in data:
            campaign.target_audience = data['target_audience']

        campaign.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'data': {'campaign': campaign.to_dict()}
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_campaigns_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
@require_admin_permission(AdminPermissions.CAMPAIGNS_MANAGE)
def delete_campaign(id):
    try:
        campaign = db.session.get(Campaign, id)
        if not campaign:
            return jsonify({'success': False, 'error': {'message': 'Campaign not found'}}), 404

        db.session.delete(campaign)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Campaign deleted successfully'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500
