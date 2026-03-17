import os
import uuid
from datetime import datetime
from datetime import timedelta
from decimal import Decimal
from typing import Any, TYPE_CHECKING

if TYPE_CHECKING:
    from core.models.tenant import Tenant


def _str(value: Any, default: str = "") -> str:
    if value is None:
        return default
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _decimal(value: Any, default: Decimal = Decimal("0")) -> Decimal:
    try:
        if value in (None, ""):
            return default
        return Decimal(str(value))
    except Exception:
        return default


def _float(value: Any, default: float = 0.0) -> float:
    try:
        if value in (None, ""):
            return default
        return float(value)
    except Exception:
        return default


def _address_dict(raw: Any, city: str = "", district: str = "") -> dict[str, str]:
    if isinstance(raw, dict):
        street = _str(raw.get("street") or raw.get("address") or raw.get("line1"))
        return {
            "street": street,
            "district": _str(raw.get("district") or raw.get("citySubdivisionName") or district),
            "city": _str(raw.get("city") or city),
            "postalZone": _str(raw.get("postalZone") or raw.get("zipCode") or raw.get("postalCode")),
            "country": _str(raw.get("country") or "Türkiye"),
        }

    return {
        "street": _str(raw),
        "district": _str(district),
        "city": _str(city),
        "postalZone": "",
        "country": "Türkiye",
    }


def _split_name(full_name: str) -> tuple[str, str]:
    parts = [p for p in full_name.split(" ") if p]
    if not parts:
        return "", ""
    if len(parts) == 1:
        return parts[0], ""
    return parts[0], " ".join(parts[1:])


def _invoice_number(form_data: dict[str, Any], draft_id: int | None = None) -> str:
    explicit = _str(form_data.get("invoiceNumber"))
    if explicit:
        return explicit

    year = datetime.utcnow().strftime("%Y")
    numeric_suffix = f"{int(draft_id or 0):08d}"
    return f"XEAR{year}{numeric_suffix}"


def supplier_from_tenant(tenant: "Tenant") -> dict[str, Any]:
    settings = tenant.settings or {}
    invoice_settings = settings.get("invoice_integration") or {}
    company_info = tenant.company_info or {}
    company_settings = settings.get("company") or {}

    address_source = (
        company_info.get("address")
        or company_settings.get("address")
        or company_info.get("invoiceAddress")
        or ""
    )

    supplier = {
        "name": (
            _str(company_info.get("companyName"))
            or _str(company_info.get("legalName"))
            or _str(company_settings.get("name"))
            or _str(tenant.name)
        ),
        "tax_id": (
            _str(invoice_settings.get("vkn"))
            or _str(invoice_settings.get("tckn"))
            or _str(company_info.get("taxNumber"))
            or _str(company_info.get("vkn"))
            or _str(company_info.get("tckn"))
        ),
        "tax_office": (
            _str(invoice_settings.get("tax_office"))
            or _str(company_info.get("taxOffice"))
            or _str(company_settings.get("taxOffice"))
        ),
        "address": _address_dict(
            address_source,
            city=_str(company_info.get("city") or company_settings.get("city")),
            district=_str(company_info.get("district") or company_settings.get("district")),
        ),
        "phone": _str(company_info.get("phone") or company_settings.get("phone")),
        "email": _str(company_info.get("email") or tenant.billing_email or tenant.owner_email),
    }

    use_test_fallback = bool(
        os.getenv("BIRFATURA_TEST_API_KEY")
        and os.getenv("BIRFATURA_TEST_SECRET_KEY")
        and os.getenv("BIRFATURA_TEST_INTEGRATION_KEY")
    )
    if use_test_fallback and not supplier["tax_id"]:
        supplier.update({
            "name": supplier["name"] or "X-Ear Test Isitme Merkezi",
            "tax_id": "1234567801",
            "tax_office": supplier["tax_office"] or "ANKARA",
            "address": {
                "street": supplier["address"].get("street") or "Test Sokak No:1",
                "district": supplier["address"].get("district") or "Cankaya",
                "city": supplier["address"].get("city") or "ANKARA",
                "postalZone": supplier["address"].get("postalZone") or "06100",
                "country": supplier["address"].get("country") or "Turkiye",
            },
            "phone": supplier["phone"] or "03120000000",
            "email": supplier["email"] or "test@example.com",
        })

    return supplier
