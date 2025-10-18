import pytest
from backend.services.pricing import (
    calculate_device_pricing,
    calculate_payment_plan,
    create_custom_payment_plan,
    create_payment_plan
)
from types import SimpleNamespace


def settings_stub():
    return {
        'pricing': {
            'accessories': {'battery_pack': 150.0},
            'services': {'fitting': 500.0}
        },
        'sgk': {
            'schemes': {
                'standard': {'coverage_percentage': 50.0, 'max_amount': 1000.0},
                'fixed_amount': {'coverage_amount': 500.0, 'max_amount': 500.0}
            },
            'default_scheme': 'standard'
        },
        'payment': {
            'plans': {
                'cash': {'installments': 1, 'interest_rate': 0.0},
                'installment_3': {'installments': 3, 'interest_rate': 5.0}
            },
            'default_plan': 'cash',
            'due_dates': [15, 30, 45]
        }
    }


def test_calculate_device_pricing_basic():
    device_assignments = [{'device_id': None, 'base_price': 2000}]
    accessories = []
    services = []
    settings = settings_stub()

    pricing = calculate_device_pricing(device_assignments, accessories, services, 'standard', settings)

    assert pricing['total_amount'] == 2000.00
    # SGK coverage 50% of 2000 limited by max_amount 1000 -> coverage 1000
    assert pricing['sgk_coverage_amount'] == 1000.00
    assert pricing['patient_responsible_amount'] == 1000.00
    assert pricing['total_discount'] == 0.00


def test_calculate_device_pricing_with_accessories_and_services():
    device_assignments = [{'device_id': None, 'base_price': 3000, 'discount_value': 100}]
    accessories = [{'type': 'battery_pack'}]
    services = [{'type': 'fitting'}]
    settings = settings_stub()

    pricing = calculate_device_pricing(device_assignments, accessories, services, 'standard', settings)

    expected_total = 3000 + 150 + 500 - 100
    assert pricing['total_amount'] == expected_total
    # Coverage 50% limited by max_amount 1000 -> coverage min( expected_total*0.5, 1000 )
    assert pricing['sgk_coverage_amount'] == min(round(expected_total * 0.5, 2), 1000.00)


def test_calculate_device_pricing_sgk_fixed_amount():
    device_assignments = [{'device_id': None, 'base_price': 800}]
    settings = settings_stub()

    pricing = calculate_device_pricing(device_assignments, [], [], 'fixed_amount', settings)
    # fixed coverage amount is 500, cannot exceed total
    assert pricing['sgk_coverage_amount'] == 500.00
    assert pricing['patient_responsible_amount'] == 300.00


def test_calculate_payment_plan_rounding():
    preview = calculate_payment_plan(1000, 3, 12.0)
    assert preview['installments'] == 3
    assert preview['interest_rate'] == 12.0
    # interest_total approx = 1000 * 0.12 * (3/12) = 30.0
    assert round(preview['interest_total'], 2) == 30.00
    assert round(preview['total_amount'], 2) == 1030.00
    # installment amount rounded
    assert preview['installment_amount'] == round(1030.0 / 3, 2)


def test_create_custom_payment_plan_adds_installments(monkeypatch):
    # Ensure that db.session.add is called for each installment without touching DB
    added = []
    monkeypatch.setattr('backend.services.pricing.db.session', SimpleNamespace(add=lambda obj: added.append(obj)))

    plan = create_custom_payment_plan('sale_1', custom_installments=4, custom_interest_rate=10.0, principal_amount=2000)
    # Plan should be created with the requested installments
    assert plan.installments == 4
    # db.session.add should have been called 4 times (for installments)
    assert len(added) == 4


def test_create_payment_plan_respects_settings(monkeypatch):
    added = []
    monkeypatch.setattr('backend.services.pricing.db.session', SimpleNamespace(add=lambda obj: added.append(obj)))

    settings = settings_stub()
    # create_payment_plan will look up plan_type in settings
    plan = create_payment_plan('sale_2', 'installment_3', 1200, settings)
    assert plan.installments == 3
    assert len(added) == 3
