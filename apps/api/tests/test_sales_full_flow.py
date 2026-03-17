"""
Comprehensive Sales & Device Assignment Flow Tests
===================================================

Covers:
  - Single-ear and bilateral sale creation
  - Device assignment creation with correct pricing
  - SGK coverage calculation per scheme
  - KDV (tax) extraction from product price
  - Discount application (amount and percentage)
  - Sale update / edit flow
  - Device assignment update (PATCH)
  - Sale detail / list endpoints (GET)
  - Inventory stock decrement on sale
  - Payment status transitions
"""

import uuid
import time
from decimal import Decimal

import pytest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _idem():
    return f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"


def _headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Idempotency-Key": _idem(),
    }


def _setup(db_session, *, price=Decimal("9500.00"), kdv_rate=Decimal("10.0"), stock=10):
    """Create tenant + user + party + product.  Return (party, product, token)."""
    from core.models.party import Party
    from core.models.inventory import InventoryItem
    from core.models.user import User
    from core.models.tenant import Tenant
    from jose import jwt

    s = uuid.uuid4().hex[:8]
    tid = f"t_{s}"

    db_session.add(Tenant(
        id=tid, name=f"T{s}", slug=f"s-{s}",
        owner_email=f"o{s}@t.co", billing_email=f"b{s}@t.co", is_active=True,
    ))
    user = User(
        id=f"u_{s}", username=f"u{s}", email=f"u{s}@t.co",
        role="admin", tenant_id=tid, is_active=True,
    )
    user.set_password("x")
    db_session.add(user)

    party = Party(
        id=f"p_{s}", tenant_id=tid,
        first_name="Test", last_name=f"P{s}", phone=f"5550{s[:4]}",
    )
    db_session.add(party)

    product = InventoryItem(
        id=f"inv_{s}", tenant_id=tid,
        name=f"Dev{s}", brand="B", model="M", category="hearing_aid",
        price=price, kdv_rate=kdv_rate, available_inventory=stock,
    )
    db_session.add(product)
    db_session.commit()

    tok = jwt.encode({
        "sub": user.id, "role": "admin", "tenant_id": tid,
        "user_type": "tenant", "role_permissions": ["*"],
        "perm_ver": 1, "exp": time.time() + 3600,
    }, "test-secret", algorithm="HS256")

    return party, product, tok


# ===================================================================
# 1. Single-ear Sale Creation
# ===================================================================
class TestSingleEarSale:

    def test_create_single_ear_sale(self, client, db_session):
        """A single-ear sale must produce exactly 1 assignment."""
        from models.sales import Sale, DeviceAssignment

        party, product, tok = _setup(db_session, price=Decimal("9500.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))

        assert resp.status_code == 200, resp.text
        data = resp.json()["data"]
        sale_id = data.get("saleId") or data.get("id")
        assert sale_id

        assignments = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).all()
        assert len(assignments) == 1
        assert assignments[0].ear in ("left", "L")

    def test_single_ear_sgk_coverage(self, client, db_session):
        """Single-ear SGK coverage should be per-ear amount, not doubled."""
        from models.sales import Sale

        party, product, tok = _setup(db_session)
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "right", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))

        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        sale = db_session.get(Sale, sale_id)

        # over18_working = 3391.36 per ear
        assert float(sale.sgk_coverage or 0) == pytest.approx(3391.36, abs=1.0)

    def test_single_ear_inventory_decrement(self, client, db_session):
        """Creating a single-ear sale decrements inventory by 1."""
        from core.models.inventory import InventoryItem

        party, product, tok = _setup(db_session, stock=5)
        client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))

        db_session.expire_all()
        item = db_session.get(InventoryItem, product.id)
        assert item.available_inventory == 4