def _customer_name(form_data: dict[str, Any]) -> str:
    explicit = _str(form_data.get("customerName"))
    if explicit:
        return explicit
    first = _str(form_data.get("customerFirstName"))
    last = _str(form_data.get("customerLastName"))
    return " ".join(p for p in (first, last) if p).strip()


def _customer_dict(form_data: dict[str, Any]) -> dict[str, Any]:
    customer_tax_id = _str(
        form_data.get("customerTaxId")
        or form_data.get("customerTaxNumber")
        or form_data.get("customerTcNumber")
    )
    return {
        "name": _customer_name(form_data),
        "tax_id": customer_tax_id,
        "tax_office": _str(form_data.get("taxOffice")),
        "address": _address_dict(
            form_data.get("customerAddress"),
            city=_str(form_data.get("customerCity")),
            district=_str(form_data.get("customerDistrict")),
        ),
    }


def _buyer_customer(form_data: dict[str, Any], customer: dict[str, Any], scenario: str) -> dict[str, Any] | None:
    profile_details = form_data.get("profileDetails") if isinstance(form_data.get("profileDetails"), dict) else {}
    invoice_type = _str(form_data.get("invoiceType"))

    if scenario not in {"export", "medical"} and invoice_type not in {"yolcu", "hastane"}:
        return None

    tc_or_tax = _str(
        profile_details.get("patientTaxId")
        or form_data.get("customerTaxId")
        or form_data.get("customerTcNumber")
        or customer.get("tax_id")
    )
    name = (
        _str(profile_details.get("patientName") or profile_details.get("passengerName"))
        or customer.get("name")
        or _customer_name(form_data)
    )
    if not name and not tc_or_tax:
        return None

    return {
        "name": name,
        "tax_id": tc_or_tax,
        "address": customer.get("address") or {},
        "passport_no": _str(profile_details.get("passengerPassportNo")),
        "nationality": _str(profile_details.get("passengerNationality")),
    }


def _resolve_profile_and_system_type(
    invoice_type: str,
    scenario: str,
    form_data: dict[str, Any],
) -> tuple[str, str]:
    profile_details = form_data.get("profileDetails") if isinstance(form_data.get("profileDetails"), dict) else {}

    explicit_profile = _str(form_data.get("profileId") or profile_details.get("profileId"))
    explicit_system_type = _str(profile_details.get("systemType"))
    if explicit_profile and explicit_system_type:
        return explicit_profile, explicit_system_type

    if invoice_type == "earsiv":
        return explicit_profile or "EARSIVFATURA", explicit_system_type or "EARSIV"
    if invoice_type == "sevk":
        return explicit_profile or "TEMELIRSALIYE", explicit_system_type or "EIRSALIYE"
    if invoice_type == "hks":
        return explicit_profile or "HKS", explicit_system_type or "EFATURA"
    if invoice_type in {"sarj", "sarjanlik"}:
        return explicit_profile or "ENERJI", explicit_system_type or "EFATURA"
    if invoice_type == "yolcu":
        return explicit_profile or "YOLCUBERABERFATURA", explicit_system_type or "EFATURA"

    if scenario == "export":
        return explicit_profile or "IHRACAT", explicit_system_type or "EFATURA"

    if invoice_type in {"11", "12", "13", "18", "19", "24", "25", "27", "32", "33", "otv", "hastane"}:
        return explicit_profile or "TICARIFATURA", explicit_system_type or "EFATURA"

    scenario_data = form_data.get("scenarioData") if isinstance(form_data.get("scenarioData"), dict) else {}
    current_scenario_type = _str(scenario_data.get("currentScenarioType") or form_data.get("currentScenarioType"))
    basic_profile = current_scenario_type == "2"

    if invoice_type in {"14", "15", "49", "50", "35"}:
        basic_profile = True

    return explicit_profile or ("TEMELFATURA" if basic_profile else "TICARIFATURA"), explicit_system_type or "EFATURA"


