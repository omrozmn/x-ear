from core.models.role import Role
from core.models.permission import Permission

def test_assign_and_remove_permission_to_role(client, db_session, auth_headers_tenant_admin):
    # Create role and permission
    r = db_session.query(Role).filter_by(name='rp_role').first()
    if not r:
        r = Role(name='rp_role')
        db_session.add(r)
        db_session.commit()

    p = db_session.query(Permission).filter_by(name='rp:perm').first()
    if not p:
        p = Permission(name='rp:perm')
        db_session.add(p)
        db_session.commit()

    r_id = r.id
    p_id = p.id

    # assign
    res = client.post(f'/api/roles/{r_id}/permissions', headers=auth_headers_tenant_admin, json={'permission': 'rp:perm'})
    assert res.status_code == 200

    # remove by permission name (not ID)
    res2 = client.delete(f'/api/roles/{r_id}/permissions/rp:perm', headers=auth_headers_tenant_admin)
    assert res2.status_code == 200