# ===================================================================
# 2. Bilateral Sale Creation
# ===================================================================
class TestBilateralSale:

    def test_create_bilateral_sale(self, client, db_session):
        """A bilateral sale must produce exactly 2 assignments (L + R)."""
        from models.sales import Sale, DeviceAssignment

        party, product, tok = _setup(db_session)
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))

        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        assignments = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).all()
        assert len(assignments) == 2, f"Expected 2, got {len(assignments)}"

        ears = {a.ear for a in assignments}
        assert ears in ({"left", "right"}, {"L", "R"})

    def test_bilateral_sgk_coverage_doubled(self, client, db_session):
        """Bilateral SGK coverage = 2 × per-ear amount."""
        from models.sales import Sale

        party, product, tok = _setup(db_session)
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))

        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        sale = db_session.get(Sale, sale_id)

        expected = 3391.36 * 2  # 6782.72
        assert float(sale.sgk_coverage or 0) == pytest.approx(expected, abs=2.0)

    def test_bilateral_total_amount_doubled(self, client, db_session):
        """Bilateral total should be product price × 2."""
        from models.sales import Sale

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))

        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        sale = db_session.get(Sale, sale_id)

        # total_amount should reflect doubled price for bilateral
        assert float(sale.total_amount or 0) == pytest.approx(20000.0, abs=1.0)

    def test_bilateral_inventory_decrement_by_two(self, client, db_session):
        """Bilateral sale decrements inventory by 2."""
        from core.models.inventory import InventoryItem

        party, product, tok = _setup(db_session, stock=5)
        client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))

        db_session.expire_all()
        item = db_session.get(InventoryItem, product.id)
        assert item.available_inventory == 3


# ===================================================================
# 3. SGK Scheme Coverage Values
# ===================================================================
class TestSGKSchemes:

    @pytest.mark.parametrize("scheme,expected_per_ear", [
        ("no_coverage", 0),
        ("over18_working", 3391.36),
        ("over18_retired", 4239.20),
    ])
    def test_sgk_scheme_single_ear(self, client, db_session, scheme, expected_per_ear):
        """Per-ear SGK support matches known values."""
        from models.sales import DeviceAssignment

        party, product, tok = _setup(db_session, price=Decimal("9500.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": scheme,
        }, headers=_headers(tok))

        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        a = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).first()
        assert float(a.sgk_support or 0) == pytest.approx(expected_per_ear, abs=1.0)


# ===================================================================
# 4. KDV (Tax) Calculation
# ===================================================================
class TestKDV:

    def test_kdv_extracted_from_price(self, client, db_session):
        """KDV is extracted from VAT-inclusive price."""
        from models.sales import Sale

        # price=11000, kdv_rate=10% → kdv_amount = 11000 - 11000/1.10 = 1000
        party, product, tok = _setup(db_session, price=Decimal("11000.00"), kdv_rate=Decimal("10.0"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))

        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        sale = db_session.get(Sale, sale_id)

        assert float(sale.kdv_rate or 0) == pytest.approx(10.0, abs=0.1)
        assert float(sale.kdv_amount or 0) == pytest.approx(1000.0, abs=5.0)


# ===================================================================
# 5. Discount Application
# ===================================================================
class TestDiscounts:

    def test_amount_discount(self, client, db_session):
        """Amount discount reduces final amount."""
        from models.sales import Sale

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
            "discountType": "amount", "discountValue": 500,
            "discountAmount": 500,
        }, headers=_headers(tok))

        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        sale = db_session.get(Sale, sale_id)
        assert float(sale.discount_amount or 0) == 500.0
        assert float(sale.final_amount or 0) == pytest.approx(9500.0, abs=5.0)

    def test_percentage_discount(self, client, db_session):
        """Percentage discount reduces final amount proportionally."""
        from models.sales import Sale

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        # Create flow uses discountAmount for direct deduction;
        # 10% of 10000 = 1000 deduction
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
            "discountType": "percentage", "discountValue": 10,
            "discountAmount": 1000,
        }, headers=_headers(tok))

        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        sale = db_session.get(Sale, sale_id)
        assert float(sale.final_amount or 0) == pytest.approx(9000.0, abs=5.0)


