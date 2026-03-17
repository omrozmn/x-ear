"""
Discount Sync Invariant Tests

Ensures that discount_type and discount_value are always in sync
between Sale and DeviceAssignment records — for both create and update flows.

Guards against regression where Sale-level discount changes
were not propagated to DeviceAssignment records.
"""

import uuid
import time
from decimal import Decimal

import pytest


def _make_idempotency_key():
    return f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"


def _setup_test_env(db_session):
    """Create tenant, user, party, product — all with unique IDs."""
    from core.models.party import Party
    from core.models.inventory import InventoryItem
    from core.models.user import User
    from core.models.tenant import Tenant
    from jose import jwt

    suffix = uuid.uuid4().hex[:8]
    tenant_id = f"t_{suffix}"

    tenant = Tenant(
        id=tenant_id,
        name=f"Tenant_{suffix}",
        slug=f"slug-{suffix}",
        owner_email=f"o_{suffix}@test.com",
        billing_email=f"b_{suffix}@test.com",
        is_active=True,
    )
    db_session.add(tenant)

    user = User(
        id=f"u_{suffix}",
        username=f"admin_{suffix}",
        email=f"admin_{suffix}@test.com",
        role="admin",
        tenant_id=tenant_id,
        is_active=True,
    )
    user.set_password("test123")
    db_session.add(user)

    party = Party(
        id=f"party_{suffix}",
        tenant_id=tenant_id,
        first_name="Test",
        last_name=f"Patient_{suffix}",
        phone=f"555000{suffix[:4]}",
    )
    db_session.add(party)

    product = InventoryItem(
        id=f"inv_{suffix}",
        tenant_id=tenant_id,
        name=f"TestDevice_{suffix}",
        brand="TestBrand",
        model="TestModel",
        category="hearing_aid",
        price=Decimal("9500.00"),
        kdv_rate=Decimal("0.0"),
        available_inventory=10,
    )
    db_session.add(product)
    db_session.commit()

    payload = {
        "sub": user.id,
        "role": "admin",
        "tenant_id": tenant_id,
        "user_type": "tenant",
        "role_permissions": ["*"],
        "perm_ver": 1,
        "exp": time.time() + 3600,
    }
    token = jwt.encode(payload, "test-secret", algorithm="HS256")
    headers = {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": _make_idempotency_key(),
    }

    return party, product, headers


# ---------------------------------------------------------------------------
# 1. CREATE SALE — discount fields must be written to assignments
# ---------------------------------------------------------------------------

def test_create_sale_syncs_discount_to_assignments(client, db_session):
    """When a sale is created with discount, assignments must receive the same discount."""
    from models.sales import Sale, DeviceAssignment

    party, product, headers = _setup_test_env(db_session)

    payload = {
        "partyId": party.id,
        "productId": product.id,
        "earSide": "both",
        "discountType": "amount",
        "discountValue": 500,
        "paymentMethod": "cash",
        "sgkScheme": "over18_working",
    }

    headers = {**headers, "Idempotency-Key": _make_idempotency_key()}
    resp = client.post("/api/sales", json=payload, headers=headers)
    assert resp.status_code == 200, f"Create sale failed: {resp.text}"

    data = resp.json().get("data", {})
    sale_id = data.get("saleId") or data.get("id") or data.get("sale_id")
    assert sale_id, f"No sale ID in response: {data}"

    # Verify Sale record
    sale = db_session.get(Sale, sale_id)
    assert sale is not None
    assert sale.discount_type == "amount"
    assert float(sale.discount_value or 0) == 500.0

    # Verify ALL assignments received the discount
    assignments = (
        db_session.query(DeviceAssignment)
        .filter_by(sale_id=sale_id)
        .all()
    )
    assert len(assignments) == 2, "Bilateral sale must have 2 assignments"

    for a in assignments:
        assert a.discount_type == "amount", (
            f"Assignment {a.id} discount_type mismatch: expected='amount', got='{a.discount_type}'"
        )
        assert float(a.discount_value or 0) == 500.0, (
            f"Assignment {a.id} discount_value mismatch: expected=500, got={a.discount_value}"
        )


