#!/usr/bin/env python3
"""
Type-by-type XML generation and BirFatura test API validation.

Creates sample invoices for the active invoice types, generates XML, sends each
document to the BirFatura test environment and writes a compact JSON report.
"""
import base64
import json
import os
import sys
import traceback
import uuid
from datetime import datetime

from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))

from services.birfatura.service import BirfaturaClient
from utils.ubl_utils import generate_sgk_invoice_xml, generate_ubl_xml, validate_ubl_xml

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

TEST_API_KEY = os.getenv("BIRFATURA_TEST_API_KEY", "")
TEST_SECRET_KEY = os.getenv("BIRFATURA_TEST_SECRET_KEY", "")
TEST_INTEGRATION_KEY = os.getenv("BIRFATURA_TEST_INTEGRATION_KEY", "")

os.environ["BIRFATURA_MOCK"] = "0"

SUPPLIER = {
    "name": "X-Ear Test İşitme Merkezi",
    "tax_id": "1234567801",
    "vkn": "1234567801",
    "tax_office": "ANKARA",
    "address": {
        "street": "Test sokak",
        "district": "Cankaya",
        "city": "ANKARA",
        "country": "TÜRKİYE",
        "postalZone": "06100",
    },
}

CUSTOMER = {
    "name": "GIB TEST RECEIVER",
    "tax_id": "1234567801",
    "tax_office": "ANKARA",
    "address": {
        "street": "Alici sokak",
        "district": "Cankaya",
        "city": "ANKARA",
        "country": "TÜRKİYE",
        "postalZone": "06100",
    },
}

BASIC_LINES = [{
    "description": "İşitme Cihazı - Premium",
    "quantity": 1,
    "unit": "ADET",
    "price": 5000.00,
    "line_extension_amount": 5000.00,
    "tax_rate": 10.0,
}]

ZERO_TAX_LINES = [{
    "description": "İhracat Ürünü",
    "quantity": 2,
    "unit": "ADET",
    "price": 3000.00,
    "line_extension_amount": 6000.00,
    "tax_rate": 0.0,
}]

WITHHOLDING_LINES = [{
    "description": "Hizmet Bedeli - Tevkifatlı",
    "quantity": 1,
    "unit": "HIZMET",
    "price": 10000.00,
    "line_extension_amount": 10000.00,
    "tax_rate": 20.0,
    "withholding_rate": 90.0,
    "withholding_code": "606",
}]


def make_invoice(invoice_type, scenario="other", extra=None):
    invoice_number = f"TST{datetime.now().strftime('%Y')}{str(uuid.uuid4().int % 10**9).zfill(9)}"
    invoice = {
        "invoiceNumber": invoice_number,
        "uuid": str(uuid.uuid4()),
        "invoiceType": invoice_type,
        "scenario": scenario,
        "createdAt": datetime.now().isoformat(),
        "currency": "TRY",
        "lines": list(BASIC_LINES),
        "supplier": dict(SUPPLIER),
        "customer": dict(CUSTOMER),
    }
    if extra:
        invoice.update(extra)
    return invoice