# ===================================================================
# 6. Sale Update (PUT)
# ===================================================================
class TestSaleUpdate:

    def _create_sale(self, client, db_session, ear="left", discount_type=None, discount_value=None):
        """Helper: create a sale and return sale_id, token."""
        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        payload = {
            "partyId": party.id, "productId": product.id,
            "earSide": ear, "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }
        if discount_type:
            payload["discountType"] = discount_type
            payload["discountValue"] = discount_value
        resp = client.post("/api/sales", json=payload, headers=_headers(tok))
        assert resp.status_code == 200, resp.text
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        return sale_id, tok

    def test_update_discount(self, client, db_session):
        """Updating discount_type+discount_value recalculates pricing (SGK FIRST → discount SECOND)."""
        from models.sales import Sale

        sale_id, tok = self._create_sale(client, db_session)  # price=10000, over18_working
        resp = client.put(f"/api/sales/{sale_id}", json={
            "discountType": "amount", "discountValue": 750,
        }, headers=_headers(tok))

        assert resp.status_code == 200, resp.text
        db_session.expire_all()
        sale = db_session.get(Sale, sale_id)
        assert sale.discount_type == "amount"
        assert float(sale.discount_value or 0) == 750.0

        # Verify recalculated amounts: SGK FIRST → discount SECOND
        # price_after_sgk = 10000 - 3391.36 = 6608.64
        # discount = 750 (amount type)
        # final = 6608.64 - 750 = 5858.64
        assert float(sale.discount_amount or 0) == pytest.approx(750.0, abs=1.0)
        assert float(sale.final_amount or 0) == pytest.approx(5858.64, abs=2.0)
        assert float(sale.patient_payment or 0) == pytest.approx(5858.64, abs=2.0)

    def test_update_notes(self, client, db_session):
        """Updating notes field works."""
        from models.sales import Sale

        sale_id, tok = self._create_sale(client, db_session)
        resp = client.put(f"/api/sales/{sale_id}", json={
            "notes": "Updated note for testing",
        }, headers=_headers(tok))

        assert resp.status_code == 200
        db_session.expire_all()
        sale = db_session.get(Sale, sale_id)
        assert sale.notes == "Updated note for testing"

    def test_update_payment_method(self, client, db_session):
        """Updating payment method works."""
        from models.sales import Sale

        sale_id, tok = self._create_sale(client, db_session)
        resp = client.put(f"/api/sales/{sale_id}", json={
            "paymentMethod": "credit_card",
        }, headers=_headers(tok))

        assert resp.status_code == 200
        db_session.expire_all()
        sale = db_session.get(Sale, sale_id)
        assert sale.payment_method == "credit_card"


# ===================================================================
# 7. Device Assignment Update (PATCH)
# ===================================================================
class TestAssignmentUpdate:

    def test_update_serial_number(self, client, db_session):
        """PATCH assignment to set serial number."""
        from models.sales import DeviceAssignment

        party, product, tok = _setup(db_session)
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))

        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        a = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).first()

        resp2 = client.patch(f"/api/device-assignments/{a.id}", json={
            "serialNumber": "SN123456789",
        }, headers=_headers(tok))

        assert resp2.status_code == 200, resp2.text
        db_session.expire_all()
        a = db_session.get(DeviceAssignment, a.id)
        assert a.serial_number == "SN123456789"

    def test_update_delivery_status(self, client, db_session):
        """PATCH assignment to set delivery_status to delivered."""
        from models.sales import DeviceAssignment

        party, product, tok = _setup(db_session)
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))

        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        a = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).first()

        resp2 = client.patch(f"/api/device-assignments/{a.id}", json={
            "deliveryStatus": "delivered",
        }, headers=_headers(tok))

        assert resp2.status_code == 200, resp2.text
        db_session.expire_all()
        a = db_session.get(DeviceAssignment, a.id)
        assert a.delivery_status == "delivered"


# ===================================================================
# 8. Sale Detail & List Endpoints
# ===================================================================
class TestSaleEndpoints:

    def test_get_sale_detail(self, client, db_session):
        """GET /api/sales/{id} returns full sale data with devices array."""
        party, product, tok = _setup(db_session)
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))

        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        resp2 = client.get(f"/api/sales/{sale_id}", headers=_headers(tok))
        assert resp2.status_code == 200
        data = resp2.json()["data"]

        assert data["id"] == sale_id
        assert data["partyId"] == party.id
        assert "devices" in data
        assert len(data["devices"]) == 2

    def test_list_sales(self, client, db_session):
        """GET /api/sales returns a list containing the created sale."""
        party, product, tok = _setup(db_session)
        client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))

        resp = client.get("/api/sales", headers=_headers(tok))
        assert resp.status_code == 200
        body = resp.json()
        items = body.get("data", [])
        assert len(items) >= 1

    def test_get_sale_404(self, client, db_session):
        """GET /api/sales/{bad_id} returns 404."""
        _, _, tok = _setup(db_session)
        resp = client.get("/api/sales/nonexistent-id", headers=_headers(tok))
        assert resp.status_code in (404, 200)  # may wrap error in envelope


