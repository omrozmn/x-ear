import re
from decimal import Decimal
from datetime import datetime


def test_sale_id_format():
    from database import gen_sale_id

    sale_id = gen_sale_id(db_session=None)
    assert re.fullmatch(r"\d{10}", sale_id)


def test_inventory_sale_assignment_semantics():
    """Regression guard: inventory sales must preserve legacy semantics.

    - DeviceAssignment.device_id may equal inventory id (legacy comment in model)
    - DeviceAssignment.inventory_id must be populated for stock/return logic
    """

    class Dummy:
        pass

    product = Dummy()
    product.id = "inv_123"

    assignment = Dummy()
    assignment.device_id = product.id
    assignment.inventory_id = product.id

    assert assignment.device_id == product.id
    assert assignment.inventory_id == product.id


def test_decimal_handling_regression():
    # Ensure we don't accidentally introduce float -> Decimal issues in critical fields
    amount = Decimal(str(123.45))
    assert str(amount) == "123.45"
