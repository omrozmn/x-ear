#!/usr/bin/env python3
"""
End-to-end test for ALL invoice types:
  1. Generate UBL XML using generate_ubl_xml()
  2. Send to BirFatura TEST API
  3. Verify response
  4. Attempt PDF download for successful sends

Uses BirFatura test credentials directly (no backend server needed).
"""
import os
import sys
import uuid
import base64
import json
import traceback
from datetime import datetime

# Add parent to path so we can import utils
sys.path.insert(0, os.path.dirname(__file__))

from utils.ubl_utils import generate_ubl_xml, generate_sgk_invoice_xml, validate_ubl_xml
from services.birfatura.service import BirfaturaClient

# ─── BirFatura Test Credentials ───
TEST_API_KEY = "61c1c7a1-5f6c-4cd8-888d-c69eb46cabcb"
TEST_INTEGRATION_KEY = "acfe249d-41ce-44c3-ab70-ae570a5f6ac6"
# Secret key for test (using same as api_key for test env)
TEST_SECRET_KEY = TEST_API_KEY

# Force real API calls (not mock)
os.environ["BIRFATURA_MOCK"] = "0"

# Test supplier (our company)
SUPPLIER = {
    "name": "X-Ear Test İşitme Merkezi",
    "tax_id": "1234567890",
    "tax_office": "Kadıköy VD",
    "address": {
        "street": "Atatürk Cad. No: 123",
        "district": "Kadıköy",
        "city": "İstanbul",
        "country": "Türkiye",
        "postalZone": "34710",
    },
}

# Test customer
CUSTOMER = {
    "name": "Test Alıcı A.Ş.",
    "tax_id": "9876543210",
    "tax_office": "Beşiktaş VD",
    "address": {
        "street": "İnönü Cad. No: 45",
        "district": "Beşiktaş",
        "city": "İstanbul",
        "country": "Türkiye",
    },
}

# Standard line items for testing
BASIC_LINES = [
    {
        "description": "İşitme Cihazı - Premium",
        "quantity": 1,
        "unit": "ADET",
        "price": 5000.00,
        "line_extension_amount": 5000.00,
        "tax_rate": 10.0,
    }
]

ZERO_TAX_LINES = [
    {
        "description": "İhracat Ürünü",
        "quantity": 2,
        "unit": "ADET",
        "price": 3000.00,
        "line_extension_amount": 6000.00,
        "tax_rate": 0.0,
    }
]

WITHHOLDING_LINES = [
    {
        "description": "Hizmet Bedeli - Tevkifatlı",
        "quantity": 1,
        "unit": "HIZMET",
        "price": 10000.00,
        "line_extension_amount": 10000.00,
        "tax_rate": 20.0,
        "withholding_rate": 50.0,
        "withholding_code": "9015",
    }
]


def make_invoice(invoice_type, scenario="other", extra=None):
    """Build a test invoice dict for a given type."""
    inv = {
        "invoiceNumber": f"TST{datetime.now().strftime('%Y%m%d%H%M%S')}{str(uuid.uuid4())[:4].upper()}",
        "uuid": str(uuid.uuid4()),
        "invoiceType": invoice_type,
        "scenario": scenario,
        "createdAt": datetime.now().isoformat(),
        "currency": "TRY",
        "lines": list(BASIC_LINES),  # copy
        "supplier": dict(SUPPLIER),
        "customer": dict(CUSTOMER),
    }
    if extra:
        inv.update(extra)
    return inv


