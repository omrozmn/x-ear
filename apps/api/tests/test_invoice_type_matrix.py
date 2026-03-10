from pathlib import Path
from types import SimpleNamespace
import xml.etree.ElementTree as ET

from utils.draft_to_invoice import build_invoice_dict_from_form, build_sgk_invoice_data
from utils.ubl_utils import NS, generate_despatch_advice_xml, generate_sgk_invoice_xml, generate_ubl_xml


def _tenant():
    return SimpleNamespace(
        name="Test Tenant",
        settings={
            "invoice_integration": {"vkn": "7030734275", "tax_office": "OSMANGAZI"},
            "company": {"name": "Ozmen Tibbi", "address": "Bursa", "city": "Bursa", "district": "Osmangazi"},
        },
        company_info={"companyName": "Ozmen Tibbi", "taxNumber": "7030734275", "city": "Bursa", "district": "Osmangazi", "defaultExemptionCode": "301"},
        billing_email="billing@example.com",
        owner_email="owner@example.com",
    )


def _base_form(invoice_type: str, scenario: str = "other") -> dict:
    return {
        "invoiceType": invoice_type,
        "scenario": scenario,
        "scenarioData": {"scenario": scenario, "currentScenarioType": "3"},
        "issueDate": "2026-03-08",
        "issueTime": "10:00:00",
        "currency": "TRY",
        "customerName": "Test Alici",
        "customerTaxNumber": "1234567890",
        "customerAddress": "Istanbul",
        "customerCity": "Istanbul",
        "customerDistrict": "Kadikoy",
        "items": [
            {
                "name": "Kalem",
                "quantity": 1,
                "unitPrice": 100,
                "taxRate": 20,
                "discount": 0,
                "discountType": "percentage",
            }
        ],
    }


def _xml_root(invoice_dict: dict, tmp_path: Path) -> ET.Element:
    xml_path = tmp_path / f"{invoice_dict['invoiceType']}.xml"
    if str(invoice_dict.get("invoiceType")) == "14":
        generate_sgk_invoice_xml(build_sgk_invoice_data(invoice_dict), str(xml_path))
    elif invoice_dict.get("systemType") == "EIRSALIYE":
        generate_despatch_advice_xml(invoice_dict, str(xml_path))
    else:
        generate_ubl_xml(invoice_dict, str(xml_path), currency=invoice_dict.get("currency", "TRY"))
    return ET.parse(xml_path).getroot()


def _text(root: ET.Element, xpath: str) -> str | None:
    node = root.find(xpath, NS)
    return node.text if node is not None else None


def _has_doc_type(root: ET.Element, doc_type_code: str) -> bool:
    return any(
        ref.find("cbc:DocumentTypeCode", NS) is not None
        and ref.find("cbc:DocumentTypeCode", NS).text == doc_type_code
        for ref in root.findall("cac:AdditionalDocumentReference", NS)
    )


