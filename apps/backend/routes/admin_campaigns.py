from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models.base import db
from models.campaign import Campaign
from utils.admin_permissions import require_admin_permission, AdminPermissions
from sqlalchemy import or_
from datetime import datetime

admin_campaigns_bp = Blueprint('admin_campaigns', __name__, url_prefix='/api/admin/campaigns')

from utils.tenant_security import UnboundSession

@admin_campaigns_bp.route('', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.CAMPAIGNS_READ)
def get_campaigns():
    try:
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        status = request.args.get('status')

        with UnboundSession():
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
        from flask_jwt_extended import get_jwt_identity
        from models.user import User
        
        data = request.get_json()
        
        if not data.get('name'):
            return jsonify({'success': False, 'error': {'message': 'Campaign name is required'}}), 400

        # Get current user to determine tenant_id
        current_user_id = get_jwt_identity()
        current_user = User.query.get(current_user_id)
        tenant_id = current_user.tenant_id if current_user else None

        scheduled_at = datetime.fromisoformat(data['scheduled_at'].replace('Z', '+00:00')) if data.get('scheduled_at') else None

        new_campaign = Campaign(
            tenant_id=tenant_id,
            name=data['name'],
            description=data.get('description'),
            campaign_type=data.get('campaign_type', 'sms'),
            message_template=data.get('message_template', 'Default message'),
            subject=data.get('subject'),
            scheduled_at=scheduled_at,
            status=data.get('status', 'draft'),
            target_segment=data.get('target_segment')
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

@admin_campaigns_bp.route('/<string:id>', methods=['GET'])
@jwt_required()
@require_admin_permission(AdminPermissions.CAMPAIGNS_READ)
def get_campaign(id):
    try:
        with UnboundSession():
            campaign = Campaign.query.get(id)
            if not campaign:
                return jsonify({'success': False, 'error': {'message': 'Campaign not found'}}), 404

        return jsonify({
            'success': True,
            'data': {'campaign': campaign.to_dict()}
        }), 200

    except Exception as e:
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_campaigns_bp.route('/<string:id>', methods=['PUT'])
@jwt_required()
@require_admin_permission(AdminPermissions.CAMPAIGNS_MANAGE)
def update_campaign(id):
    try:
        with UnboundSession():
            campaign = Campaign.query.get(id)
            if not campaign:
                return jsonify({'success': False, 'error': {'message': 'Campaign not found'}}), 404

        data = request.get_json()
        
        # Update only fields that exist in Campaign model
        if 'name' in data:
            campaign.name = data['name']
        if 'description' in data:
            campaign.description = data['description']
        if 'campaign_type' in data:
            campaign.campaign_type = data['campaign_type']
        if 'message_template' in data:
            campaign.message_template = data['message_template']
        if 'subject' in data:
            campaign.subject = data['subject']
        if 'scheduled_at' in data:
            campaign.scheduled_at = datetime.fromisoformat(data['scheduled_at'].replace('Z', '+00:00')) if data['scheduled_at'] else None
        if 'status' in data:
            campaign.status = data['status']
        if 'target_segment' in data:
            campaign.target_segment = data['target_segment']

        campaign.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            'success': True,
            'data': {'campaign': campaign.to_dict()}
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': {'message': str(e)}}), 500

@admin_campaigns_bp.route('/<string:id>', methods=['DELETE'])
@jwt_required()
@require_admin_permission(AdminPermissions.CAMPAIGNS_MANAGE)
def delete_campaign(id):
    try:
        with UnboundSession():
            campaign = Campaign.query.get(id)
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
