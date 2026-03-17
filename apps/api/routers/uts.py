"""UTS (Urun Takip Sistemi) integration router."""
from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
import os
from typing import Optional
import uuid

import requests
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified

from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from core.models.inventory import InventoryItem
from models.tenant import Tenant
from schemas.base import ResponseEnvelope
from schemas.uts import (
    BulkRegistration,
    UtsMessageTemplate,
    UtsAddToInventoryRequest,
    UtsAddToInventoryResponse,
    UtsAlmaBekleyenlerSyncResponse,
    UtsAlmaRequest,
    UtsCancelResponse,
    UtsConfigRead,
    UtsConfigUpdate,
    UtsConnectionTestResult,
    UtsJobStartResponse,
    UtsJobStatusResponse,
    UtsMovementExecuteResponse,
    UtsTekilUrunQueryRequest,
    UtsTekilUrunQueryResponse,
    UtsTekilUrunRecord,
    UtsRegistrationListResponse,
    UtsSerialState,
    UtsSerialStateListResponse,
    UtsSerialStateUpsertRequest,
    UtsSyncStatus,
    UtsVermeDraftRequest,
    UtsVermeDraftResponse,
)

logger = logging.getLogger(__name__)

from middleware.require_module import require_module
from fastapi import Depends as _Depends

router = APIRouter(prefix="/api/uts", tags=["UTS"], dependencies=[_Depends(require_module("uts"))])

UTS_DOCS_URL = "https://uts.saglik.gov.tr/wp-content/uploads/UTS-PRJ-TakipVeIzlemeWebServisTanimlariDokumani.pdf"
UTS_TEST_BASE_URL = "https://utstest.saglik.gov.tr/UTS"
UTS_PROD_BASE_URL = "https://utsuygulama.saglik.gov.tr/UTS"
UTS_TEST_PROBE_PATH = "/uh/rest/bildirim/uretim/ekle"
UTS_TEKIL_URUN_QUERY_PATH = "/uh/rest/tekilUrun/sorgula"
UTS_VERME_PATH = "/uh/rest/bildirim/verme/ekle"
UTS_ALMA_PATH = "/uh/rest/bildirim/alma/ekle"
TOKEN_MASK = "********"
PUBLIC_IP_SERVICES = (
    "https://api.ipify.org",
    "https://ifconfig.me/ip",
)


def _require_tenant(access: UnifiedAccess) -> str:
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    return access.tenant_id


def _require_admin(access: UnifiedAccess) -> None:
    role = getattr(access.user, "role", None)
    is_impersonating = bool(getattr(access, "is_impersonating", False))
    if role not in {"admin", "tenant_admin"} and not is_impersonating:
        raise HTTPException(status_code=403, detail="Admin permissions required")


def _build_base_url(environment: str, base_url_override: Optional[str] = None) -> str:
    if base_url_override:
        return base_url_override.rstrip("/")
    if environment == "prod":
        return UTS_PROD_BASE_URL
    return UTS_TEST_BASE_URL


def _probe_url(base_url: str) -> str:
    return f"{base_url}{UTS_TEST_PROBE_PATH}"


def _mask_token(token: str | None) -> str:
    if not token:
        return ""
    if len(token) <= 8:
        return TOKEN_MASK
    return f"{token[:4]}{TOKEN_MASK}{token[-4:]}"


def _get_effective_token(settings: dict) -> str:
    token = (settings.get("token") or "").strip()
    if token:
        return token

    environment = settings.get("environment") or "test"
    env_var = "UTS_PROD_TOKEN" if environment == "prod" else "UTS_TEST_TOKEN"
    return (os.getenv(env_var) or "").strip()


def _get_tenant(db: Session, tenant_id: str) -> Tenant:
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return tenant


def _get_raw_uts_settings(tenant: Tenant) -> dict:
    settings = tenant.settings or {}
    uts_settings = settings.get("uts_integration") or {}
    if not isinstance(uts_settings, dict):
        return {}
    return uts_settings


def _get_serial_states(settings: dict) -> dict[str, dict]:
    serial_states = settings.get("serial_states") or {}
    if not isinstance(serial_states, dict):
        return {}
    return serial_states


def _get_company_info_value(tenant: Tenant, *keys: str) -> Optional[str]:
    company_info = tenant.company_info or {}
    if not isinstance(company_info, dict):
        return None
    for key in keys:
        value = company_info.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _serialize_uts_config(tenant: Tenant) -> UtsConfigRead:
    settings = _get_raw_uts_settings(tenant)
    environment = settings.get("environment") or "test"
    base_url = _build_base_url(environment, settings.get("base_url_override"))
    token = _get_effective_token(settings)
    company_code = (settings.get("company_code") or "").strip() or None
    member_number = (settings.get("member_number") or "").strip() or None
    company_code_source = "manual" if company_code else None
    member_number_source = "manual" if member_number else None

    if not company_code:
        company_code = _get_company_info_value(tenant, "firma_no", "company_code", "firm_no")
        if company_code:
            company_code_source = "tenant_company_info"

    if not member_number:
        member_number = _get_company_info_value(tenant, "kurum_no", "member_number", "institution_number")
        if member_number:
            member_number_source = "tenant_company_info"

    last_test_raw = settings.get("last_test")
    last_test = None
    if isinstance(last_test_raw, dict) and last_test_raw:
        try:
            last_test = UtsConnectionTestResult.model_validate(last_test_raw)
        except Exception:
            last_test = None
    raw_templates = settings.get("notification_templates") or {}
    notification_templates = {}
    if isinstance(raw_templates, dict):
        for key, raw_value in raw_templates.items():
            if not isinstance(raw_value, dict):
                continue
            try:
                notification_templates[key] = UtsMessageTemplate.model_validate(raw_value)
            except Exception:
                continue
    public_ip = settings.get("public_ip")
    public_ip_detected_at_raw = settings.get("public_ip_detected_at")
    public_ip_detected_at = None
    if public_ip_detected_at_raw:
        try:
            public_ip_detected_at = datetime.fromisoformat(public_ip_detected_at_raw)
        except Exception:
            public_ip_detected_at = None
    last_sync_raw = settings.get("last_sync") or {}
    last_sync_at = None
    if last_sync_raw.get("synced_at"):
        try:
            last_sync_at = datetime.fromisoformat(last_sync_raw["synced_at"])
        except Exception:
            last_sync_at = None
    from services.uts_sync_scheduler import get_scheduler_interval_minutes

    return UtsConfigRead(
        enabled=bool(settings.get("enabled", False)),
        environment=environment,
        auth_scheme=settings.get("auth_scheme") or "uts_token",
        base_url=base_url,
        token_configured=bool(token),
        token_masked=_mask_token(token),
        company_code=company_code,
        company_code_source=company_code_source,
        member_number=member_number,
        member_number_source=member_number_source,
        identity_discovery_supported=False,
        identity_discovery_status="tenant_company_info_fallback",
        auto_send_notifications=bool(settings.get("auto_send_notifications", False)),
        notification_mode=settings.get("notification_mode") or "outbox",
        auto_add_to_inventory_on_alma=bool(settings.get("auto_add_to_inventory_on_alma", False)),
        auto_decrease_stock_on_verme=bool(settings.get("auto_decrease_stock_on_verme", False)),
        documentation_url=UTS_DOCS_URL,
        test_endpoint_url=_probe_url(base_url),
        last_test=last_test,
        public_ip=public_ip,
        public_ip_detected_at=public_ip_detected_at,
        token_setup_steps=[
            "UTS ortaminda ilgili firma hesabi ile giris yap.",
            "Sistem token olustur ve bu ekrana yapistir.",
            "Asagidaki public IP'yi UTS sistem token izinli IP listesine ekle.",
            "Baglantiyi test et. 400 validation hatasi auth'in gectigini gosterir.",
        ],
        notification_templates=notification_templates,
        sync=UtsSyncStatus(
            enabled=bool(settings.get("enabled", False) and token),
            intervalMinutes=get_scheduler_interval_minutes(),
            lastSyncAt=last_sync_at,
            lastSyncMessage=last_sync_raw.get("message"),
            lastSyncOk=last_sync_raw.get("ok"),
            syncedRecords=int(last_sync_raw.get("synced_records") or 0),
        ),
    )