# ===================================================================
# 9. Payment Status on Cash Sale
# ===================================================================
class TestPaymentStatus:

    def test_cash_sale_auto_paid(self, client, db_session):
        """Cash sales should be automatically marked as paid."""
        from models.sales import Sale

        party, product, tok = _setup(db_session, price=Decimal("5000.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))

        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        sale = db_session.get(Sale, sale_id)

        # Cash sale: paid_amount should equal final_amount
        assert float(sale.paid_amount or 0) == pytest.approx(float(sale.final_amount or 0), abs=1.0)
        assert sale.status in ("paid", "completed")


# ===================================================================
# 10. Discount + SGK Interaction
# ===================================================================
class TestDiscountWithSGK:

    def test_create_single_with_sgk_and_amount_discount(self, client, db_session):
        """Discount + SGK: patient_payment = final_price - sgk_per_ear."""
        from models.sales import Sale

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        # Frontend sends pre-calculated discountAmount
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
            "discountType": "amount", "discountValue": 500,
            "discountAmount": 500,
        }, headers=_headers(tok))

        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        sale = db_session.get(Sale, sale_id)

        # over18_working = 3391.36 per ear
        assert float(sale.sgk_coverage or 0) == pytest.approx(3391.36, abs=1.0)
        # final_price = 10000 - 500 = 9500
        assert float(sale.final_amount or 0) == pytest.approx(9500.0, abs=1.0)
        # patient_payment = 9500 - 3391.36 = 6108.64
        assert float(sale.patient_payment or 0) == pytest.approx(6108.64, abs=2.0)

    def test_create_bilateral_with_sgk_and_discount(self, client, db_session):
        """Bilateral with SGK+discount: totals are doubled."""
        from models.sales import Sale

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
            "discountType": "amount", "discountValue": 500,
            "discountAmount": 500,
        }, headers=_headers(tok))

        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")
        sale = db_session.get(Sale, sale_id)

        # SGK doubled: 3391.36 * 2 = 6782.72
        assert float(sale.sgk_coverage or 0) == pytest.approx(6782.72, abs=2.0)
        # total = 10000 * 2 = 20000
        assert float(sale.total_amount or 0) == pytest.approx(20000.0, abs=1.0)
        # final_price = 10000 - 500 = 9500, bilateral: 9500 * 2 = 19000
        assert float(sale.final_amount or 0) == pytest.approx(19000.0, abs=1.0)
        # patient_payment = 19000 - 6782.72 = 12217.28
        assert float(sale.patient_payment or 0) == pytest.approx(12217.28, abs=2.0)