def test_invoice_type_matrix_generates_expected_profiles_and_elements(tmp_path: Path):
    tenant = _tenant()
    cases = [
        ("satis_temel", {"invoiceType": "0", "scenarioData": {"scenario": "other", "currentScenarioType": "2"}}, "TEMELFATURA", "SATIS"),
        ("satis_ticari", {"invoiceType": "0"}, "TICARIFATURA", "SATIS"),
        ("iade", {"invoiceType": "50", "returnInvoiceDetails": {"returnInvoiceNumber": "RET-1", "returnInvoiceDate": "2026-03-01"}}, "TEMELFATURA", "IADE"),
        ("tevkifat", {"invoiceType": "11", "withholdingData": {"withholdingCode": "624", "withholdingRate": 20}}, "TICARIFATURA", "TEVKIFAT"),
        ("istisna", {"invoiceType": "13", "governmentExemptionReason": "301"}, "TICARIFATURA", "ISTISNA"),
        ("ozelmatrah", {"invoiceType": "12", "specialTaxBase": {"description": "Ozel Matrah"}}, "TICARIFATURA", "OZELMATRAH"),
        ("ihracat", {"invoiceType": "27", "scenario": "export", "scenarioData": {"scenario": "export"}, "exportDetails": {"deliveryTerms": "CIF", "transportMode": "1", "gtipCode": "847130"}}, "IHRACAT", "IHRACAT"),
        ("sgk", {"invoiceType": "14", "sgkData": {"dosyaNo": "1", "mukellefKodu": "2", "mukellefAdi": "3"}}, "TEMELFATURA", None),
        ("hks", {"invoiceType": "hks", "profileDetails": {"hotelRegistrationNo": "HKS-1", "accommodationStartDate": "2026-03-01", "accommodationEndDate": "2026-03-05"}}, "HKS", "SATIS"),
        ("sarj", {"invoiceType": "sarj", "profileDetails": {"stationCode": "ST-1", "chargeStartDate": "2026-03-01", "chargeEndDate": "2026-03-01"}}, "ENERJI", "SARJ"),
        ("earsiv", {"invoiceType": "earsiv"}, "EARSIVFATURA", "SATIS"),
        ("yolcu", {"invoiceType": "yolcu", "profileDetails": {"passengerName": "Jane Doe", "passengerPassportNo": "P123", "passengerNationality": "DE"}}, "YOLCUBERABERFATURA", "SATIS"),
        ("sevk", {"invoiceType": "sevk"}, "TEMELIRSALIYE", "SEVK"),
        ("sarjanlik", {"invoiceType": "sarjanlik", "profileDetails": {"stationCode": "ST-2", "chargeStartDate": "2026-03-01", "chargeEndDate": "2026-03-01"}}, "ENERJI", "SARJANLIK"),
        ("otv", {"invoiceType": "otv", "profileDetails": {"otvCode": "9021", "otvRate": 25}}, "TICARIFATURA", "SATIS"),
        ("hastane", {"invoiceType": "hastane", "scenario": "medical", "scenarioData": {"scenario": "medical"}, "profileDetails": {"patientName": "Hasta Bir", "patientTaxId": "11111111111"}}, "TICARIFATURA", "SATIS"),
    ]

    for _, overrides, expected_profile, expected_type in cases:
        form_data = _base_form(overrides.get("invoiceType", "0"), overrides.get("scenario", "other"))
        form_data.update(overrides)
        invoice_dict = build_invoice_dict_from_form(form_data, tenant, draft_id=1)
        root = _xml_root(invoice_dict, tmp_path)
        assert _text(root, "cbc:ProfileID") == expected_profile
        if expected_type:
            if invoice_dict.get("systemType") == "EIRSALIYE":
                assert _text(root, "cbc:DespatchAdviceTypeCode") == expected_type
            else:
                assert _text(root, "cbc:InvoiceTypeCode") == expected_type

    hks_root = _xml_root(build_invoice_dict_from_form({**_base_form("hks"), "profileDetails": {"hotelRegistrationNo": "HKS-1", "accommodationStartDate": "2026-03-01", "accommodationEndDate": "2026-03-05"}}, tenant, draft_id=2), tmp_path)
    assert _text(hks_root, "cac:InvoicePeriod/cbc:StartDate") == "2026-03-01"
    assert _has_doc_type(hks_root, "HOTEL_REG_NO")

    export_root = _xml_root(build_invoice_dict_from_form({**_base_form("27", "export"), "scenarioData": {"scenario": "export"}, "exportDetails": {"deliveryTerms": "CIF", "transportMode": "1", "gtipCode": "847130"}}, tenant, draft_id=3), tmp_path)
    assert _text(export_root, "cac:BuyerCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID[@schemeID='PARTYTYPE']") == "EXPORT"
    assert _text(export_root, "cac:Delivery/cac:DeliveryTerms/cbc:ID") == "CIF"
    assert _text(export_root, "cac:Delivery/cac:Shipment/cac:GoodsItem/cbc:RequiredCustomsID") == "847130"

    yolcu_root = _xml_root(build_invoice_dict_from_form({**_base_form("yolcu"), "profileDetails": {"passengerName": "Jane Doe", "passengerPassportNo": "P123", "passengerNationality": "DE"}}, tenant, draft_id=4), tmp_path)
    assert _text(yolcu_root, "cac:BuyerCustomerParty/cac:Party/cac:PartyIdentification/cbc:ID[@schemeID='PASSPORTNO']") == "P123"
    assert _text(yolcu_root, "cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReasonCode") == "501"

    otv_root = _xml_root(build_invoice_dict_from_form({**_base_form("otv"), "profileDetails": {"otvCode": "9021", "otvRate": 25}}, tenant, draft_id=5), tmp_path)
    assert _text(otv_root, "cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cac:TaxScheme/cbc:TaxTypeCode") == "9021"

    default_exemption_root = _xml_root(build_invoice_dict_from_form({**_base_form("0"), "items": [{"name": "Sifir KDV", "quantity": 1, "unitPrice": 100, "taxRate": 0}]}, tenant, draft_id=6), tmp_path)
    assert _text(default_exemption_root, "cac:TaxTotal/cac:TaxSubtotal/cac:TaxCategory/cbc:TaxExemptionReasonCode") == "301"