def _map_line(
    line: dict[str, Any],
    default_tax_rate: float,
    invoice_type: str,
    document_withholding: dict[str, Any] | None = None,
    default_exemption_code: str = "",
) -> dict[str, Any]:
    quantity = _float(line.get("quantity"), 1.0)
    unit_price = _float(line.get("unitPrice") or line.get("price"), 0.0)
    discount = _float(line.get("discount"), 0.0)
    discount_type = _str(line.get("discountType") or "percentage")
    tax_rate = _float(line.get("taxRate"), default_tax_rate)

    if discount_type == "amount":
        discounted_price = max(unit_price - discount, 0.0)
    else:
        discounted_price = max(unit_price * (1 - (discount / 100.0)), 0.0)

    line_extension_amount = round(quantity * discounted_price, 2)
    tax_amount = round(line_extension_amount * (tax_rate / 100.0), 2)

    withholding = line.get("withholdingData") or {}
    if not withholding and isinstance(document_withholding, dict):
        withholding = document_withholding
    special_base = line.get("specialBaseData") or {}
    medical = line.get("medicalDeviceData") or {}

    mapped = {
        "description": _str(line.get("description") or line.get("name")),
        "name": _str(line.get("name") or line.get("description")),
        "quantity": quantity,
        "unit": _str(line.get("unit") or "ADET"),
        "price": unit_price,
        "unitPrice": unit_price,
        "line_extension_amount": line_extension_amount,
        "tax_rate": tax_rate,
        "tax_amount": tax_amount,
        "tax_exemption_code": _str(line.get("taxExemptionCode") or line.get("tax_exemption_code")),
        "tax_exemption_reason": _str(line.get("taxExemptionReason") or line.get("tax_exemption_reason")),
        "medical_device_data": medical or None,
    }

    if tax_rate == 0 and not mapped["tax_exemption_code"] and default_exemption_code:
        mapped["tax_exemption_code"] = default_exemption_code
        mapped["tax_exemption_reason"] = mapped["tax_exemption_reason"] or default_exemption_code

    if invoice_type in {"15", "49", "50", "9", "return", "iade"}:
        mapped["tax_rate"] = 0.0
        mapped["tax_amount"] = 0.0

    if withholding:
        mapped["withholding_rate"] = _float(
            withholding.get("rate") or withholding.get("withholdingRate")
        )
        mapped["withholding_code"] = _str(
            withholding.get("code")
            or withholding.get("withholdingCode")
            or "606"
        )

    if special_base:
        mapped["tax_exemption_code"] = mapped["tax_exemption_code"] or "806"
        mapped["tax_exemption_reason"] = mapped["tax_exemption_reason"] or _str(
            special_base.get("description") or "Özel Matrah"
        )
        if special_base.get("amount") not in (None, ""):
            mapped["line_extension_amount"] = _float(special_base.get("amount"))

    if invoice_type == "13" and not mapped["tax_exemption_code"]:
        mapped["tax_exemption_code"] = "301"

    if invoice_type == "otv":
        mapped["tax_type_code"] = "9021"
        mapped["tax_name"] = "OTV"

    return mapped


