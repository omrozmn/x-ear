"""
Admin routes for admin panel
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from models.base import db
from models.admin_user import AdminUser
import logging
import uuid
import traceback

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')

@admin_bp.route('/auth/login', methods=['POST'])
def admin_login():
    """Admin login endpoint"""
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        mfa_token = data.get('mfa_token')
        
        if not email or not password:
            return jsonify({
                'success': False,
                'error': {'message': 'Email and password required'}
            }), 400
        
        # Find admin user
        admin = AdminUser.query.filter_by(email=email).first()
        if not admin or not admin.check_password(password):
            return jsonify({
                'success': False,
                'error': {'message': 'Invalid credentials'}
            }), 401
        
        if not admin.is_active:
            return jsonify({
                'success': False,
                'error': {'message': 'Account is disabled'}
            }), 403
        
        # Check MFA if enabled
        if admin.mfa_enabled and not mfa_token:
            return jsonify({
                'success': True,
                'data': {'requires_mfa': True}
            }), 200
        
        # TODO: Verify MFA token if provided
        
        # Update last login
        admin.last_login = datetime.utcnow()
        db.session.commit()
        
        # Create access token
        access_token = create_access_token(
            identity=admin.id,
            additional_claims={'role': admin.role, 'type': 'admin'}
        )
        
        return jsonify({
            'success': True,
            'data': {
                'token': access_token,
                'user': admin.to_dict(),
                'requires_mfa': False
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Admin login error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_bp.route('/users', methods=['POST'])
@jwt_required()
def create_admin_user():
    """Create admin user or tenant user"""
    try:
        data = request.get_json()
        
        # Validation
        if not data.get('email') or not data.get('password'):
            return jsonify({
                'success': False,
                'error': {'message': 'Email and password are required'}
            }), 400
            
        tenant_id = data.get('tenant_id')
        
        if tenant_id:
            # Create Tenant User (User model)
            from models.user import User
            
            # Check if user exists in User model
            if User.query.filter_by(email=data['email']).first():
                return jsonify({
                    'success': False,
                    'error': {'message': 'User already exists'}
                }), 400
                
            # Generate username from email if not provided
            username = data.get('username') or data['email'].split('@')[0]
            # Ensure username is unique
            base_username = username
            counter = 1
            while User.query.filter_by(username=username).first():
                username = f"{base_username}{counter}"
                counter += 1
                
            user = User(
                id=str(uuid.uuid4()),
                email=data['email'],
                username=username,
                first_name=data.get('first_name'),
                last_name=data.get('last_name'),
                tenant_id=tenant_id,
                role=data.get('role', 'user'),
                is_active=True
            )
            user.set_password(data['password'])
            db.session.add(user)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'data': {'user': user.to_dict()}
            }), 201
            
        else:
            # Create Admin User (AdminUser model)
            # Check if user exists
            if AdminUser.query.filter_by(email=data['email']).first():
                return jsonify({
                    'success': False,
                    'error': {'message': 'User already exists'}
                }), 400

            user = AdminUser(
                id=str(uuid.uuid4()),
                email=data['email'],
                first_name=data.get('first_name'),
                last_name=data.get('last_name'),
                role=data.get('role', 'support'),
                is_active=True
            )
            user.set_password(data['password'])
            db.session.add(user)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'data': {'user': user.to_dict()}
            }), 201
            
    except Exception as e:
        db.session.rollback()
        logger.error(f"Create user error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': str(e), 'traceback': traceback.format_exc()}
        }), 500

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_admin_users():
    """Get list of admin users"""
    try:
        # Verify admin access
        current_user_id = get_jwt_identity()
        
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        role_filter = request.args.get('role', '')
        
        query = AdminUser.query
        
        if search:
            query = query.filter(
                (AdminUser.email.ilike(f'%{search}%')) |
                (AdminUser.first_name.ilike(f'%{search}%')) |
                (AdminUser.last_name.ilike(f'%{search}%'))
            )
        
        if role_filter:
            query = query.filter_by(role=role_filter)
        
        total = query.count()
        users = query.offset((page - 1) * limit).limit(limit).all()
        
        return jsonify({
            'success': True,
            'data': {
                'users': [u.to_dict() for u in users],
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
    except Exception as e:
        logger.error(f"Get admin users error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_bp.route('/users/all', methods=['GET'])
@jwt_required()
def get_all_tenant_users():
    """Get list of ALL users from ALL tenants"""
    try:
        # Verify admin access
        # current_user_id = get_jwt_identity()
        # Check if user is super admin etc. (Skipping for now as per current auth model)
        
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 10, type=int)
        search = request.args.get('search', '')
        
        from models.user import User
        from models.tenant import Tenant
        
        query = User.query
        
        if search:
            query = query.filter(
                (User.email.ilike(f'%{search}%')) |
                (User.first_name.ilike(f'%{search}%')) |
                (User.last_name.ilike(f'%{search}%')) |
                (User.username.ilike(f'%{search}%'))
            )
            
        # Join with Tenant to get tenant name if needed, or just return tenant_id
        # query = query.join(Tenant) 
        
        total = query.count()
        users = query.order_by(User.created_at.desc()).offset((page - 1) * limit).limit(limit).all()
        
        users_list = []
        for u in users:
            u_dict = u.to_dict()
            # Fetch tenant name
            if u.tenant_id:
                tenant = db.session.get(Tenant, u.tenant_id)
                if tenant:
                    u_dict['tenant_name'] = tenant.name
            users_list.append(u_dict)
        
        return jsonify({
            'success': True,
            'data': {
                'users': users_list,
                'pagination': {
                    'page': page,
                    'limit': limit,
                    'total': total,
                    'totalPages': (total + limit - 1) // limit
                }
            }
        }), 200
    except Exception as e:
        logger.error(f"Get all tenant users error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

@admin_bp.route('/users/all/<user_id>', methods=['PUT'])
@jwt_required()
def update_any_tenant_user(user_id):
    """Update any tenant user (Admin Panel)"""
    try:
        # Verify admin access (TODO: Check role)
        
        data = request.get_json()
        from models.user import User
        
        user = db.session.get(User, user_id)
        if not user:
             return jsonify({
                'success': False,
                'error': {'message': 'User not found'}
            }), 404
            
        if 'isActive' in data:
            user.is_active = data['isActive']
        if 'email' in data:
            user.email = data['email']
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        if 'role' in data:
            user.role = data['role']
        if 'password' in data and data['password']:
            user.set_password(data['password'])
            
        db.session.commit()
        
        return jsonify({
            'success': True,
            'data': user.to_dict()
        }), 200
    except Exception as e:
        logger.error(f"Update any tenant user error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500

# In-memory store for tickets (placeholder until model is created)
MOCK_TICKETS = []

@admin_bp.route('/tickets', methods=['GET'])
@jwt_required()
def get_admin_tickets():
    """Get support tickets (placeholder)"""
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    
    total = len(MOCK_TICKETS)
    start = (page - 1) * limit
    end = start + limit
    tickets = MOCK_TICKETS[start:end]
    
    return jsonify({
        'success': True,
        'data': {
            'tickets': tickets,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'totalPages': (total + limit - 1) // limit if limit > 0 else 0
            }
        }
    }), 200

@admin_bp.route('/tickets', methods=['POST'])
@jwt_required()
def create_admin_ticket():
    """Create support ticket (placeholder)"""
    try:
        data = request.get_json()
        logger.info(f"Creating ticket with data: {data}")
        
        # Basic validation
        if not data.get('subject') or not data.get('description'):
            logger.error("Missing subject or description")
            return jsonify({
                'success': False,
                'error': {'message': 'Subject and description are required'}
            }), 400
            
        current_user_id = get_jwt_identity()
        logger.info(f"Current user ID: {current_user_id}")
        
        ticket = {
            'id': str(uuid.uuid4()),
            'title': data['subject'], # Map subject to title for response
            'description': data['description'],
            'status': 'open',
            'priority': data.get('priority', 'medium'),
            'category': data.get('category', 'general'),
            'tenant_id': data.get('tenant_id'),
            'tenant_name': 'Demo Tenant', # Placeholder
            'created_by': current_user_id,
            'created_at': datetime.utcnow().isoformat(),
            'sla_due_date': (datetime.utcnow() + timedelta(days=1)).isoformat()
        }
        
        MOCK_TICKETS.insert(0, ticket) # Add to beginning
        logger.info(f"Ticket created: {ticket['id']}")
        
        return jsonify({
            'success': True,
            'data': {'ticket': ticket}
        }), 201
        
    except Exception as e:
        logger.error(f"Create ticket error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': {'message': f'Internal server error: {str(e)}'}
        }), 500

@admin_bp.route('/tickets/<ticket_id>', methods=['PUT'])
@jwt_required()
def update_admin_ticket(ticket_id):
    """Update support ticket (placeholder)"""
    try:
        data = request.get_json()
        
        # Find ticket in mock store
        ticket = next((t for t in MOCK_TICKETS if t['id'] == ticket_id), None)
        
        if not ticket:
             return jsonify({
                'success': False,
                'error': {'message': 'Ticket not found'}
            }), 404
            
        # Update fields
        if 'status' in data:
            ticket['status'] = data['status']
        if 'assigned_to' in data:
            ticket['assigned_to'] = data['assigned_to']
            # Mock assigned admin name
            ticket['assigned_admin_name'] = 'Admin User' 
            
        return jsonify({'success': True, 'data': {'ticket': ticket}}), 200
        
    except Exception as e:
        logger.error(f"Update ticket error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

@admin_bp.route('/tickets/<ticket_id>/responses', methods=['POST'])
@jwt_required()
def create_ticket_response(ticket_id):
    """Create response for support ticket (placeholder)"""
    try:
        data = request.get_json()
        message = data.get('message')
        
        if not message:
             return jsonify({
                'success': False,
                'error': {'message': 'Message is required'}
            }), 400
            
        # Find ticket in mock store
        ticket = next((t for t in MOCK_TICKETS if t['id'] == ticket_id), None)
        
        if not ticket:
             return jsonify({
                'success': False,
                'error': {'message': 'Ticket not found'}
            }), 404
            
        # In a real app, we would save the response to a TicketResponse model
        logger.info(f"Response added to ticket {ticket_id}: {message}")
            
        return jsonify({'success': True, 'data': {'message': 'Response added'}}), 201
        
    except Exception as e:
        logger.error(f"Create ticket response error: {e}")
        return jsonify({
            'success': False,
            'error': {'message': 'Internal server error'}
        }), 500
