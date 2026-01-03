from flask import Blueprint, request, jsonify
from utils.decorators import unified_access
from utils.response import success_response, error_response
from utils.admin_permissions import AdminPermissions
from datetime import datetime
import uuid

admin_tickets_bp = Blueprint('admin_tickets', __name__, url_prefix='/api/admin/tickets')

# Mock data
MOCK_TICKETS = [
    {
        'id': '1',
        'title': 'Login Issue',
        'description': 'User cannot login',
        'status': 'open',
        'priority': 'high',
        'category': 'technical',
        'tenant_id': 'tenant-1',
        'tenant_name': 'Acme Corp',
        'created_by': 'John Doe',
        'created_at': datetime.utcnow().isoformat(),
        'sla_due_date': datetime.utcnow().isoformat()
    }
]

@admin_tickets_bp.route('', methods=['GET'])
@unified_access(permission=AdminPermissions.TICKETS_READ)
def get_admin_tickets(ctx):
    page = request.args.get('page', 1, type=int)
    limit = request.args.get('limit', 10, type=int)
    status = request.args.get('status')
    priority = request.args.get('priority')
    search = request.args.get('search')
    
    # Filter logic (mock)
    filtered = MOCK_TICKETS
    if status:
        filtered = [t for t in filtered if t['status'] == status]
    if priority:
        filtered = [t for t in filtered if t['priority'] == priority]
    if search:
        search = search.lower()
        filtered = [t for t in filtered if search in t['title'].lower() or search in t['description'].lower()]
        
    total = len(filtered)
    start = (page - 1) * limit
    end = start + limit
    paginated = filtered[start:end]
    
    return success_response(data={
        'tickets': paginated,
        'pagination': {
            'page': page,
            'limit': limit,
            'total': total,
            'totalPages': (total + limit - 1) // limit
        }
    })

@admin_tickets_bp.route('', methods=['POST'])
@unified_access(permission=AdminPermissions.TICKETS_MANAGE)
def create_admin_ticket(ctx):
    data = request.get_json()
    new_ticket = {
        'id': str(uuid.uuid4()),
        'created_at': datetime.utcnow().isoformat(),
        'status': 'open',
        **data
    }
    MOCK_TICKETS.append(new_ticket)
    return success_response(data={'ticket': new_ticket}, status_code=201)

@admin_tickets_bp.route('/<id>', methods=['PUT'])
@unified_access(permission=AdminPermissions.TICKETS_MANAGE)
def update_admin_ticket(ctx, id):
    ticket = next((t for t in MOCK_TICKETS if t['id'] == id), None)
    if not ticket:
        return error_response('Ticket not found', code='NOT_FOUND', status_code=404)
    
    data = request.get_json()
    ticket.update(data)
    return success_response(data={'ticket': ticket})