# ─── TEST DEFINITIONS ───
# Each test: (name, invoice_type, scenario, extra_fields, expected_xml_type)
TESTS = [
    # 1. SATIS - Temel
    (
        "SATIS (Temel)",
        "0",
        "other",
        {"profileId": "TEMELFATURA"},
        "SATIS",
    ),
    # 2. SATIS - Ticari
    (
        "SATIS (Ticari)",
        "0",
        "other",
        {"profileId": "TICARIFATURA"},
        "SATIS",
    ),
    # 3. IADE
    (
        "IADE",
        "50",
        "other",
        {
            "return_invoice_number": "ABC2024000001",
            "return_invoice_date": "2025-12-01",
            "return_invoice_details": {
                "returnInvoiceNumber": "ABC2024000001",
                "returnInvoiceDate": "2025-12-01",
            },
        },
        "IADE",
    ),
    # 4. TEVKIFAT
    (
        "TEVKIFAT",
        "11",
        "other",
        {"lines": list(WITHHOLDING_LINES)},
        "TEVKIFAT",
    ),
    # 5. ISTISNA
    (
        "ISTISNA",
        "13",
        "other",
        {
            "governmentExemptionReason": "301",
            "lines": list(ZERO_TAX_LINES),
        },
        "ISTISNA",
    ),
    # 6. IHRACAT
    (
        "IHRACAT",
        "5",
        "export",
        {
            "currency": "USD",
            "lines": list(ZERO_TAX_LINES),
            "export_details": {
                "deliveryTerms": "CIF",
                "transportMode": "1",
                "gtipCode": "9021.40",
                "packagingType": "AF",
            },
        },
        "IHRACAT",
    ),
    # 7. OZELMATRAH
    (
        "OZELMATRAH",
        "12",
        "other",
        {
            "lines": [
                {
                    "description": "Özel Matrah Ürünü",
                    "quantity": 1,
                    "unit": "ADET",
                    "price": 8000.00,
                    "line_extension_amount": 8000.00,
                    "tax_rate": 10.0,
                }
            ]
        },
        "OZELMATRAH",
    ),
    # 8. SGK (uses generate_sgk_invoice_xml)
    (
        "SGK",
        "14",
        "other",
        {},  # SGK handled separately
        "SGK",
    ),
    # 9. TEVKIFAT variant (18)
    (
        "TEVKIFAT (18)",
        "18",
        "other",
        {"lines": list(WITHHOLDING_LINES)},
        "TEVKIFAT",
    ),
    # 10. IHRACKAYITLI (27)
    (
        "IHRACKAYITLI (27)",
        "27",
        "other",
        {
            "export_details": {
                "deliveryTerms": "FOB",
                "transportMode": "4",
                "gtipCode": "9021.40",
            },
        },
        "IHRACKAYITLI",
    ),
]


def run_test(test_name, invoice_type, scenario, extra, expected_type_code):
    """Run a single invoice type test."""
    print(f"\n{'='*60}")
    print(f"  TEST: {test_name}")
    print(f"  Type: {invoice_type} → Expected XML: {expected_type_code}")
    print(f"{'='*60}")

    outbox_dir = os.path.join(os.path.dirname(__file__), "instance", "test_outbox")
    os.makedirs(outbox_dir, exist_ok=True)

    # ── SGK special path ──
    if invoice_type == "14":
        sgk_data = {
            "invoice_number": f"TST{datetime.now().strftime('%Y%m%d%H%M%S')}",
            "uuid": str(uuid.uuid4()),
            "issue_date": datetime.now().strftime("%Y-%m-%d"),
            "issue_time": datetime.now().strftime("%H:%M:%S"),
            "dosya_no": "1225324",
            "mukellef_kodu": "11111111",
            "mukellef_adi": "TEST OPTİK",
            "period_start": datetime.now().strftime("%Y-%m-%d"),
            "period_end": datetime.now().strftime("%Y-%m-%d"),
            "supplier": SUPPLIER,
            "kpv10_amount": 1379.00,
            "kpv20_amount": 2270.50,
            "tahsil_edilen_kp": 592.00,
        }
        xml_filename = f"TEST_SGK_{int(datetime.now().timestamp())}.xml"
        xml_path = os.path.join(outbox_dir, xml_filename)
        xml_content = generate_sgk_invoice_xml(sgk_data, xml_path)
        print(f"  ✅ SGK XML generated: {xml_filename}")
    else:
        # ── Standard path ──
        inv = make_invoice(invoice_type, scenario, extra)
        xml_filename = f"TEST_{expected_type_code}_{int(datetime.now().timestamp())}.xml"
        xml_path = os.path.join(outbox_dir, xml_filename)
        generate_ubl_xml(inv, xml_path, currency=inv.get("currency", "TRY"))
        print(f"  ✅ XML generated: {xml_filename}")

    # ── Validate XML structure ──
    is_valid, missing = validate_ubl_xml(xml_path)
    if is_valid:
        print(f"  ✅ XML validation passed")
    else:
        print(f"  ⚠️  XML validation warnings: {missing}")

    # ── Check InvoiceTypeCode in XML ──
    with open(xml_path, "r", encoding="utf-8") as f:
        xml_text = f.read()

    if f">{expected_type_code}<" in xml_text:
        print(f"  ✅ InvoiceTypeCode = {expected_type_code}")
    else:
        # Extract actual type code
        import re
        m = re.search(r"<[^>]*InvoiceTypeCode[^>]*>([^<]+)<", xml_text)
        actual = m.group(1) if m else "NOT FOUND"
        print(f"  ❌ InvoiceTypeCode MISMATCH: expected={expected_type_code}, got={actual}")

    # ── Check ProfileID ──
    import re
    m = re.search(r"<[^>]*ProfileID[^>]*>([^<]+)<", xml_text)
    profile = m.group(1) if m else "NONE"
    print(f"  ℹ️  ProfileID = {profile}")

    # ── Send to BirFatura TEST API ──
    with open(xml_path, "rb") as f:
        raw_bytes = f.read()
    content_b64 = base64.b64encode(raw_bytes).decode("utf-8")

    client = BirfaturaClient(
        api_key=TEST_API_KEY,
        secret_key=TEST_SECRET_KEY,
        integration_key=TEST_INTEGRATION_KEY,
    )

    try:
        resp = client.send_document({
            "fileName": xml_filename,
            "documentBytes": content_b64,
            "systemTypeCodes": "EFATURA",
            "isDocumentNoAuto": True,
        })

        success = resp.get("Success", False)
        message = resp.get("Message", "")
        result = resp.get("Result", {})

        if success:
            inv_no = result.get("invoiceNo", "")
            print(f"  ✅ BirFatura SEND SUCCESS: invoiceNo={inv_no}")
            print(f"     Message: {message}")
            return {"status": "SUCCESS", "invoiceNo": inv_no, "test": test_name}
        else:
            print(f"  ❌ BirFatura SEND FAILED: {message}")
            # Try to extract detailed error
            if "ErrorList" in str(resp):
                print(f"     Errors: {json.dumps(resp.get('ErrorList', resp.get('Result', '')), ensure_ascii=False, indent=2)}")
            return {"status": "FAILED", "error": message, "test": test_name}

    except Exception as e:
        print(f"  ❌ BirFatura EXCEPTION: {e}")
        traceback.print_exc()
        return {"status": "ERROR", "error": str(e), "test": test_name}


