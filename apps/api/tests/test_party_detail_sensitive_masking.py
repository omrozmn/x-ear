from routers.parties import _mask_party_detail_response, _mask_party_list_response


class DummyAccess:
    def __init__(self, permissions: set[str]):
        self.permissions = permissions

    def has_permission(self, permission: str) -> bool:
        return "*" in self.permissions or permission in self.permissions


def build_party_payload() -> dict:
    return {
        "id": "pat_sensitive_1",
        "first_name": "Ali",
        "last_name": "Sahin",
        "phone": "05331000004",
        "email": "ali@example.com",
        "tc_number": "12345678901",
        "identity_number": "12345678901",
        "sgk_info": {"reportNo": "RPT-123", "coverage": "full"},
        "status": "active",
        "segment": "lead",
    }


def test_party_detail_masks_sensitive_fields_without_permissions():
    masked = _mask_party_detail_response(build_party_payload(), DummyAccess(set()))

    assert masked.phone is None
    assert masked.email is None
    assert masked.tc_number is None
    assert masked.identity_number is None
    assert masked.sgk_info == {}


def test_party_detail_keeps_sensitive_fields_with_permissions():
    masked = _mask_party_detail_response(
        build_party_payload(),
        DummyAccess(
            {
                "sensitive.parties.detail.contact.view",
                "sensitive.parties.detail.identity.view",
                "sensitive.parties.detail.sgk.view",
            }
        ),
    )

    assert masked.phone == "05331000004"
    assert masked.email == "ali@example.com"
    assert masked.tc_number == "12345678901"
    assert masked.identity_number == "12345678901"
    assert masked.sgk_info == {"reportNo": "RPT-123", "coverage": "full"}


def test_party_list_masks_contact_and_identity_fields_without_permissions():
    masked_list = _mask_party_list_response([build_party_payload()], DummyAccess(set()))
    masked = masked_list[0]

    assert masked.phone is None
    assert masked.email is None
    assert masked.tc_number is None