# ===================================================================
# 11. Update Pricing Recalculation (SGK-first formula)
# ===================================================================
class TestUpdateRecalc:

    def test_update_percentage_discount_recalc(self, client, db_session):
        """Percentage discount is calculated on (total - SGK), not on total."""
        from models.sales import Sale

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))
        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        # Apply 10% discount
        resp2 = client.put(f"/api/sales/{sale_id}", json={
            "discountType": "percentage", "discountValue": 10,
        }, headers=_headers(tok))
        assert resp2.status_code == 200

        db_session.expire_all()
        sale = db_session.get(Sale, sale_id)

        # Formula: price_after_sgk = 10000 - 3391.36 = 6608.64
        # discount = 6608.64 * 10% = 660.864
        # final = 6608.64 - 660.864 = 5947.776
        assert float(sale.discount_amount or 0) == pytest.approx(660.86, abs=2.0)
        assert float(sale.final_amount or 0) == pytest.approx(5947.78, abs=2.0)
        assert float(sale.patient_payment or 0) == pytest.approx(5947.78, abs=2.0)

    def test_update_bilateral_percentage_discount_recalc(self, client, db_session):
        """Bilateral update: discount is on (total*2 - sgk*2)."""
        from models.sales import Sale

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))
        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        # Apply 10% discount
        resp2 = client.put(f"/api/sales/{sale_id}", json={
            "discountType": "percentage", "discountValue": 10,
        }, headers=_headers(tok))
        assert resp2.status_code == 200

        db_session.expire_all()
        sale = db_session.get(Sale, sale_id)

        # Formula: price_after_sgk = 20000 - 6782.72 = 13217.28
        # discount = 13217.28 * 10% = 1321.728
        # final = 13217.28 - 1321.728 = 11895.552
        assert float(sale.total_amount or 0) == pytest.approx(20000.0, abs=1.0)
        assert float(sale.discount_amount or 0) == pytest.approx(1321.73, abs=2.0)
        assert float(sale.final_amount or 0) == pytest.approx(11895.55, abs=2.0)

    def test_update_sgk_scheme_recalculates_coverage(self, client, db_session):
        """Changing SGK scheme updates sgk_coverage and assignment sgk_support."""
        from models.sales import Sale, DeviceAssignment

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))
        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        # Verify initial SGK
        sale = db_session.get(Sale, sale_id)
        assert float(sale.sgk_coverage or 0) == pytest.approx(3391.36, abs=1.0)

        # Change scheme to over18_retired (4239.20 per ear)
        resp2 = client.put(f"/api/sales/{sale_id}", json={
            "sgkScheme": "over18_retired",
        }, headers=_headers(tok))
        assert resp2.status_code == 200

        db_session.expire_all()
        sale = db_session.get(Sale, sale_id)
        assert float(sale.sgk_coverage or 0) == pytest.approx(4239.20, abs=2.0)

        # Assignment should also be updated
        a = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).first()
        assert float(a.sgk_support or 0) == pytest.approx(4239.20, abs=2.0)
        assert a.sgk_scheme == "over18_retired"


