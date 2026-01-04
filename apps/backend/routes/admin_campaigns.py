from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from models.base import db
from models.campaign import Campaign
from sqlalchemy import or_
from datetime import datetime
from models.user import User
from utils.tenant_security import UnboundSession
import logging

logger = logging.getLogger(__name__)

admin_campaigns_bp = Blueprint('admin_campaigns', __name__, url_prefix='/api/admin/campaigns')

@admin_campaigns_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.CAMPAIGNS_READ)
def get_campaigns(ctx):
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

            return success_response(data={
                'campaigns': [c.to_dict() for c in campaigns],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            })

    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_campaigns_bp.route('', methods=['POST'])
@unified_access(permission=AdminPermissions.CAMPAIGNS_MANAGE)
def create_campaign(ctx):
    try:
        data = request.get_json()
        
        if not data.get('name'):
            return error_response('Campaign name is required', code='MISSING_FIELD', status_code=400)

        # Get current user to determine tenant_id
        # ctx.principal_id is the user ID. We need to fetch the User object to get tenant_id safely.
        # Although ctx.tenant_id might be set, let's follow the existing logic which fetches User.
        with UnboundSession():
             current_user = db.session.get(User, ctx.principal_id)
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

        return success_response(data={'campaign': new_campaign.to_dict()}, status_code=201)

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='CREATE_FAILED', status_code=400)

@admin_campaigns_bp.route('/<string:id>', methods=['GET'])
@unified_access(permission=AdminPermissions.CAMPAIGNS_READ)
def get_campaign(ctx, id):
    try:
        with UnboundSession():
            campaign = Campaign.query.get(id)
            if not campaign:
                return error_response('Campaign not found', code='NOT_FOUND', status_code=404)

        return success_response(data={'campaign': campaign.to_dict()})

    except Exception as e:
        return error_response(str(e), code='INTERNAL_ERROR', status_code=500)

@admin_campaigns_bp.route('/<string:id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.CAMPAIGNS_MANAGE)
def update_campaign(ctx, id):
    try:
        with UnboundSession():
            campaign = Campaign.query.get(id)
            if not campaign:
                return error_response('Campaign not found', code='NOT_FOUND', status_code=404)

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

        return success_response(data={'campaign': campaign.to_dict()})

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='UPDATE_FAILED', status_code=400)

@admin_campaigns_bp.route('/<string:id>', methods=['DELETE'])
@unified_access(permission=AdminPermissions.CAMPAIGNS_MANAGE)
def delete_campaign(ctx, id):
    try:
        with UnboundSession():
            campaign = Campaign.query.get(id)
            if not campaign:
                return error_response('Campaign not found', code='NOT_FOUND', status_code=404)

        db.session.delete(campaign)
        db.session.commit()

        return success_response(message='Campaign deleted successfully')

    except Exception as e:
        db.session.rollback()
        return error_response(str(e), code='DELETE_FAILED', status_code=400)