TESTS = [
    ("SATIS (Temel)", "0", "other", {"profileId": "TEMELFATURA"}, "SATIS"),
    ("SATIS (Ticari)", "0", "other", {"profileId": "TICARIFATURA"}, "SATIS"),
    ("IADE", "50", "other", {
        "return_invoice_number": "GIB2009000000011",
        "return_invoice_date": "2025-12-01",
        "return_invoice_details": {
            "returnInvoiceNumber": "GIB2009000000011",
            "returnInvoiceDate": "2025-12-01",
        },
    }, "IADE"),
    ("TEVKIFAT", "11", "other", {"lines": list(WITHHOLDING_LINES)}, "TEVKIFAT"),
    ("ISTISNA", "13", "other", {
        "governmentExemptionReason": "301",
        "lines": list(ZERO_TAX_LINES),
        "payment_terms": {"paymentTerm": "30 gün vade", "paymentDays": 30},
    }, "ISTISNA"),
    ("IHRACAT", "5", "export", {
        "currency": "USD",
        "lines": list(ZERO_TAX_LINES),
        "export_details": {
            "deliveryTerms": "CIF",
            "transportMode": "1",
            "gtipCode": "9021.40",
            "packagingType": "AF",
        },
    }, "IHRACAT"),
    ("OZELMATRAH", "12", "other", {
        "lines": [{
            "description": "Özel Matrah Ürünü",
            "quantity": 1,
            "unit": "ADET",
            "price": 8000.00,
            "line_extension_amount": 8000.00,
            "tax_rate": 10.0,
        }]
    }, "OZELMATRAH"),
    ("SGK", "14", "other", {}, "SATIS"),
    ("TEVKIFAT (18)", "18", "other", {"lines": list(WITHHOLDING_LINES)}, "TEVKIFAT"),
    ("IHRACKAYITLI (27)", "27", "other", {
        "export_details": {
            "deliveryTerms": "FOB",
            "transportMode": "4",
            "gtipCode": "9021.40",
        },
    }, "IHRACKAYITLI"),
    ("TIBBI CIHAZ", "0", "medical", {
        "buyer_customer": {"name": "Hasta Test", "tax_id": "12345678901"},
        "lines": [{
            "description": "İşitme Cihazı",
            "quantity": 1,
            "unit": "ADET",
            "price": 4200.00,
            "line_extension_amount": 4200.00,
            "tax_rate": 10.0,
            "medical_device_data": {
                "licenseNumber": "LIC-2026-001",
                "serialNumber": "SN-2026-001",
                "lotNumber": "LOT-2026-001",
            },
        }],
    }, "SATIS"),
]


def inspect_xml(xml_path, expected_type_code):
    with open(xml_path, "r", encoding="utf-8") as handle:
        xml_text = handle.read()

    markers = {
        "invoice_type_ok": f">{expected_type_code}<" in xml_text,
        "has_payment_terms": "<cac:PaymentTerms>" in xml_text,
        "has_buyer_customer_party": "<cac:BuyerCustomerParty>" in xml_text,
        "has_delivery": "<cac:Delivery>" in xml_text,
        "has_medical_refs": "LICENSE_NO" in xml_text or "SERIAL_NO" in xml_text or "LOT_NO" in xml_text,
    }
    return xml_text, markers