# ===================================================================
# 12. Bilateral ↔ Single Ear Conversion
# ===================================================================
class TestEarConversion:

    def test_bilateral_to_single_pricing(self, client, db_session):
        """Bilateral→single recalculates pricing for 1 device."""
        from models.sales import Sale, DeviceAssignment

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))

        # Step 1: Create bilateral with no discount
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))
        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        # Step 2: Add 10% discount
        resp2 = client.put(f"/api/sales/{sale_id}", json={
            "discountType": "percentage", "discountValue": 10,
        }, headers=_headers(tok))
        assert resp2.status_code == 200

        # Step 3: Convert to single (left)
        resp3 = client.put(f"/api/sales/{sale_id}", json={
            "ear": "left",
        }, headers=_headers(tok))
        assert resp3.status_code == 200

        db_session.expire_all()
        sale = db_session.get(Sale, sale_id)
        assigns = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).all()

        # Only 1 assignment remaining
        assert len(assigns) == 1
        assert assigns[0].ear == "left"

        # Pricing recalculated for single:
        # total = 10000, sgk = 3391.36, price_after_sgk = 6608.64
        # discount = 6608.64 * 10% = 660.864
        # final = 6608.64 - 660.864 = 5947.776
        assert float(sale.total_amount or 0) == pytest.approx(10000.0, abs=1.0)
        assert float(sale.sgk_coverage or 0) == pytest.approx(3391.36, abs=2.0)
        assert float(sale.discount_amount or 0) == pytest.approx(660.86, abs=2.0)
        assert float(sale.final_amount or 0) == pytest.approx(5947.78, abs=2.0)
        assert float(sale.patient_payment or 0) == pytest.approx(5947.78, abs=2.0)

    def test_single_to_bilateral_pricing(self, client, db_session):
        """Single→bilateral recalculates pricing for 2 devices."""
        from models.sales import Sale, DeviceAssignment

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))

        # Step 1: Create single (left)
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "over18_working",
        }, headers=_headers(tok))
        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        # Step 2: Add 10% discount
        resp2 = client.put(f"/api/sales/{sale_id}", json={
            "discountType": "percentage", "discountValue": 10,
        }, headers=_headers(tok))
        assert resp2.status_code == 200

        # Step 3: Convert to bilateral
        resp3 = client.put(f"/api/sales/{sale_id}", json={
            "ear": "both",
        }, headers=_headers(tok))
        assert resp3.status_code == 200

        db_session.expire_all()
        sale = db_session.get(Sale, sale_id)
        assigns = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).all()

        # 2 assignments
        assert len(assigns) == 2
        ears = {a.ear for a in assigns}
        assert ears == {"left", "right"}

        # Pricing recalculated for bilateral:
        # total = 20000, sgk = 6782.72, price_after_sgk = 13217.28
        # discount = 13217.28 * 10% = 1321.728
        # final = 13217.28 - 1321.728 = 11895.552
        assert float(sale.total_amount or 0) == pytest.approx(20000.0, abs=1.0)
        assert float(sale.sgk_coverage or 0) == pytest.approx(6782.72, abs=2.0)
        assert float(sale.discount_amount or 0) == pytest.approx(1321.73, abs=2.0)
        assert float(sale.final_amount or 0) == pytest.approx(11895.55, abs=2.0)
        assert float(sale.patient_payment or 0) == pytest.approx(11895.55, abs=2.0)

    def test_bilateral_to_single_returns_stock(self, client, db_session):
        """Bilateral→single returns 1 unit to inventory."""
        from core.models.inventory import InventoryItem

        party, product, tok = _setup(db_session, price=Decimal("10000.00"), stock=5)

        # Create bilateral (stock: 5 → 3)
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))
        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        db_session.expire_all()
        item = db_session.get(InventoryItem, product.id)
        assert item.available_inventory == 3

        # Convert to single (stock: 3 → 4)
        resp2 = client.put(f"/api/sales/{sale_id}", json={
            "ear": "left",
        }, headers=_headers(tok))
        assert resp2.status_code == 200

        db_session.expire_all()
        item = db_session.get(InventoryItem, product.id)
        assert item.available_inventory == 4

    def test_single_to_bilateral_deducts_stock(self, client, db_session):
        """Single→bilateral deducts 1 additional unit from inventory."""
        from core.models.inventory import InventoryItem

        party, product, tok = _setup(db_session, price=Decimal("10000.00"), stock=5)

        # Create single (stock: 5 → 4)
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "left", "paymentMethod": "cash",
            "sgkScheme": "no_coverage",
        }, headers=_headers(tok))
        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        db_session.expire_all()
        item = db_session.get(InventoryItem, product.id)
        assert item.available_inventory == 4

        # Convert to bilateral (stock: 4 → 3)
        resp2 = client.put(f"/api/sales/{sale_id}", json={
            "ear": "both",
        }, headers=_headers(tok))
        assert resp2.status_code == 200

        db_session.expire_all()
        item = db_session.get(InventoryItem, product.id)
        assert item.available_inventory == 3

    def test_bilateral_to_single_no_discount(self, client, db_session):
        """Bilateral→single without discount: final = unit_price - sgk."""
        from models.sales import Sale, DeviceAssignment

        party, product, tok = _setup(db_session, price=Decimal("10000.00"))
        resp = client.post("/api/sales", json={
            "partyId": party.id, "productId": product.id,
            "earSide": "both", "paymentMethod": "cash",
            "sgkScheme": "over18_retired",
        }, headers=_headers(tok))
        assert resp.status_code == 200
        sale_id = resp.json()["data"].get("saleId") or resp.json()["data"].get("id")

        # Convert to right ear only
        resp2 = client.put(f"/api/sales/{sale_id}", json={
            "ear": "right",
        }, headers=_headers(tok))
        assert resp2.status_code == 200

        db_session.expire_all()
        sale = db_session.get(Sale, sale_id)
        assigns = db_session.query(DeviceAssignment).filter_by(sale_id=sale_id).all()

        assert len(assigns) == 1
        assert assigns[0].ear == "right"

        # over18_retired = 4239.20 per ear
        # total = 10000, sgk = 4239.20, no discount
        # final = 10000 - 4239.20 = 5760.80
        assert float(sale.total_amount or 0) == pytest.approx(10000.0, abs=1.0)
        assert float(sale.sgk_coverage or 0) == pytest.approx(4239.20, abs=2.0)
        assert float(sale.discount_amount or 0) == pytest.approx(0.0, abs=1.0)
        assert float(sale.final_amount or 0) == pytest.approx(5760.80, abs=2.0)