def _persist_uts_settings(tenant: Tenant, payload: UtsConfigUpdate) -> None:
    settings = tenant.settings or {}
    uts_settings = _get_raw_uts_settings(tenant)

    incoming_token = (payload.token or "").strip()
    if incoming_token and incoming_token != TOKEN_MASK and "****" not in incoming_token:
        uts_settings["token"] = incoming_token
    elif payload.token == "":
        uts_settings["token"] = ""

    uts_settings.update(
        {
            "enabled": payload.enabled,
            "environment": payload.environment,
            "auth_scheme": payload.auth_scheme,
            "company_code": (payload.company_code or "").strip() or None,
            "member_number": (payload.member_number or "").strip() or None,
            "auto_send_notifications": payload.auto_send_notifications,
            "notification_mode": payload.notification_mode,
            "auto_add_to_inventory_on_alma": payload.auto_add_to_inventory_on_alma,
            "auto_decrease_stock_on_verme": payload.auto_decrease_stock_on_verme,
            "base_url_override": (payload.base_url_override or "").strip() or None,
            "notification_templates": {
                key: value.model_dump(mode="json", by_alias=True)
                for key, value in payload.notification_templates.items()
            },
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
    )

    settings["uts_integration"] = uts_settings
    tenant.settings = settings
    flag_modified(tenant, "settings")


def _serial_state_key(product_number: Optional[str], serial_number: Optional[str], lot_batch_number: Optional[str]) -> str:
    return "::".join([
        (product_number or "").strip(),
        (serial_number or "").strip(),
        (lot_batch_number or "").strip(),
    ])


def _extract_movement_id(response_payload: dict | None) -> Optional[str]:
    if not isinstance(response_payload, dict):
        return None
    movement_id = response_payload.get("SNC")
    if isinstance(movement_id, str) and movement_id.strip():
        return movement_id.strip()
    messages = response_payload.get("MSJ")
    if isinstance(messages, list):
        for item in messages:
            if not isinstance(item, dict):
                continue
            params = item.get("MPA")
            if isinstance(params, list):
                for param in params:
                    if isinstance(param, str) and param.strip():
                        return param.strip()
    return None


def _extract_first_message(response_payload: dict | None, fallback: str) -> str:
    if isinstance(response_payload, dict):
        messages = response_payload.get("MSJ")
        if isinstance(messages, list):
            for item in messages:
                if isinstance(item, dict) and item.get("MET"):
                    return str(item["MET"])
    return fallback


def _load_inventory_serial_states(db: Session, tenant_id: str, serial_states: dict[str, dict]) -> list[UtsSerialState]:
    records: list[UtsSerialState] = []
    inventory_items = db.query(InventoryItem).filter(
        InventoryItem.tenant_id == tenant_id,
    ).all()
    inventory_lookup: dict[str, InventoryItem] = {}

    for item in inventory_items:
        raw_serials = json.loads(item.available_serials) if item.available_serials else []
        if not isinstance(raw_serials, list):
            continue
        for serial in raw_serials:
            if not isinstance(serial, str) or not serial.strip():
                continue
            serial_key = _serial_state_key(item.barcode, serial, None)
            inventory_lookup[serial_key] = item

    # Build secondary lookups for barcode/name fallback
    _barcode_lookup: dict[str, InventoryItem] = {}
    _name_lookup: dict[str, InventoryItem] = {}
    for item in inventory_items:
        if item.barcode and item.barcode.strip():
            for candidate in _product_number_candidates(item.barcode):
                if candidate not in _barcode_lookup:
                    _barcode_lookup[candidate] = item
        if item.name and item.name.strip():
            if item.name.strip() not in _name_lookup:
                _name_lookup[item.name.strip()] = item

    seen_keys: set[str] = set()

    for serial_key, raw_state in serial_states.items():
        if not isinstance(raw_state, dict):
            continue
        seen_keys.add(serial_key)
        item = inventory_lookup.get(serial_key)
        # Fallback: match by barcode candidates then by product name
        if item is None and not raw_state.get("inventory_id"):
            pn = raw_state.get("product_number")
            if pn:
                for candidate in _product_number_candidates(pn):
                    item = _barcode_lookup.get(candidate)
                    if item:
                        break
            if item is None:
                pname = raw_state.get("product_name")
                if pname and pname.strip():
                    item = _name_lookup.get(pname.strip())
        try:
            records.append(UtsSerialState.model_validate({
                "serialKey": serial_key,
                "status": raw_state.get("status") or "not_owned",
                "inventoryId": raw_state.get("inventory_id") or (item.id if item else None),
                "inventoryName": raw_state.get("inventory_name") or (item.name if item else None),
                "productName": raw_state.get("product_name") or ((f"{item.brand or ''} {item.model or ''}".strip() or item.name) if item else None),
                "productNumber": raw_state.get("product_number") or (item.barcode if item else None),
                "serialNumber": raw_state.get("serial_number") or (serial_key.split("::")[1] if "::" in serial_key else None),
                "lotBatchNumber": raw_state.get("lot_batch_number"),
                "supplierName": raw_state.get("supplier_name") or (item.supplier if item else None),
                "supplierId": raw_state.get("supplier_id"),
                "institutionNumber": raw_state.get("institution_number"),
                "documentNumber": raw_state.get("document_number"),
                "lastMovementType": raw_state.get("last_movement_type"),
                "lastMovementId": raw_state.get("last_movement_id"),
                "lastMessage": raw_state.get("last_message"),
                "lastMovementAt": raw_state.get("last_movement_at"),
                "updatedAt": raw_state.get("updated_at"),
                "rawResponse": raw_state.get("raw_response"),
            }))
        except Exception:
            continue

    # Auto-discover inventory serials not yet in serial_states
    for serial_key, item in inventory_lookup.items():
        if serial_key in seen_keys:
            continue
        try:
            records.append(UtsSerialState.model_validate({
                "serialKey": serial_key,
                "status": "not_owned",
                "inventoryId": item.id,
                "inventoryName": item.name,
                "productName": (f"{item.brand or ''} {item.model or ''}".strip() or item.name),
                "productNumber": item.barcode,
                "serialNumber": serial_key.split("::")[1] if "::" in serial_key else None,
                "lotBatchNumber": None,
                "supplierName": item.supplier,
                "supplierId": None,
                "institutionNumber": None,
                "documentNumber": None,
                "lastMovementType": None,
                "lastMovementId": None,
                "lastMessage": None,
                "lastMovementAt": None,
                "updatedAt": None,
                "rawResponse": None,
            }))
        except Exception:
            continue

    records.sort(
        key=lambda item: (
            item.status != "pending_receipt",
            item.inventory_name or "",
            item.serial_number or "",
        )
    )
    return records


def _find_inventory_match(db: Session, tenant_id: str, product_name: Optional[str], product_number: Optional[str]) -> Optional[InventoryItem]:
    """Find an existing inventory item by barcode or name match."""
    if product_number:
        for candidate in _product_number_candidates(product_number):
            item = db.query(InventoryItem).filter(
                InventoryItem.tenant_id == tenant_id,
                InventoryItem.barcode == candidate,
            ).first()
            if item:
                return item
    if product_name and product_name.strip():
        name_q = product_name.strip()
        item = db.query(InventoryItem).filter(
            InventoryItem.tenant_id == tenant_id,
            InventoryItem.name == name_q,
        ).first()
        if item:
            return item
    return None


def _sync_inventory_on_alma(
    db: Session,
    tenant_id: str,
    *,
    product_number: Optional[str],
    serial_number: Optional[str],
    product_name: Optional[str],
    supplier_name: Optional[str],
    brand: Optional[str] = None,
    model: Optional[str] = None,
) -> dict:
    """Add serial to inventory after successful alma. Returns info dict."""
    import json
    from datetime import datetime as dt
    from uuid import uuid4
    from services.stock_service import create_stock_movement

    result = {"inventory_id": None, "created": False, "serial_added": False, "stock_updated": False, "barcode_updated": False}
    item = _find_inventory_match(db, tenant_id, product_name, product_number)

    if item is None:
        item_id = f"item_{dt.now(timezone.utc).strftime('%d%m%Y%H%M%S')}_{uuid4().hex[:6]}"
        item = InventoryItem(
            id=item_id,
            tenant_id=tenant_id,
            name=product_name or product_number or "UTS Alma",
            brand=brand or None,
            model=model or None,
            barcode=product_number or None,
            category="hearing_aid",
            available_inventory=1,
            total_inventory=1,
            used_inventory=0,
            supplier=supplier_name,
        )
        if serial_number:
            item.available_serials = json.dumps([serial_number])
        db.add(item)
        create_stock_movement(
            inventory_id=item.id,
            movement_type="uts_alma",
            quantity=1,
            tenant_id=tenant_id,
            serial_number=serial_number,
            session=db,
        )
        result.update(inventory_id=item.id, created=True, serial_added=bool(serial_number), stock_updated=True)
        return result

    # Existing item found
    result["inventory_id"] = item.id

    # Update barcode if missing
    if product_number and not item.barcode:
        item.barcode = product_number
        result["barcode_updated"] = True

    # Update brand/model if missing
    if brand and not item.brand:
        item.brand = brand
    if model and not item.model:
        item.model = model

    # Add serial if not already present
    if serial_number:
        added = item.add_serial_number(serial_number)
        if added:
            result["serial_added"] = True

    # Increase stock
    item.available_inventory = (item.available_inventory or 0) + 1
    item.total_inventory = (item.total_inventory or 0) + 1
    result["stock_updated"] = True

    create_stock_movement(
        inventory_id=item.id,
        movement_type="uts_alma",
        quantity=1,
        tenant_id=tenant_id,
        serial_number=serial_number,
        session=db,
    )

    return result


def _sync_inventory_on_verme(
    db: Session,
    tenant_id: str,
    *,
    product_number: Optional[str],
    serial_number: Optional[str],
    product_name: Optional[str],
    inventory_id: Optional[str],
) -> bool:
    """Decrease stock and remove serial after successful verme. Returns True if updated."""
    from services.stock_service import create_stock_movement

    item: Optional[InventoryItem] = None
    if inventory_id:
        item = db.query(InventoryItem).filter(
            InventoryItem.id == inventory_id,
            InventoryItem.tenant_id == tenant_id,
        ).first()
    if not item:
        item = _find_inventory_match(db, tenant_id, product_name, product_number)
    if not item:
        return False

    if serial_number:
        item.remove_serial_number(serial_number)

    if (item.available_inventory or 0) > 0:
        item.available_inventory = (item.available_inventory or 0) - 1

    create_stock_movement(
        inventory_id=item.id,
        movement_type="uts_verme",
        quantity=-1,
        tenant_id=tenant_id,
        serial_number=serial_number,
        session=db,
    )
    return True


def _upsert_serial_state(
    tenant: Tenant,
    *,
    status: str,
    inventory_id: Optional[str] = None,
    inventory_name: Optional[str] = None,
    product_name: Optional[str] = None,
    product_number: Optional[str] = None,
    serial_number: Optional[str] = None,
    lot_batch_number: Optional[str] = None,
    supplier_name: Optional[str] = None,
    supplier_id: Optional[str] = None,
    institution_number: Optional[str] = None,
    document_number: Optional[str] = None,
    last_movement_type: Optional[str] = None,
    last_movement_id: Optional[str] = None,
    last_message: Optional[str] = None,
    raw_response: Optional[str] = None,
) -> UtsSerialState:
    settings = tenant.settings or {}
    uts_settings = _get_raw_uts_settings(tenant)
    serial_states = _get_serial_states(uts_settings)
    serial_key = _serial_state_key(product_number, serial_number, lot_batch_number)
    now_iso = datetime.now(timezone.utc).isoformat()
    serial_states[serial_key] = {
        "status": status,
        "inventory_id": inventory_id,
        "inventory_name": inventory_name,
        "product_name": product_name,
        "product_number": product_number,
        "serial_number": serial_number,
        "lot_batch_number": lot_batch_number,
        "supplier_name": supplier_name,
        "supplier_id": supplier_id,
        "institution_number": institution_number,
        "document_number": document_number,
        "last_movement_type": last_movement_type,
        "last_movement_id": last_movement_id,
        "last_message": last_message,
        "last_movement_at": now_iso if last_movement_type else None,
        "updated_at": now_iso,
        "raw_response": raw_response,
    }
    uts_settings["serial_states"] = serial_states
    settings["uts_integration"] = uts_settings
    tenant.settings = settings
    flag_modified(tenant, "settings")
    return UtsSerialState.model_validate({
        "serialKey": serial_key,
        "status": status,
        "inventoryId": inventory_id,
        "inventoryName": inventory_name,
        "productName": product_name,
        "productNumber": product_number,
        "serialNumber": serial_number,
        "lotBatchNumber": lot_batch_number,
        "supplierName": supplier_name,
        "supplierId": supplier_id,
        "institutionNumber": institution_number,
        "documentNumber": document_number,
        "lastMovementType": last_movement_type,
        "lastMovementId": last_movement_id,
        "lastMessage": last_message,
        "lastMovementAt": now_iso if last_movement_type else None,
        "updatedAt": now_iso,
        "rawResponse": raw_response,
    })


def _build_headers(auth_scheme: str, token: str) -> list[tuple[str, dict[str, str]]]:
    if auth_scheme == "bearer":
        return [("bearer", {"Authorization": f"Bearer {token}"})]
    if auth_scheme == "plain_authorization":
        return [("plain_authorization", {"Authorization": token})]
    if auth_scheme == "uts_token":
        return [("uts_token", {"utsToken": token})]
    if auth_scheme == "x_uts_token":
        return [("x_uts_token", {"X-UTS-Token": token})]
    if auth_scheme == "token":
        return [("token", {"token": token})]
    return [
        ("uts_token", {"utsToken": token}),
        ("bearer", {"Authorization": f"Bearer {token}"}),
        ("plain_authorization", {"Authorization": token}),
        ("x_uts_token", {"X-UTS-Token": token}),
        ("token", {"token": token}),
    ]


def _build_primary_headers(auth_scheme: str, token: str) -> dict[str, str]:
    return _build_headers(auth_scheme, token)[0][1]


def _post_uts_form(base_url: str, path: str, auth_scheme: str, token: str, data: dict[str, str]) -> requests.Response:
    headers = _build_primary_headers(auth_scheme, token)
    return requests.post(
        f"{base_url}{path}",
        headers=headers,
        data=data,
        timeout=20,
        allow_redirects=True,
    )


def _post_uts_json(base_url: str, path: str, auth_scheme: str, token: str, data: dict) -> requests.Response:
    headers = {**_build_primary_headers(auth_scheme, token), "Content-Type": "application/json"}
    return requests.post(
        f"{base_url}{path}",
        headers=headers,
        json=data,
        timeout=20,
        allow_redirects=True,
    )


def _product_number_candidates(product_number: str) -> list[str]:
    normalized = product_number.strip()
    if not normalized:
        return []
    candidates = [normalized]
    if normalized.isdigit() and not normalized.startswith("0"):
        candidates.append(f"0{normalized}")
    return list(dict.fromkeys(candidates))


def _parse_tekil_urun_item(item: dict) -> UtsTekilUrunRecord:
    quantity = item.get("ADT") or item.get("quantity")
    available_quantity = item.get("KLT") or item.get("availableQuantity")
    return UtsTekilUrunRecord(
        productNumber=str(item.get("UNO") or item.get("productNumber") or ""),
        serialNumber=item.get("SNO") or item.get("serialNumber"),
        lotBatchNumber=item.get("LNO") or item.get("lotBatchNumber"),
        quantity=int(quantity) if isinstance(quantity, (int, float, str)) and str(quantity).isdigit() else None,
        availableQuantity=int(available_quantity) if isinstance(available_quantity, (int, float, str)) and str(available_quantity).isdigit() else None,
        productName=item.get("UBT") or item.get("productName") or item.get("urunTanimi"),
        manufactureDate=item.get("URT") or item.get("manufactureDate"),
        importDate=item.get("ITH") or item.get("importDate"),
        expiryDate=item.get("SKT") or item.get("expiryDate"),
        ownerInstitutionNumber=str(item.get("KUN")) if item.get("KUN") is not None else None,
        manufacturerInstitutionNumber=str(item.get("UIK")) if item.get("UIK") is not None else None,
        raw=item,
    )


def _run_probe(base_url: str, auth_scheme: str, token: str) -> UtsConnectionTestResult:
    tested_at = datetime.now(timezone.utc)
    url = _probe_url(base_url)
    attempts = _build_headers(auth_scheme, token)
    best_result: Optional[UtsConnectionTestResult] = None

    for scheme_used, headers in attempts:
        try:
            response = requests.post(
                url,
                headers={**headers, "Content-Type": "application/json"},
                json={},
                timeout=20,
                allow_redirects=True,
            )
            body_text = (response.text or "").strip()
            compact_body = body_text[:500] if body_text else None

            if "NOT_A_VALID_TOKEN_ERROR" in body_text:
                best_result = UtsConnectionTestResult(
                    ok=False,
                    http_status=response.status_code,
                    message="UTS token gecersiz veya beklenen header ile gonderilmedi.",
                    token_valid=False,
                    tested_url=url,
                    tested_at=tested_at,
                    auth_scheme_used=scheme_used,
                    raw_error_code="NOT_A_VALID_TOKEN_ERROR",
                    raw_response=compact_body,
                )
                continue

            if response.status_code in {200, 201, 202, 204, 400, 404, 405, 415}:
                return UtsConnectionTestResult(
                    ok=True,
                    http_status=response.status_code,
                    message="UTS endpoint token ile ulasilabildi. Sonraki adim gercek bildirim payload'larini baglamak.",
                    token_valid=True,
                    tested_url=url,
                    tested_at=tested_at,
                    auth_scheme_used=scheme_used,
                    raw_response=compact_body,
                )

            best_result = UtsConnectionTestResult(
                ok=False,
                http_status=response.status_code,
                message=f"UTS endpoint beklenmeyen HTTP {response.status_code} dondu.",
                token_valid=None,
                tested_url=url,
                tested_at=tested_at,
                auth_scheme_used=scheme_used,
                raw_response=compact_body,
            )
        except requests.RequestException as exc:
            best_result = UtsConnectionTestResult(
                ok=False,
                http_status=None,
                message=f"UTS baglanti testi basarisiz: {exc}",
                token_valid=None,
                tested_url=url,
                tested_at=tested_at,
                auth_scheme_used=scheme_used,
                raw_response=str(exc),
            )

    if best_result:
        return best_result

    return UtsConnectionTestResult(
        ok=False,
        http_status=None,
        message="UTS baglanti testi tamamlanamadi.",
        token_valid=None,
        tested_url=url,
        tested_at=tested_at,
    )


def _detect_public_ip() -> Optional[str]:
    for service_url in PUBLIC_IP_SERVICES:
        try:
            response = requests.get(service_url, timeout=10)
            candidate = (response.text or "").strip()
            if response.ok and candidate:
                return candidate
        except requests.RequestException:
            continue
    return None


@router.get("/config", operation_id="getUtsConfig", response_model=ResponseEnvelope[UtsConfigRead])
def get_uts_config(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    tenant = _get_tenant(db, tenant_id)
    all_settings = tenant.settings or {}
    uts_settings = _get_raw_uts_settings(tenant)
    if not uts_settings.get("public_ip"):
        detected_ip = _detect_public_ip()
        if detected_ip:
            uts_settings["public_ip"] = detected_ip
            uts_settings["public_ip_detected_at"] = datetime.now(timezone.utc).isoformat()
            all_settings["uts_integration"] = uts_settings
            tenant.settings = all_settings
            flag_modified(tenant, "settings")
            db.commit()
            db.refresh(tenant)
    return ResponseEnvelope(data=_serialize_uts_config(tenant))


@router.put("/config", operation_id="updateUtsConfig", response_model=ResponseEnvelope[UtsConfigRead])
def update_uts_config(
    payload: UtsConfigUpdate,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    _require_admin(access)
    tenant = _get_tenant(db, tenant_id)

    _persist_uts_settings(tenant, payload)
    db.commit()
    db.refresh(tenant)

    return ResponseEnvelope(data=_serialize_uts_config(tenant), message="UTS ayarlari kaydedildi")


@router.post("/config/test", operation_id="testUtsConfig", response_model=ResponseEnvelope[UtsConnectionTestResult])
def test_uts_config(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    _require_admin(access)
    tenant = _get_tenant(db, tenant_id)
    settings = _get_raw_uts_settings(tenant)
    token = _get_effective_token(settings)

    if not token:
        raise HTTPException(status_code=400, detail="UTS token kaydedilmeden test calistirilamaz")

    environment = settings.get("environment") or "test"
    base_url = _build_base_url(environment, settings.get("base_url_override"))
    auth_scheme = settings.get("auth_scheme") or "uts_token"

    result = _run_probe(base_url, auth_scheme, token)

    all_settings = tenant.settings or {}
    uts_settings = _get_raw_uts_settings(tenant)
    uts_settings["last_test"] = result.model_dump(mode="json", by_alias=True)
    all_settings["uts_integration"] = uts_settings
    tenant.settings = all_settings
    flag_modified(tenant, "settings")
    db.commit()

    if not result.ok:
        logger.warning("UTS connection test failed for tenant %s: %s", tenant_id, result.message)

    return ResponseEnvelope(data=result, message=result.message)


@router.post("/sync/run", operation_id="runUtsSync", response_model=ResponseEnvelope[UtsSyncStatus])
def run_uts_sync(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    _require_admin(access)
    tenant = _get_tenant(db, tenant_id)
    from services.uts_sync_scheduler import _sync_tenant_states, get_scheduler_interval_minutes

    synced = _sync_tenant_states(db, tenant)
    db.refresh(tenant)
    settings = _get_raw_uts_settings(tenant)
    last_sync_raw = settings.get("last_sync") or {}
    synced_at = None
    if last_sync_raw.get("synced_at"):
        try:
            synced_at = datetime.fromisoformat(last_sync_raw["synced_at"])
        except Exception:
            synced_at = None
    status = UtsSyncStatus(
        enabled=bool(settings.get("enabled", False) and _get_effective_token(settings)),
        intervalMinutes=get_scheduler_interval_minutes(),
        lastSyncAt=synced_at,
        lastSyncMessage=last_sync_raw.get("message") or f"{synced} seri kaydi senkronize edildi",
        lastSyncOk=last_sync_raw.get("ok"),
        syncedRecords=int(last_sync_raw.get("synced_records") or synced),
    )
    return ResponseEnvelope(data=status, message=status.last_sync_message or "UTS sync tamamlandi")


@router.post("/sync/alma-bekleyenler", operation_id="syncUtsAlmaBekleyenler", response_model=ResponseEnvelope[UtsAlmaBekleyenlerSyncResponse])
def sync_alma_bekleyenler(
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Sync pending receipt items by querying UTS for their current status."""
    tenant_id = _require_tenant(access)
    _require_admin(access)
    tenant = _get_tenant(db, tenant_id)
    settings = _get_raw_uts_settings(tenant)
    token = _get_effective_token(settings)
    if not token:
        raise HTTPException(status_code=400, detail="UTS token ayarlanmamis")

    base_url = _build_base_url(settings.get("environment") or "test", settings.get("base_url_override"))
    auth_scheme = settings.get("auth_scheme") or "uts_token"
    serial_states = _get_serial_states(settings)
    now_iso = datetime.now(timezone.utc).isoformat()

    pending_keys = [
        k for k, v in serial_states.items()
        if isinstance(v, dict) and v.get("status") == "pending_receipt"
    ]
    synced = 0
    for serial_key in pending_keys:
        raw_state = serial_states[serial_key]
        product_number = (raw_state.get("product_number") or "").strip()
        serial_number = (raw_state.get("serial_number") or "").strip()
        lot_batch_number = (raw_state.get("lot_batch_number") or "").strip()
        if not product_number or (not serial_number and not lot_batch_number):
            continue

        json_data = {"UNO": product_number}
        if serial_number:
            json_data["SNO"] = serial_number
        if lot_batch_number:
            json_data["LNO"] = lot_batch_number
        try:
            response = _post_uts_json(base_url, UTS_TEKIL_URUN_QUERY_PATH, auth_scheme, token, json_data)
        except Exception as exc:
            logger.warning("[uts-alma-sync] query failed for %s: %s", serial_key, exc)
            continue

        body_text = (response.text or "").strip()
        try:
            payload = response.json()
        except ValueError:
            payload = {"rawText": body_text[:1000]}

        records = []
        if isinstance(payload, dict) and isinstance(payload.get("SNC"), list):
            records = [item for item in payload["SNC"] if isinstance(item, dict)]

        if records:
            raw_state["status"] = "owned"
            raw_state["last_movement_type"] = "sync"
        else:
            raw_state["last_movement_type"] = "sync"
        raw_state["last_message"] = _extract_first_message(
            payload if isinstance(payload, dict) else None,
            "Alma bekleyen senkronize edildi",
        )
        raw_state["raw_response"] = body_text[:4000] if body_text else None
        raw_state["updated_at"] = now_iso
        synced += 1

    settings["serial_states"] = serial_states
    tenant_settings = tenant.settings or {}
    tenant_settings["uts_integration"] = settings
    tenant.settings = tenant_settings
    flag_modified(tenant, "settings")
    db.commit()

    result = UtsAlmaBekleyenlerSyncResponse(
        success=True,
        synced=synced,
        total=len(pending_keys),
        message=f"{synced}/{len(pending_keys)} alma bekleyen kayit senkronize edildi",
    )
    return ResponseEnvelope(data=result, message=result.message)


@router.post("/query/tekil-urun", operation_id="queryUtsTekilUrun", response_model=ResponseEnvelope[UtsTekilUrunQueryResponse])
def query_tekil_urun(
    payload: UtsTekilUrunQueryRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    tenant = _get_tenant(db, tenant_id)
    settings = _get_raw_uts_settings(tenant)
    token = _get_effective_token(settings)
    if not token:
        raise HTTPException(status_code=400, detail="UTS token kaydedilmeden sorgu calistirilamaz")

    environment = settings.get("environment") or "test"
    base_url = _build_base_url(environment, settings.get("base_url_override"))
    auth_scheme = settings.get("auth_scheme") or "uts_token"

    candidate_numbers = _product_number_candidates(payload.product_number)
    last_payload: Optional[dict] = None
    last_message: Optional[str] = None

    for candidate in candidate_numbers:
        json_data = {
            "UNO": candidate,
        }
        serial = (payload.serial_number or "").strip()
        lot = (payload.lot_batch_number or "").strip()
        if serial:
            json_data["SNO"] = serial
        if lot:
            json_data["LNO"] = lot
        response = _post_uts_json(base_url, UTS_TEKIL_URUN_QUERY_PATH, auth_scheme, token, json_data)
        try:
            response_payload = response.json()
        except ValueError:
            response_payload = {"rawText": response.text[:1000]}
        last_payload = response_payload if isinstance(response_payload, dict) else {"payload": response_payload}
        records = []
        if isinstance(response_payload, dict):
            raw_items = response_payload.get("SNC")
            if isinstance(raw_items, list):
                records = [item for item in raw_items if isinstance(item, dict)]
            raw_messages = response_payload.get("MSJ")
            if isinstance(raw_messages, list) and raw_messages:
                first_message = raw_messages[0]
                if isinstance(first_message, dict):
                    last_message = first_message.get("MET") or last_message

        if records:
            parsed_items = [_parse_tekil_urun_item(item) for item in records]
            our_member = _serialize_uts_config(tenant).member_number
            is_owned = None
            if our_member and parsed_items:
                first = parsed_items[0]
                if first.owner_institution_number:
                    is_owned = first.owner_institution_number.strip() == our_member.strip()
            return ResponseEnvelope(
                data=UtsTekilUrunQueryResponse(
                    success=True,
                    items=parsed_items,
                    message=f"{len(records)} kayit bulundu" + (" - ustumuzde" if is_owned else " - ustumuzde degil" if is_owned is False else ""),
                    isOwned=is_owned,
                    ourMemberNumber=our_member,
                    queriedProductNumbers=candidate_numbers,
                    rawResponse=last_payload,
                )
            )

    return ResponseEnvelope(
        data=UtsTekilUrunQueryResponse(
            success=False,
            items=[],
            message=last_message or "Kayit bulunamadi",
            queriedProductNumbers=candidate_numbers,
            rawResponse=last_payload,
        )
    )


@router.post("/verme/draft", operation_id="createUtsVermeDraft", response_model=ResponseEnvelope[UtsVermeDraftResponse])
def create_verme_draft(
    payload: UtsVermeDraftRequest,
    access: UnifiedAccess = Depends(require_access()),
):
    _require_tenant(access)
    request_payload = {
        "UNO": payload.product_number.strip(),
        "KUN": payload.recipient_institution_number.strip(),
        "BNO": payload.document_number.strip(),
    }
    if payload.serial_number:
        request_payload["SNO"] = payload.serial_number.strip()
    if payload.lot_batch_number:
        request_payload["LNO"] = payload.lot_batch_number.strip()
        request_payload["ADT"] = payload.quantity
    elif payload.quantity > 1:
        request_payload["ADT"] = payload.quantity

    return ResponseEnvelope(
        data=UtsVermeDraftResponse(
            success=True,
            payload=request_payload,
            message="Verme bildirimi payload'i hazirlandi",
        )
    )


@router.post("/verme/send", operation_id="sendUtsVerme", response_model=ResponseEnvelope[UtsConnectionTestResult])
def send_verme(
    payload: UtsVermeDraftRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    tenant = _get_tenant(db, tenant_id)
    settings = _get_raw_uts_settings(tenant)
    token = _get_effective_token(settings)
    if not token:
        raise HTTPException(status_code=400, detail="UTS token kaydedilmeden bildirim gonderilemez")

    environment = settings.get("environment") or "test"
    base_url = _build_base_url(environment, settings.get("base_url_override"))
    auth_scheme = settings.get("auth_scheme") or "uts_token"
    request_payload = {
        "UNO": payload.product_number.strip(),
        "KUN": payload.recipient_institution_number.strip(),
        "BNO": payload.document_number.strip(),
    }
    if payload.serial_number:
        request_payload["SNO"] = payload.serial_number.strip()
    if payload.lot_batch_number:
        request_payload["LNO"] = payload.lot_batch_number.strip()
        request_payload["ADT"] = payload.quantity
    elif payload.quantity > 1:
        request_payload["ADT"] = payload.quantity

    response = requests.post(
        f"{base_url}{UTS_VERME_PATH}",
        headers={**_build_primary_headers(auth_scheme, token), "Content-Type": "application/json"},
        json=request_payload,
        timeout=20,
        allow_redirects=True,
    )
    try:
        body_text = response.text.strip()
    except Exception:
        body_text = ""
    return ResponseEnvelope(
        data=UtsConnectionTestResult(
            ok=response.status_code in {200, 201, 202},
            httpStatus=response.status_code,
            message="UTS verme bildirimi yaniti alindi",
            tokenValid=response.status_code != 401,
            testedUrl=f"{base_url}{UTS_VERME_PATH}",
            testedAt=datetime.now(timezone.utc),
            authSchemeUsed=auth_scheme,
            rawResponse=body_text[:2000] if body_text else None,
        )
    )


@router.get("/serial-states", operation_id="listUtsSerialStates", response_model=ResponseEnvelope[UtsSerialStateListResponse])
def list_serial_states(
    status: Optional[str] = Query(default=None),
    inventory_id: Optional[str] = Query(default=None, alias="inventoryId"),
    search: Optional[str] = Query(default=None),
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    tenant = _get_tenant(db, tenant_id)
    settings = _get_raw_uts_settings(tenant)
    serial_states = _get_serial_states(settings)
    items = _load_inventory_serial_states(db, tenant_id, serial_states)

    if status:
        items = [item for item in items if item.status == status]
    if inventory_id:
        items = [item for item in items if item.inventory_id == inventory_id]
    if search:
        q = search.strip().lower()
        items = [
            item for item in items
            if q in (item.serial_number or "").lower()
            or q in (item.product_name or "").lower()
            or q in (item.inventory_name or "").lower()
            or q in (item.product_number or "").lower()
        ]

    return ResponseEnvelope(data=UtsSerialStateListResponse(success=True, items=items, total=len(items)))


@router.put("/serial-states", operation_id="upsertUtsSerialState", response_model=ResponseEnvelope[UtsSerialState])
def upsert_serial_state(
    payload: UtsSerialStateUpsertRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    tenant = _get_tenant(db, tenant_id)
    state = _upsert_serial_state(
        tenant,
        status=payload.status,
        inventory_id=payload.inventory_id,
        inventory_name=payload.inventory_name,
        product_name=payload.product_name,
        product_number=payload.product_number,
        serial_number=payload.serial_number,
        lot_batch_number=payload.lot_batch_number,
        supplier_name=payload.supplier_name,
        supplier_id=payload.supplier_id,
        institution_number=payload.institution_number,
        document_number=payload.document_number,
        last_message=payload.last_message,
        last_movement_type=payload.last_movement_type,
        raw_response=payload.raw_response,
    )
    db.commit()
    return ResponseEnvelope(data=state, message="UTS seri durumu guncellendi")


@router.post("/serial-states/add-to-inventory", operation_id="addUtsSerialToInventory", response_model=ResponseEnvelope[UtsAddToInventoryResponse])
def add_serial_to_inventory(
    payload: UtsAddToInventoryRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    """Add a UTS serial state item to inventory (create or update existing)."""
    tenant_id = _require_tenant(access)
    tenant = _get_tenant(db, tenant_id)
    settings = _get_raw_uts_settings(tenant)
    serial_states = _get_serial_states(settings)

    raw_state = serial_states.get(payload.serial_key)
    if not raw_state or not isinstance(raw_state, dict):
        raise HTTPException(status_code=404, detail="Seri durumu bulunamadi")

    product_number = raw_state.get("product_number") or ""
    serial_number = raw_state.get("serial_number") or ""
    product_name = raw_state.get("product_name") or raw_state.get("inventory_name") or ""
    supplier_name = raw_state.get("supplier_name") or ""

    inv_result = _sync_inventory_on_alma(
        db, tenant_id,
        product_number=product_number,
        serial_number=serial_number,
        product_name=product_name,
        supplier_name=supplier_name,
        brand=payload.brand,
        model=payload.model,
    )

    # Update serial state with inventory_id
    if inv_result.get("inventory_id"):
        raw_state["inventory_id"] = inv_result["inventory_id"]
        serial_states[payload.serial_key] = raw_state
        settings["serial_states"] = serial_states
        all_settings = tenant.settings or {}
        all_settings["uts_integration"] = settings
        tenant.settings = all_settings
        flag_modified(tenant, "settings")

    db.commit()

    action = "Yeni envanter kaydi olusturuldu" if inv_result.get("created") else "Mevcut envantere eklendi"
    return ResponseEnvelope(
        data=UtsAddToInventoryResponse(
            success=True,
            message=action,
            inventoryId=inv_result.get("inventory_id"),
            created=inv_result.get("created", False),
            serialAdded=inv_result.get("serial_added", False),
            stockUpdated=inv_result.get("stock_updated", False),
            barcodeUpdated=inv_result.get("barcode_updated", False),
        ),
        message=action,
    )


@router.post("/verme/execute", operation_id="executeUtsVerme", response_model=ResponseEnvelope[UtsMovementExecuteResponse])
def execute_verme(
    payload: UtsVermeDraftRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    tenant = _get_tenant(db, tenant_id)
    settings = _get_raw_uts_settings(tenant)
    token = _get_effective_token(settings)
    if not token:
        raise HTTPException(status_code=400, detail="UTS token kaydedilmeden bildirim gonderilemez")

    environment = settings.get("environment") or "test"
    base_url = _build_base_url(environment, settings.get("base_url_override"))
    auth_scheme = settings.get("auth_scheme") or "uts_token"
    request_payload = {
        "UNO": payload.product_number.strip(),
        "KUN": payload.recipient_institution_number.strip(),
        "BNO": payload.document_number.strip(),
    }
    if payload.serial_number:
        request_payload["SNO"] = payload.serial_number.strip()
    if payload.lot_batch_number:
        request_payload["LNO"] = payload.lot_batch_number.strip()
        request_payload["ADT"] = payload.quantity
    elif payload.quantity > 1:
        request_payload["ADT"] = payload.quantity

    response = _post_uts_json(base_url, UTS_VERME_PATH, auth_scheme, token, request_payload)
    body_text = (response.text or "").strip()
    try:
        response_payload = response.json()
    except ValueError:
        response_payload = {"rawText": body_text[:1000]}
    uts_success = response.ok and isinstance(response_payload, dict) and _extract_movement_id(response_payload) is not None
    movement_id = _extract_movement_id(response_payload if isinstance(response_payload, dict) else None)
    message = _extract_first_message(response_payload if isinstance(response_payload, dict) else None, "UTS verme yaniti alindi")

    state = None
    if uts_success:
        state = _upsert_serial_state(
            tenant,
            status="not_owned",
            inventory_id=payload.inventory_id,
            inventory_name=payload.inventory_name,
            product_name=payload.product_name,
            product_number=payload.product_number,
            serial_number=payload.serial_number,
            lot_batch_number=payload.lot_batch_number,
            supplier_name=payload.supplier_name,
            supplier_id=payload.supplier_id,
            institution_number=payload.recipient_institution_number,
            document_number=payload.document_number,
            last_movement_type="verme",
            last_movement_id=movement_id,
            last_message=message,
            raw_response=body_text[:4000] if body_text else None,
        )
        # Auto-decrease stock if enabled
        if settings.get("auto_decrease_stock_on_verme"):
            try:
                _sync_inventory_on_verme(
                    db, tenant_id,
                    product_number=payload.product_number,
                    serial_number=payload.serial_number,
                    product_name=payload.product_name or payload.inventory_name,
                    inventory_id=payload.inventory_id,
                )
            except Exception as inv_err:
                logger.warning("[uts-verme] auto inventory sync failed: %s", inv_err)
        db.commit()

    return ResponseEnvelope(data=UtsMovementExecuteResponse(
        success=True,
        utsSuccess=uts_success,
        httpStatus=response.status_code,
        message=message,
        movementType="verme",
        movementId=movement_id,
        state=state,
        rawResponse=body_text[:4000] if body_text else None,
    ))


@router.post("/alma/execute", operation_id="executeUtsAlma", response_model=ResponseEnvelope[UtsMovementExecuteResponse])
def execute_alma(
    payload: UtsAlmaRequest,
    access: UnifiedAccess = Depends(require_access()),
    db: Session = Depends(get_db),
):
    tenant_id = _require_tenant(access)
    tenant = _get_tenant(db, tenant_id)
    settings = _get_raw_uts_settings(tenant)
    token = _get_effective_token(settings)
    if not token:
        raise HTTPException(status_code=400, detail="UTS token kaydedilmeden bildirim gonderilemez")

    environment = settings.get("environment") or "test"
    base_url = _build_base_url(environment, settings.get("base_url_override"))
    auth_scheme = settings.get("auth_scheme") or "uts_token"
    request_payload = {
        "UNO": payload.product_number.strip(),
    }
    if payload.serial_number:
        request_payload["SNO"] = payload.serial_number.strip()
    if payload.lot_batch_number:
        request_payload["LNO"] = payload.lot_batch_number.strip()
        request_payload["ADT"] = payload.quantity
    elif payload.quantity > 1:
        request_payload["ADT"] = payload.quantity
    if payload.source_institution_number:
        request_payload["KUN"] = payload.source_institution_number.strip()
    if payload.document_number:
        request_payload["BNO"] = payload.document_number.strip()

    response = _post_uts_json(base_url, UTS_ALMA_PATH, auth_scheme, token, request_payload)
    body_text = (response.text or "").strip()
    try:
        response_payload = response.json()
    except ValueError:
        response_payload = {"rawText": body_text[:1000]}
    uts_success = response.ok and isinstance(response_payload, dict) and _extract_movement_id(response_payload) is not None
    movement_id = _extract_movement_id(response_payload if isinstance(response_payload, dict) else None)
    message = _extract_first_message(response_payload if isinstance(response_payload, dict) else None, "UTS alma yaniti alindi")

    state = None
    if uts_success:
        state = _upsert_serial_state(
            tenant,
            status="owned",
            inventory_id=payload.inventory_id,
            inventory_name=payload.inventory_name,
            product_name=payload.product_name,
            product_number=payload.product_number,
            serial_number=payload.serial_number,
            lot_batch_number=payload.lot_batch_number,
            supplier_name=payload.supplier_name,
            supplier_id=payload.supplier_id,
            institution_number=payload.source_institution_number,
            document_number=payload.document_number,
            last_movement_type="alma",
            last_movement_id=movement_id,
            last_message=message,
            raw_response=body_text[:4000] if body_text else None,
        )
        # Auto-sync inventory if enabled
        if settings.get("auto_add_to_inventory_on_alma"):
            try:
                inv_result = _sync_inventory_on_alma(
                    db, tenant_id,
                    product_number=payload.product_number,
                    serial_number=payload.serial_number,
                    product_name=payload.product_name or payload.inventory_name,
                    supplier_name=payload.supplier_name,
                )
                if inv_result.get("inventory_id"):
                    logger.info("[uts-alma] auto inventory sync: %s", inv_result)
            except Exception as inv_err:
                logger.warning("[uts-alma] auto inventory sync failed: %s", inv_err)
        db.commit()

    return ResponseEnvelope(data=UtsMovementExecuteResponse(
        success=True,
        utsSuccess=uts_success,
        httpStatus=response.status_code,
        message=message,
        movementType="alma",
        movementId=movement_id,
        state=state,
        rawResponse=body_text[:4000] if body_text else None,
    ))


@router.get("/registrations", operation_id="listUtRegistrations", response_model=ResponseEnvelope[UtsRegistrationListResponse])
def list_registrations(
    status: Optional[str] = None,
    page: int = Query(1, ge=1, le=10000),
    per_page: int = Query(20, ge=1, le=100),
    access: UnifiedAccess = Depends(require_access()),
):
    _require_tenant(access)
    registrations: list[dict] = []
    if status:
        registrations = [item for item in registrations if item.get("status") == status]
    return ResponseEnvelope(
        data=UtsRegistrationListResponse(
            success=True,
            data=registrations,
            meta={"total": len(registrations), "page": page, "per_page": per_page},
        )
    )


@router.post("/registrations/bulk", operation_id="createUtRegistrationBulk", response_model=ResponseEnvelope[UtsJobStartResponse])
def start_bulk_registration(
    data: BulkRegistration,
    access: UnifiedAccess = Depends(require_access()),
):
    _require_tenant(access)
    if not data.device_ids:
        raise HTTPException(status_code=400, detail="device_ids must be non-empty array")

    job_id = f"uts_job_{uuid.uuid4().hex[:8]}"
    return ResponseEnvelope(
        data=UtsJobStartResponse(
            success=True,
            data={"job_id": job_id},
            message=f"Bulk registration job started for {len(data.device_ids)} devices",
        )
    )


@router.get("/jobs/{job_id}", operation_id="getUtJob", response_model=ResponseEnvelope[UtsJobStatusResponse])
def get_job_status(
    job_id: str,
    access: UnifiedAccess = Depends(require_access()),
):
    _require_tenant(access)
    return ResponseEnvelope(
        data=UtsJobStatusResponse(
            success=True,
            data={
                "job_id": job_id,
                "status": "completed",
                "total": 0,
                "processed": 0,
                "failed": 0,
                "started_at": None,
                "completed_at": None,
                "errors": [],
            },
        )
    )


@router.post("/jobs/{job_id}/cancel", operation_id="createUtJobCancel", response_model=ResponseEnvelope[UtsCancelResponse])
def cancel_job(
    job_id: str,
    access: UnifiedAccess = Depends(require_access()),
):
    _require_tenant(access)
    return ResponseEnvelope(data=UtsCancelResponse(success=True, message=f"Job {job_id} cancellation requested"))
