
import pytest
from core.models.party import Party
from core.models.party_role import PartyRole
from services.party_service import PartyService

def test_party_role_defaults(db_session, test_tenant):
    """Verify that a new party gets the default PATIENT role."""
    service = PartyService(db_session)
    tenant_id = test_tenant.id
    
    # Create basic party
    data = {
        'firstName': 'Role',
        'lastName': 'Test',
        'phone': '5550001111',
        'segment': 'customer' # Should default to PATIENT if not 'lead'
    }
    
    party = service.create_party(data, tenant_id)
    assert party.id is not None
    
    # Check roles
    assert len(party.roles) == 1
    assert party.roles[0].role_code == 'PATIENT'

def test_party_role_defaults_lead(db_session, test_tenant):
    """Verify that a LEAD segment gets LEAD role."""
    service = PartyService(db_session)
    tenant_id = test_tenant.id
    
    data = {
        'firstName': 'Lead',
        'lastName': 'Role',
        'phone': '5550002222',
        'segment': 'lead'
    }
    
    party = service.create_party(data, tenant_id)
    
    # Check roles
    assert len(party.roles) == 1
    assert party.roles[0].role_code == 'LEAD'

def test_manual_role_assignment(db_session, test_tenant):
    """Verify manual assignment and removal of roles."""
    service = PartyService(db_session)
    tenant_id = test_tenant.id
    
    data = {
        'firstName': 'Multi',
        'lastName': 'Role',
        'phone': '5550003333',
        'segment': 'customer'
    }
    party = service.create_party(data, tenant_id)
    
    # Initially has PATIENT
    assert len(party.roles) == 1
    assert party.roles[0].role_code == 'PATIENT'
    
    # Assign new role
    service.assign_role(party.id, 'VIP', tenant_id)
    
    # Refresh
    db_session.refresh(party)
    roles = service.list_roles(party.id, tenant_id)
    role_codes = sorted([r['code'] for r in roles])
    assert role_codes == ['PATIENT', 'VIP']
    
    # Remove role
    service.remove_role(party.id, 'PATIENT', tenant_id)
    
    # Check final
    db_session.refresh(party)
    roles = service.list_roles(party.id, tenant_id)
    assert len(roles) == 1
    assert roles[0]['code'] == 'VIP'