def build_invoice_dict_from_form(
    form_data: dict[str, Any],
    tenant: "Tenant",
    draft_id: int | None = None,
) -> dict[str, Any]:
    scenario = _str(form_data.get("scenario"))
    if not scenario and isinstance(form_data.get("scenarioData"), dict):
        scenario = _str(form_data["scenarioData"].get("scenario"))
    scenario = scenario or "other"

    invoice_type = _str(form_data.get("invoiceType") or "0")
    customer = _customer_dict(form_data)
    buyer_customer = _buyer_customer(form_data, customer, scenario)
    supplier = supplier_from_tenant(tenant)

    notes = _str(form_data.get("notes"))
    issue_date = _str(form_data.get("issueDate") or datetime.utcnow().strftime("%Y-%m-%d"))
    issue_time = _str(form_data.get("issueTime") or datetime.utcnow().strftime("%H:%M:%S"))

    items = form_data.get("items") if isinstance(form_data.get("items"), list) else []
    default_tax_rate = 0.0 if invoice_type in {"13", "15", "49", "50", "27"} else 20.0
    withholding_data = form_data.get("withholdingData") if isinstance(form_data.get("withholdingData"), dict) else {}
    lines = [
        _map_line(line, default_tax_rate, invoice_type, withholding_data, _str(form_data.get("governmentExemptionReason") or (tenant.company_info or {}).get("defaultExemptionCode")))
        for line in items
        if isinstance(line, dict)
    ]
    if not lines:
        lines = [_map_line({}, default_tax_rate, invoice_type, withholding_data, _str(form_data.get("governmentExemptionReason") or (tenant.company_info or {}).get("defaultExemptionCode")))]

    export_details = form_data.get("exportDetails") if isinstance(form_data.get("exportDetails"), dict) else {}
    special_tax_base = form_data.get("specialTaxBase") if isinstance(form_data.get("specialTaxBase"), dict) else {}
    return_details = form_data.get("returnInvoiceDetails") if isinstance(form_data.get("returnInvoiceDetails"), dict) else {}
    return_details = {
        **return_details,
        "returnInvoiceNumber": _str(
            return_details.get("returnInvoiceNumber")
            or form_data.get("returnReferenceNumber")
            or form_data.get("returnInvoiceNumber")
        ),
        "returnInvoiceDate": _str(
            return_details.get("returnInvoiceDate")
            or form_data.get("returnReferenceDate")
            or form_data.get("returnInvoiceDate")
            or issue_date
        ),
        "returnReason": _str(
            return_details.get("returnReason")
            or form_data.get("returnReason")
        ),
    }
    sgk_data = form_data.get("sgkData") if isinstance(form_data.get("sgkData"), dict) else {}
    medical_device_data = form_data.get("medicalDeviceData") if isinstance(form_data.get("medicalDeviceData"), dict) else {}
    profile_details = form_data.get("profileDetails") if isinstance(form_data.get("profileDetails"), dict) else {}
    order_info = form_data.get("orderInfo") if isinstance(form_data.get("orderInfo"), dict) else {}
    delivery_info = form_data.get("deliveryInfo") if isinstance(form_data.get("deliveryInfo"), dict) else {}
    shipment_info = form_data.get("shipmentInfo") if isinstance(form_data.get("shipmentInfo"), dict) else {}
    bank_info = form_data.get("bankInfo") if isinstance(form_data.get("bankInfo"), dict) else {}
    payment_terms = form_data.get("paymentTerms") if isinstance(form_data.get("paymentTerms"), dict) else {}

    profile_id, system_type = _resolve_profile_and_system_type(invoice_type, scenario, form_data)

    subtotal = sum(_decimal(line.get("line_extension_amount")) for line in lines)
    tax_amount = sum(_decimal(line.get("tax_amount")) for line in lines)
    total_amount = subtotal + tax_amount

    invoice_dict = {
        "invoiceNumber": _invoice_number(form_data, draft_id),
        "uuid": _str(form_data.get("uuid")) or str(uuid.uuid4()),
        "issueDate": issue_date,
        "createdAt": f"{issue_date}T{issue_time}",
        "issueTime": issue_time,
        "invoiceType": invoice_type,
        "scenario": scenario,
        "currency": _str(form_data.get("currency") or "TRY"),
        "exchangeRate": _float(form_data.get("exchangeRate"), 1.0),
        "supplier": supplier,
        "customer": customer,
        "buyer_customer": buyer_customer,
        "lines": lines,
        "subtotal": float(subtotal),
        "taxAmount": float(tax_amount),
        "totalAmount": float(total_amount),
        "profileId": profile_id,
        "systemType": system_type,
        "notes": [notes] if notes else [],
        "sgk_data": sgk_data,
        "return_invoice_details": return_details,
        "return_reference_number": return_details.get("returnInvoiceNumber"),
        "return_reference_date": return_details.get("returnInvoiceDate"),
        "export_details": export_details,
        "special_tax_base": special_tax_base,
        "medical_device_data": medical_device_data,
        "profile_details": profile_details,
        "withholding_data": withholding_data,
        "order_info": order_info,
        "delivery_info": delivery_info,
        "shipment_info": shipment_info,
        "bank_info": bank_info,
        "payment_terms": payment_terms,
        "tax_exemption_code": _str(form_data.get("governmentExemptionReason")),
        "_source_form_data": form_data,
    }

    if scenario == "export":
        for line in invoice_dict["lines"]:
            line["tax_exemption_code"] = ""
            line["tax_exemption_reason"] = ""
        invoice_dict["tax_exemption_code"] = ""
        invoice_dict["tax_exemption_reason"] = ""

    return_reason = _str(return_details.get("returnReason"))
    if return_reason:
        notes_list = invoice_dict.get("notes") or []
        if all(return_reason not in str(note) for note in notes_list):
            invoice_dict["notes"] = [*notes_list, return_reason]

    account_id = _str(bank_info.get("iban") or bank_info.get("accountNumber"))
    payment_days = payment_terms.get("paymentDays") if isinstance(payment_terms.get("paymentDays"), (int, float)) else None
    payment_term_text = _str(payment_terms.get("paymentTerm"))
    if account_id or payment_days is not None or payment_term_text:
        payment_means: dict[str, Any] = {"code": "1"}
        if account_id:
            payment_means["accountId"] = account_id
        if _str(bank_info.get("bankName")):
            payment_means["bankName"] = _str(bank_info.get("bankName"))
        if _str(bank_info.get("accountHolder")):
            payment_means["accountHolder"] = _str(bank_info.get("accountHolder"))
        if payment_days is not None:
            try:
                payment_means["dueDate"] = (
                    datetime.strptime(issue_date, "%Y-%m-%d") + timedelta(days=int(payment_days))
                ).strftime("%Y-%m-%d")
            except Exception:
                pass
        if _str(bank_info.get("swiftCode")):
            payment_means["channelCode"] = _str(bank_info.get("swiftCode"))
        invoice_dict["paymentMeans"] = payment_means

    if scenario == "government" and invoice_dict["tax_exemption_code"]:
        invoice_dict["tax_exemption_reason"] = invoice_dict["tax_exemption_code"]

    if not invoice_dict["tax_exemption_code"]:
        zero_tax_line = next((line for line in lines if _float(line.get("tax_rate")) == 0.0 and _str(line.get("tax_exemption_code"))), None)
        if zero_tax_line:
            invoice_dict["tax_exemption_code"] = _str(zero_tax_line.get("tax_exemption_code"))
            invoice_dict["tax_exemption_reason"] = _str(zero_tax_line.get("tax_exemption_reason") or zero_tax_line.get("tax_exemption_code"))

    if scenario == "export":
        invoice_dict["paymentMeans"] = {"code": "1"}

    if invoice_type in {"12", "19", "25", "33"}:
        invoice_dict["tax_exemption_code"] = "806"
        invoice_dict["tax_exemption_reason"] = _str(special_tax_base.get("description") or "Özel Matrah")

    if invoice_type == "yolcu":
        invoice_dict["tax_exemption_code"] = invoice_dict.get("tax_exemption_code") or "501"
        invoice_dict["tax_exemption_reason"] = invoice_dict.get("tax_exemption_reason") or "Yolcu beraberi esya ihraci"

    if invoice_type == "otv":
        invoice_dict["tax_type_code"] = _str(profile_details.get("otvCode") or "9021")
        invoice_dict["tax_name"] = "OTV"

    if invoice_type == "hks":
        invoice_dict["invoicePeriod"] = {
            "start": _str(profile_details.get("accommodationStartDate")),
            "end": _str(profile_details.get("accommodationEndDate")),
        }

    if invoice_type in {"sarj", "sarjanlik"}:
        invoice_dict["invoicePeriod"] = {
            "start": _str(profile_details.get("chargeStartDate")),
            "end": _str(profile_details.get("chargeEndDate")),
        }

    if invoice_type == "14":
        invoice_dict["currency"] = "TRY"

    if invoice_type in {"15", "49", "50", "9", "return", "iade"}:
        invoice_dict["taxAmount"] = 0.0
        invoice_dict["totalAmount"] = float(subtotal)

    return invoice_dict