def test_pdf_download(invoice_no_or_uuid):
    """Try to download PDF for a successfully sent invoice."""
    print(f"\n  📄 Attempting PDF download for: {invoice_no_or_uuid}")
    client = BirfaturaClient(
        api_key=TEST_API_KEY,
        secret_key=TEST_SECRET_KEY,
        integration_key=TEST_INTEGRATION_KEY,
    )
    try:
        # Step 1: Download XML by UUID
        dl_resp = client.document_download_by_uuid({
            "documentUUID": invoice_no_or_uuid,
            "inOutCode": "OUT",
            "systemTypeCodes": "EFATURA",
            "fileExtension": "XML",
        })
        if not dl_resp.get("Success"):
            print(f"  ⚠️  XML download failed: {dl_resp.get('Message')}")
            return False

        xml_b64 = dl_resp.get("Result", {}).get("content", "")
        if not xml_b64:
            print(f"  ⚠️  No XML content in response")
            return False

        # Step 2: Preview PDF
        pdf_resp = client.preview_document_pdf({
            "documentBytes": xml_b64,
            "systemTypeCodes": "EFATURA",
        })
        if pdf_resp.get("Success"):
            print(f"  ✅ PDF download SUCCESS")
            return True
        else:
            print(f"  ⚠️  PDF preview failed: {pdf_resp.get('Message')}")
            return False
    except Exception as e:
        print(f"  ⚠️  PDF download error: {e}")
        return False


def main():
    print("=" * 60)
    print("  FATURA TİPLERİ E2E TEST")
    print(f"  BirFatura Test API - {datetime.now().isoformat()}")
    print("=" * 60)

    results = []
    for test in TESTS:
        try:
            r = run_test(*test)
            results.append(r)
        except Exception as e:
            print(f"  💥 FATAL ERROR in {test[0]}: {e}")
            traceback.print_exc()
            results.append({"status": "ERROR", "error": str(e), "test": test[0]})

    # ── Summary ──
    print("\n" + "=" * 60)
    print("  SONUÇ TABLOSU")
    print("=" * 60)
    print(f"  {'Test':<25} {'Durum':<10} {'Detay'}")
    print(f"  {'-'*25} {'-'*10} {'-'*30}")

    success_count = 0
    for r in results:
        status = r.get("status", "UNKNOWN")
        detail = r.get("invoiceNo", r.get("error", ""))[:40]
        icon = "✅" if status == "SUCCESS" else "❌"
        print(f"  {icon} {r.get('test', '?'):<23} {status:<10} {detail}")
        if status == "SUCCESS":
            success_count += 1

    print(f"\n  Toplam: {len(results)} test, {success_count} başarılı, {len(results) - success_count} başarısız")

    # ── PDF tests for successful sends ──
    successful = [r for r in results if r.get("status") == "SUCCESS" and r.get("invoiceNo")]
    if successful:
        print(f"\n{'='*60}")
        print(f"  PDF İNDİRME TESTLERİ")
        print(f"{'='*60}")
        for r in successful[:3]:  # Test PDF for first 3 successful
            test_pdf_download(r["invoiceNo"])

    return 0 if success_count == len(results) else 1


if __name__ == "__main__":
    sys.exit(main())
