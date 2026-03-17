"""
SGK Credentials Router — encrypted storage for SGK login credentials.

Stores tesis kodu, tesis şifresi, mesul müdür TC/şifre using AES-256-GCM.
Only the owner tenant can read/write their own credentials.
Passwords are never returned in plaintext — only `has*` boolean flags.
"""

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from core.database import get_db
from middleware.unified_access import UnifiedAccess, require_auth
from schemas.base import ResponseEnvelope
from schemas.sgk_credentials import SgkCredentialsUpdate, SgkCredentialsRead
from services.crypto_service import get_crypto_service, CryptoService
from core.models.integration_config import IntegrationConfig
from core.database import gen_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/sgk-credentials", tags=["sgk-credentials"])

# Config keys stored per-tenant in IntegrationConfig
_INTEGRATION_TYPE = "sgk_login"
_KEYS = {
    "tesis_kodu": False,       # not secret
    "tesis_sifresi": True,     # secret → encrypted
    "mesul_mudur_tc": True,    # PII → encrypted
    "mesul_mudur_sifresi": True,  # secret → encrypted
}


def _get_config(db: Session, tenant_id: str, config_key: str) -> IntegrationConfig | None:
    return (
        db.query(IntegrationConfig)
        .filter(
            IntegrationConfig.tenant_id == tenant_id,
            IntegrationConfig.integration_type == _INTEGRATION_TYPE,
            IntegrationConfig.config_key == config_key,
        )
        .first()
    )


def _set_config(
    db: Session,
    tenant_id: str,
    config_key: str,
    value: str,
    crypto: CryptoService,
    is_secret: bool,
) -> None:
    stored_value = crypto.encrypt(value) if is_secret and value else value
    existing = _get_config(db, tenant_id, config_key)
    if existing:
        existing.config_value = stored_value
        existing.is_active = True
    else:
        db.add(IntegrationConfig(
            id=gen_id("sgkcfg"),
            integration_type=_INTEGRATION_TYPE,
            config_key=config_key,
            config_value=stored_value,
            tenant_id=tenant_id,
            is_active=True,
            description=f"SGK login — {config_key}",
        ))


@router.get(
    "",
    response_model=ResponseEnvelope[SgkCredentialsRead],
    operation_id="getSgkCredentials",
    summary="SGK giriş bilgilerini getir",
)
def get_sgk_credentials(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_auth()),
    crypto: CryptoService = Depends(get_crypto_service),
):
    """Read SGK credentials for the current tenant. Passwords are masked."""
    tenant_id = access.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail={"message": "Tenant context required"})

    result: dict = {}
    for key, is_secret in _KEYS.items():
        cfg = _get_config(db, tenant_id, key)
        if cfg and cfg.config_value:
            if is_secret:
                # Never return secrets; expose boolean flag
                has_key = f"has_{key}"
                result[has_key] = True
            else:
                result[key] = cfg.config_value
        else:
            if is_secret:
                result[f"has_{key}"] = False
            else:
                result[key] = None

    return ResponseEnvelope(data=SgkCredentialsRead(**result))


@router.put(
    "",
    response_model=ResponseEnvelope[SgkCredentialsRead],
    operation_id="updateSgkCredentials",
    summary="SGK giriş bilgilerini kaydet",
)
def update_sgk_credentials(
    body: SgkCredentialsUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_auth()),
    crypto: CryptoService = Depends(get_crypto_service),
):
    """Save SGK credentials for the current tenant (encrypted)."""
    tenant_id = access.tenant_id
    if not tenant_id:
        raise HTTPException(status_code=400, detail={"message": "Tenant context required"})

    update_data = body.model_dump(exclude_unset=True, by_alias=False)
    for key, is_secret in _KEYS.items():
        if key in update_data and update_data[key] is not None:
            _set_config(db, tenant_id, key, update_data[key], crypto, is_secret)

    db.commit()
    logger.info("SGK credentials updated for tenant %s", tenant_id)

    return get_sgk_credentials(db=db, access=access, crypto=crypto)