def build_sgk_invoice_data(invoice_dict: dict[str, Any]) -> dict[str, Any]:
    sgk = invoice_dict.get("sgk_data") or {}
    supplier = invoice_dict.get("supplier") or {}

    return {
        "invoice_number": invoice_dict.get("invoiceNumber"),
        "uuid": invoice_dict.get("uuid"),
        "issue_date": invoice_dict.get("issueDate") or datetime.utcnow().strftime("%Y-%m-%d"),
        "issue_time": invoice_dict.get("issueTime") or datetime.utcnow().strftime("%H:%M:%S"),
        "dosya_no": _str(sgk.get("dosyaNo") or sgk.get("dosya_no")),
        "mukellef_kodu": _str(sgk.get("mukellefKodu") or sgk.get("mukellef_kodu")),
        "mukellef_adi": _str(sgk.get("mukellefAdi") or sgk.get("mukellef_adi")),
        "period_start": _str(sgk.get("periodStartDate") or sgk.get("period_start")) or datetime.utcnow().strftime("%Y-%m-%d"),
        "period_end": _str(sgk.get("periodEndDate") or sgk.get("period_end")) or datetime.utcnow().strftime("%Y-%m-%d"),
        "supplier": supplier,
        "kpv10_amount": _float(sgk.get("kpv10Amount")),
        "kpv20_amount": _float(sgk.get("kpv20Amount")),
        "tahsil_edilen_kp": _float(sgk.get("tahsilEdilenKp")),
        "notes": invoice_dict.get("notes") or [],
    }