# ---------------------------------------------------------------------------
# 2. UPDATE SALE — discount changes must propagate to assignments
# ---------------------------------------------------------------------------

def test_update_sale_syncs_discount_to_assignments(client, db_session):
    """When a sale's discount is updated, all assignments must be updated too."""
    from models.sales import Sale, DeviceAssignment

    party, product, headers = _setup_test_env(db_session)

    # Step 1: Create sale WITHOUT discount
    create_payload = {
        "partyId": party.id,
        "productId": product.id,
        "earSide": "left",
        "paymentMethod": "cash",
        "sgkScheme": "over18_working",
    }
    h = {**headers, "Idempotency-Key": _make_idempotency_key()}
    resp = client.post("/api/sales", json=create_payload, headers=h)
    assert resp.status_code == 200, f"Create sale failed: {resp.text}"

    data = resp.json().get("data", {})
    sale_id = data.get("saleId") or data.get("id") or data.get("sale_id")
    assert sale_id

    # Verify no discount
    assignment = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).first()
    assert assignment is not None

    # Step 2: Update with percentage discount
    update_payload = {
        "discountType": "percentage",
        "discountValue": 10,
    }
    h = {**headers, "Idempotency-Key": _make_idempotency_key()}
    resp = client.put(f"/api/sales/{sale_id}", json=update_payload, headers=h)
    assert resp.status_code == 200, f"Update sale failed: {resp.text}"

    # Refresh from DB
    db_session.expire_all()

    sale = db_session.get(Sale, sale_id)
    assert sale.discount_type == "percentage"
    assert float(sale.discount_value or 0) == 10.0

    # Verify assignment got the update
    assignment = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).first()
    assert assignment.discount_type == "percentage", (
        f"Assignment discount_type not synced: expected='percentage', got='{assignment.discount_type}'"
    )
    assert float(assignment.discount_value or 0) == 10.0, (
        f"Assignment discount_value not synced: expected=10, got={assignment.discount_value}"
    )


# ---------------------------------------------------------------------------
# 3. INVARIANT — Sale and Assignment discounts must never diverge
# ---------------------------------------------------------------------------

def test_discount_invariant_after_multiple_updates(client, db_session):
    """After multiple discount updates, Sale and Assignment values must stay in sync."""
    from models.sales import Sale, DeviceAssignment

    party, product, headers = _setup_test_env(db_session)

    # Create bilateral sale with initial discount
    create_payload = {
        "partyId": party.id,
        "productId": product.id,
        "earSide": "both",
        "discountType": "percentage",
        "discountValue": 5,
        "paymentMethod": "cash",
        "sgkScheme": "over18_working",
    }
    h = {**headers, "Idempotency-Key": _make_idempotency_key()}
    resp = client.post("/api/sales", json=create_payload, headers=h)
    assert resp.status_code == 200
    sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

    # Update #1: Change to amount
    h = {**headers, "Idempotency-Key": _make_idempotency_key()}
    resp = client.put(f"/api/sales/{sale_id}", json={"discountType": "amount", "discountValue": 1000}, headers=h)
    assert resp.status_code == 200

    # Update #2: Change to percentage
    h = {**headers, "Idempotency-Key": _make_idempotency_key()}
    resp = client.put(f"/api/sales/{sale_id}", json={"discountType": "percentage", "discountValue": 15}, headers=h)
    assert resp.status_code == 200

    # Verify final state
    db_session.expire_all()
    sale = db_session.get(Sale, sale_id)
    assignments = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).all()

    for a in assignments:
        assert a.discount_type == sale.discount_type, (
            f"INVARIANT VIOLATION: Sale.discount_type={sale.discount_type} != "
            f"Assignment({a.id}).discount_type={a.discount_type}"
        )
        assert a.discount_value == sale.discount_value, (
            f"INVARIANT VIOLATION: Sale.discount_value={sale.discount_value} != "
            f"Assignment({a.id}).discount_value={a.discount_value}"
        )
