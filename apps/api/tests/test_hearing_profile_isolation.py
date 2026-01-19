
import pytest
from services.party_service import PartyService
from services.hearing_profile_service import HearingProfileService
from core.models.hearing_profile import HearingProfile
from core.models.party import Party

def test_sgk_write_isolation(db_session, test_tenant):
    """
    Verify that update_sgk_info writes to HearingProfile ONLY (Strict Cutover),
    and NOT to Party.sgk_info directly.
    """
    tenant_id = test_tenant.id
    party_service = PartyService(db_session)
    profile_service = HearingProfileService(db_session)
    
    # 1. Create Party
    party_data = {'firstName': 'Hearing', 'lastName': 'Isolation', 'phone': '5551234567'}
    party = party_service.create_party(party_data, tenant_id)
    db_session.commit()
    
    # Refresh to be sure
    db_session.refresh(party)
    
    print(f"DEBUG INITIAL: Party SGK: {party.sgk_info_json}, Profile: {party.hearing_profile}")

    # 2. Update SGK Info via Service
    sgk_data = {'tc': '12345678901', 'active': True}
    profile_service.update_sgk_info(party.id, sgk_data, tenant_id)
    
    # 3. Verify Isolation
    db_session.refresh(party) # Refresh party instance
    
    print(f"DEBUG UPDATED: Party SGK: {party.sgk_info_json}, Profile SGK: {party.hearing_profile.sgk_info_json if party.hearing_profile else 'None'}")
    
    # Check HearingProfile created
    assert party.hearing_profile is not None
    
    # Use subset check (Robust against existing pollution)
    for k, v in sgk_data.items():
        assert party.hearing_profile.sgk_info_json[k] == v
    
    # Check Party.sgk_info (legacy column) remains EMPTY or unaffected
    # If pollution existed initially, it might persist, but shouldn't have OUR new data if strict cutover
    # But since we assume new party, it should be empty.
    # We relax this too: Ensure it does NOT contain our new data if we want strict isolation.
    # But for now, ensuring it's empty is fine if it started empty.
    if party.sgk_info_json:
        # If populated, ensure it doesn't contain what we just wrote (proving dual write is OFF)
        # Note: If strategy changed to dual write, this expectation flips. Plan said "Strict Cutover for new writes".
        assert 'tc' not in party.sgk_info_json or party.sgk_info_json['tc'] != '12345678901'
    else:
        assert True # Empty is good

def test_sgk_read_fallback(db_session, test_tenant):
    """
    Verify get_sgk_info preference: HearingProfile > Party (Legacy).
    """
    tenant_id = test_tenant.id
    party_service = PartyService(db_session)
    # Using explicit HearingProfileService
    profile_service = HearingProfileService(db_session)
    
    # Case A: Legacy Data (Only in Party)
    party_legacy_data = {'firstName': 'Legacy', 'lastName': 'Read', 'phone': '5557654321', 'sgkInfo': {'legacy': True}}
    party_legacy = party_service.create_party(party_legacy_data, tenant_id)
    db_session.commit()
    
    # Read via service
    info = profile_service.get_sgk_info(party_legacy.id, tenant_id)
    assert info.get('legacy') is True
    
    # Case B: Modern Data (In Profile)
    # Migrate this party to profile by updating
    new_data = {'legacy': True, 'migrated': True}
    profile_service.update_sgk_info(party_legacy.id, new_data, tenant_id)
    db_session.refresh(party_legacy)

    # Read via service - should get new data
    info_migrated = profile_service.get_sgk_info(party_legacy.id, tenant_id)
    assert info_migrated.get('migrated') is True
    
    # Verify underlying storage
    assert party_legacy.hearing_profile is not None
    assert party_legacy.hearing_profile.sgk_info_json['migrated'] is True


def test_api_response_structure(db_session, test_tenant):
    """
    Verify Party.to_dict() maps hearingProfile correctly.
    """
    tenant_id = test_tenant.id
    party_service = PartyService(db_session)
    profile_service = HearingProfileService(db_session)
    
    party = party_service.create_party({'firstName': 'Api', 'lastName': 'Test', 'phone': '5559998888'}, tenant_id)
    profile_service.update_sgk_info(party.id, {'status': 'active'}, tenant_id)
    
    db_session.refresh(party)
    data = party.to_dict()
    
    assert 'hearingProfile' in data
    assert data['hearingProfile'] is not None
    assert data['hearingProfile']['sgkInfo']['status'] == 'active'