def run_test(test_name, invoice_type, scenario, extra, expected_type_code):
    print(f"\n{'=' * 60}")
    print(f"TEST: {test_name}")
    print(f"Type: {invoice_type} -> Expected XML: {expected_type_code}")
    print(f"{'=' * 60}")

    outbox_dir = os.path.join(os.path.dirname(__file__), "instance", "test_outbox")
    os.makedirs(outbox_dir, exist_ok=True)

    if invoice_type == "14":
        sgk_data = {
            "invoice_number": f"TST{datetime.now().strftime('%Y')}{str(uuid.uuid4().int % 10**9).zfill(9)}",
            "uuid": str(uuid.uuid4()),
            "issue_date": datetime.now().strftime("%Y-%m-%d"),
            "issue_time": datetime.now().strftime("%H:%M:%S"),
            "dosya_no": "1225324",
            "mukellef_kodu": "11111111",
            "mukellef_adi": "TEST OPTIK",
            "period_start": datetime.now().strftime("%Y-%m-%d"),
            "period_end": datetime.now().strftime("%Y-%m-%d"),
            "supplier": SUPPLIER,
            "customer": CUSTOMER,
            "lines": [{
                "name": "SGK Isitme Cihazi",
                "quantity": 1,
                "unit": "ADET",
                "unit_price": 2500.00,
                "total_price": 2500.00,
                "tax_amount": 0.0,
                "tax_rate": 0.0,
                "tax_exemption_code": "317",
                "tax_exemption_reason": "Engellilerin kullanimina mahsus arac gerec",
            }],
            "kpv10_amount": 1379.00,
            "kpv20_amount": 2270.50,
            "tahsil_edilen_kp": 592.00,
        }
        xml_filename = f"TEST_SGK_{int(datetime.now().timestamp())}.xml"
        xml_path = os.path.join(outbox_dir, xml_filename)
        generate_sgk_invoice_xml(sgk_data, xml_path)
    else:
        inv = make_invoice(invoice_type, scenario, extra)
        xml_filename = f"TEST_{expected_type_code}_{int(datetime.now().timestamp())}.xml"
        xml_path = os.path.join(outbox_dir, xml_filename)
        generate_ubl_xml(inv, xml_path, currency=inv.get("currency", "TRY"))

    is_valid, missing = validate_ubl_xml(xml_path)
    xml_text, markers = inspect_xml(xml_path, expected_type_code)

    with open(xml_path, "rb") as handle:
        content_b64 = base64.b64encode(handle.read()).decode("utf-8")

    client = BirfaturaClient(
        api_key=TEST_API_KEY,
        secret_key=TEST_SECRET_KEY,
        integration_key=TEST_INTEGRATION_KEY,
    )

    response = None
    try:
        response = client.send_document({
            "fileName": xml_filename,
            "documentBytes": content_b64,
            "systemTypeCodes": "EFATURA",
            "isDocumentNoAuto": True,
        })
    except Exception as exc:
        traceback.print_exc()
        return {
            "test": test_name,
            "status": "ERROR",
            "error": str(exc),
            "xml_path": xml_path,
            "xml_valid": is_valid,
            "xml_missing": missing,
            "xml_markers": markers,
        }

    success = bool(response.get("Success"))
    result = response.get("Result") or {}
    return {
        "test": test_name,
        "status": "SUCCESS" if success else "FAILED",
        "invoiceNo": result.get("invoiceNo"),
        "message": response.get("Message"),
        "xml_path": xml_path,
        "xml_valid": is_valid,
        "xml_missing": missing,
        "xml_markers": markers,
        "provider_result": result,
        "provider_response_excerpt": {
            "Success": response.get("Success"),
            "Message": response.get("Message"),
        },
    }


def main():
    results = []
    print("=" * 60)
    print(f"FATURA TIPLERI TESTI {datetime.now().isoformat()}")
    print("=" * 60)

    if not TEST_API_KEY or not TEST_SECRET_KEY or not TEST_INTEGRATION_KEY:
        print("Eksik test credential: BIRFATURA_TEST_API_KEY / SECRET_KEY / INTEGRATION_KEY")
        return 2

    client = BirfaturaClient(
        api_key=TEST_API_KEY,
        secret_key=TEST_SECRET_KEY,
        integration_key=TEST_INTEGRATION_KEY,
    )
    try:
        credits = client.get_number_of_credits({})
        print(json.dumps({
            "auth_smoke_test": True,
            "success": credits.get("Success"),
            "message": credits.get("Message"),
            "result": credits.get("Result"),
        }, ensure_ascii=False))
    except Exception as exc:
        print(json.dumps({
            "auth_smoke_test": True,
            "success": False,
            "error": str(exc),
        }, ensure_ascii=False))
        return 3

    for test in TESTS:
        try:
            result = run_test(*test)
        except Exception as exc:
            traceback.print_exc()
            result = {"test": test[0], "status": "ERROR", "error": str(exc)}
        results.append(result)
        print(json.dumps({
            "test": result.get("test"),
            "status": result.get("status"),
            "invoiceNo": result.get("invoiceNo"),
            "message": result.get("message") or result.get("error"),
            "xml_markers": result.get("xml_markers"),
        }, ensure_ascii=False))

    report_dir = os.path.join(os.path.dirname(__file__), "instance", "test_outbox")
    os.makedirs(report_dir, exist_ok=True)
    report_path = os.path.join(report_dir, f"invoice_type_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json")
    with open(report_path, "w", encoding="utf-8") as handle:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "results": results,
        }, handle, ensure_ascii=False, indent=2)

    success_count = sum(1 for item in results if item.get("status") == "SUCCESS")
    print(f"\nToplam: {len(results)} test, {success_count} başarılı, {len(results) - success_count} başarısız")
    print(f"Rapor: {report_path}")
    return 0 if success_count == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
