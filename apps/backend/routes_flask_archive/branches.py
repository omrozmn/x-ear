"""
Branches Management
-------------------
Branch CRUD operations with unified access control.
"""

from flask import Blueprint, request, jsonify
from models.base import db
from models.branch import Branch
from utils.decorators import unified_access
from utils.query_policy import tenant_scoped_query, get_or_404_scoped, branch_filtered_query
import logging

logger = logging.getLogger(__name__)

branches_bp = Blueprint('branches', __name__)


@branches_bp.route('/branches', methods=['GET'])
@unified_access(resource='branches', action='read')
def get_branches(ctx):
    """Get all branches for the current tenant - Unified Access"""
    try:
        # Use tenant-scoped query
        query = tenant_scoped_query(ctx, Branch)
        
        # Apply branch filtering for tenant admins
        query = branch_filtered_query(ctx, query, Branch)
        if query is None:
            return jsonify({'success': True, 'data': []}), 200

        branches = query.all()
        return jsonify({'success': True, 'data': [b.to_dict() for b in branches]}), 200
    except Exception as e:
        logger.error(f"Get branches error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@branches_bp.route('/branches', methods=['POST'])
@unified_access(resource='branches', action='write')
def create_branch(ctx):
    """Create a new branch - Unified Access"""
    try:
        # Only tenant admins or super admins can create branches
        if not ctx.is_super_admin and not ctx.is_tenant_admin:
            return jsonify({'success': False, 'error': 'Only tenant admins can create branches'}), 403

        # Determine tenant_id
        tenant_id = ctx.tenant_id
        if not tenant_id:
            data = request.get_json() or {}
            tenant_id = data.get('tenant_id')
            if not tenant_id:
                return jsonify({'success': False, 'error': 'tenant_id is required for super admin operations'}), 400

        # Enforce branch limits
        try:
            from models.tenant import Tenant
            tenant = db.session.get(Tenant, tenant_id)
            if not tenant:
                return jsonify({'success': False, 'error': 'Tenant not found'}), 404
                
            existing_branch_count = Branch.query.filter_by(tenant_id=tenant_id).count()
            if existing_branch_count >= (tenant.max_branches or 1):
                return jsonify({'success': False, 'error': f'Branch limit reached. Your plan allows {tenant.max_branches} branches.'}), 403
        except Exception as e:
            return jsonify({'success': False, 'error': f'Error checking limits: {str(e)}'}), 500

        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({'success': False, 'error': 'Branch name is required'}), 400

        branch = Branch(
            tenant_id=tenant_id,
            name=data.get('name'),
            address=data.get('address'),
            phone=data.get('phone'),
            email=data.get('email')
        )

        db.session.add(branch)
        
        # Update counter
        if tenant:
            tenant.current_branches = existing_branch_count + 1
            
        db.session.commit()

        logger.info(f"Branch created: {branch.id} by {ctx.principal_id}")
        return jsonify({'success': True, 'data': branch.to_dict()}), 201
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create branch error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@branches_bp.route('/branches/<branch_id>', methods=['PUT'])
@unified_access(resource='branches', action='write')
def update_branch(ctx, branch_id):
    """Update a branch - Unified Access"""
    try:
        # Only tenant admins or super admins can update branches
        if not ctx.is_super_admin and not ctx.is_tenant_admin:
            return jsonify({'success': False, 'error': 'Only tenant admins can update branches'}), 403

        branch = get_or_404_scoped(ctx, Branch, branch_id)
        if not branch:
            return jsonify({'success': False, 'error': 'Branch not found'}), 404

        data = request.get_json()
        if 'name' in data:
            branch.name = data['name']
        if 'address' in data:
            branch.address = data['address']
        if 'phone' in data:
            branch.phone = data['phone']
        if 'email' in data:
            branch.email = data['email']

        db.session.commit()
        
        logger.info(f"Branch updated: {branch.id} by {ctx.principal_id}")
        return jsonify({'success': True, 'data': branch.to_dict()}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Update branch error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500


@branches_bp.route('/branches/<branch_id>', methods=['DELETE'])
@unified_access(resource='branches', action='delete')
def delete_branch(ctx, branch_id):
    """Delete a branch - Unified Access"""
    try:
        # Only tenant admins or super admins can delete branches
        if not ctx.is_super_admin and not ctx.is_tenant_admin:
            return jsonify({'success': False, 'error': 'Only tenant admins can delete branches'}), 403

        branch = get_or_404_scoped(ctx, Branch, branch_id)
        if not branch:
            return jsonify({'success': False, 'error': 'Branch not found'}), 404

        db.session.delete(branch)
        db.session.commit()
        
        logger.info(f"Branch deleted: {branch_id} by {ctx.principal_id}")
        return jsonify({'success': True, 'message': 'Branch deleted'}), 200
    except Exception as e:
        db.session.rollback()
        logger.error(f"Delete branch error: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500
