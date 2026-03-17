from routers.reports import (
    mask_financial_response,
    mask_pos_movement_item,
    mask_promissory_note_item,
    mask_report_tracking_item,
)


class DummyAccess:
    def __init__(self, permissions: set[str]):
        self.permissions = permissions

    def has_permission(self, permission: str) -> bool:
        return "*" in self.permissions or permission in self.permissions


def test_financial_report_masks_amounts_without_permission():
    payload = {
        "revenue_trend": {3: 12000.0},
        "product_sales": {"Oticon": {"sales": 2, "revenue": 8000.0}},
        "payment_methods": {"cash": {"count": 1, "amount": 5000.0}},
    }

    masked = mask_financial_response(payload, DummyAccess(set()))

    assert masked["revenue_trend"] == {}
    assert masked["product_sales"]["Oticon"]["sales"] == 2
    assert masked["product_sales"]["Oticon"]["revenue"] == 0.0
    assert masked["payment_methods"]["cash"]["count"] == 1
    assert masked["payment_methods"]["cash"]["amount"] == 0.0


def test_promissory_note_masks_contact_and_amounts_without_permission():
    payload = {
        "id": "note_1",
        "amount": 1000.0,
        "paidAmount": 200.0,
        "remainingAmount": 800.0,
        "party": {"id": "pat_1", "name": "Ali Sahin", "phone": "05331000004"},
    }

    masked = mask_promissory_note_item(payload, DummyAccess(set()))

    assert masked["amount"] == 0.0
    assert masked["paidAmount"] == 0.0
    assert masked["remainingAmount"] == 0.0
    assert masked["party"]["phone"] is None


def test_pos_movement_masks_sensitive_detail_without_permission():
    payload = {
        "id": "pay_1",
        "amount": 1500.0,
        "sale_id": "sale_1",
        "party_name": "Ali Sahin",
        "pos_transaction_id": "txn_123",
        "error_message": "declined",
    }

    masked = mask_pos_movement_item(payload, DummyAccess(set()))

    assert masked["amount"] == 0.0
    assert masked["sale_id"] is None
    assert masked["party_name"] is None
    assert masked["pos_transaction_id"] is None
    assert masked["error_message"] is None


def test_report_tracking_masks_patient_and_device_details_without_permission():
    payload = {
        "id": "assign_1",
        "saleId": "sale_1",
        "partyId": "pat_1",
        "partyName": "Ali Sahin",
        "deviceName": "Oticon More",
        "serialNumber": "SN-123",
        "brand": "Oticon",
        "model": "More",
        "ear": "left",
    }

    masked = mask_report_tracking_item(payload, DummyAccess(set()))

    assert masked["saleId"] is None
    assert masked["partyId"] is None
    assert masked["partyName"] == "Bu rol icin gizli"
    assert masked["deviceName"] is None
    assert masked["serialNumber"] is None
    assert masked["brand"] is None
    assert masked["model"] is None
    assert masked["ear"] is None
