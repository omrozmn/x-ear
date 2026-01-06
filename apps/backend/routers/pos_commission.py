"""POS Commission Router - FastAPI"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Dict
import logging

from database import get_db
from models.tenant import Tenant
from middleware.unified_access import UnifiedAccess, require_access, require_admin
from database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/pos/commission", tags=["POS Commission"])

DEFAULT_COMMISSION_RATES = {
    "paytr": {1: 2.99, 2: 3.49, 3: 3.99, 6: 4.49, 9: 4.99, 12: 5.49},
    "iyzico": {1: 2.75, 2: 3.25, 3: 3.75, 6: 4.25, 9: 4.75, 12: 5.25},
    "xear_pos": {1: 2.49, 2: 2.99, 3: 3.49, 6: 3.99, 9: 4.49, 12: 4.99}
}

class CommissionCalculate(BaseModel):
    amount: float
    installment_count: Optional[int] = 1
    provider: Optional[str] = "xear_pos"

class TenantRatesUpdate(BaseModel):
    rates: Dict

def get_tenant_commission_rates(tenant_id: str, db: Session):
    if not tenant_id:
        return None
    tenant = db.get(Tenant, tenant_id)
    if not tenant or not tenant.settings:
        return None
    return tenant.settings.get("pos_commission_rates")

def calculate_commission(amount, installment_count, provider, tenant_id, db):
    rates = get_tenant_commission_rates(tenant_id, db) or DEFAULT_COMMISSION_RATES
    provider_rates = rates.get(provider, rates.get("xear_pos", DEFAULT_COMMISSION_RATES["xear_pos"]))
    commission_rate = provider_rates.get(str(installment_count), provider_rates.get("1", 2.99))
    
    gross_amount = float(amount)
    commission_amount = gross_amount * (commission_rate / 100)
    net_amount = gross_amount - commission_amount
    
    return {
        "gross_amount": round(gross_amount, 2),
        "commission_rate": commission_rate,
        "commission_amount": round(commission_amount, 2),
        "net_amount": round(net_amount, 2),
        "provider": provider,
        "installment_count": installment_count
    }

@router.post("/calculate")
async def calculate_commission_endpoint(
    data: CommissionCalculate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Calculate commission for given amount and installments"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    
    result = calculate_commission(data.amount, data.installment_count, data.provider, access.tenant_id, db)
    return {"success": True, "data": result}

@router.get("/rates")
async def get_commission_rates(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get commission rates for current tenant"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    tenant_rates = get_tenant_commission_rates(access.tenant_id, db)
    active_rates = tenant_rates if tenant_rates else DEFAULT_COMMISSION_RATES
    
    return {
        "success": True,
        "data": {
            "rates": active_rates,
            "is_custom": tenant_rates is not None,
            "available_providers": list(active_rates.keys())
        }
    }

@router.post("/installment-options")
async def get_installment_options(
    data: CommissionCalculate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_access())
):
    """Get installment options with calculated amounts"""
    if not access.tenant_id:
        raise HTTPException(status_code=400, detail="Tenant context required")
    
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Invalid amount")
    
    installments = [1, 2, 3, 6, 9, 12]
    options = []
    
    for inst_count in installments:
        calc = calculate_commission(data.amount, inst_count, data.provider, access.tenant_id, db)
        options.append({
            "installment_count": inst_count,
            "label": "Tek Çekim" if inst_count == 1 else f"{inst_count} Taksit",
            "gross_amount": calc["gross_amount"],
            "commission_rate": calc["commission_rate"],
            "commission_amount": calc["commission_amount"],
            "net_amount": calc["net_amount"],
            "monthly_payment": round(calc["gross_amount"] / inst_count, 2) if inst_count > 1 else None
        })
    
    return {"success": True, "data": {"options": options, "provider": data.provider}}

# --- Admin Endpoints (Migrated from Flask) ---

@router.get("/rates/tenant/{tenant_id}")
async def get_tenant_rates_admin(
    tenant_id: str,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get tenant-specific rates (admin only)"""
    tenant_rates = get_tenant_commission_rates(tenant_id, db)
    
    return {
        "success": True,
        "data": {
            "tenant_rates": tenant_rates,
            "system_rates": DEFAULT_COMMISSION_RATES,
            "effective_rates": tenant_rates if tenant_rates else DEFAULT_COMMISSION_RATES
        }
    }

@router.put("/rates/tenant/{tenant_id}")
async def update_tenant_rates_admin(
    tenant_id: str,
    data: TenantRatesUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update tenant-specific rates (admin only)"""
    tenant = db.get(Tenant, tenant_id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant not found")
    
    rates = data.rates
    if not rates:
        raise HTTPException(status_code=400, detail="Rates required")
    
    # Validate rates structure
    for provider, provider_rates in rates.items():
        if not isinstance(provider_rates, dict):
            raise HTTPException(status_code=400, detail=f"Invalid rates for {provider}")
    
    # Update tenant settings
    if not tenant.settings:
        tenant.settings = {}
    
    tenant.settings["pos_commission_rates"] = rates
    
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(tenant, "settings")
    
    db.commit()
    
    return {"success": True, "message": "Tenant rates updated"}

@router.get("/rates/system")
async def get_system_rates_endpoint(
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Get system-wide default rates (admin only)"""
    return {
        "success": True,
        "data": {
            "rates": DEFAULT_COMMISSION_RATES,
            "defaults": DEFAULT_COMMISSION_RATES
        }
    }

@router.put("/rates/system")
async def update_system_rates(
    data: TenantRatesUpdate,
    db: Session = Depends(get_db),
    access: UnifiedAccess = Depends(require_admin())
):
    """Update system-wide default rates (super admin only)"""
    # Not implemented - use tenant-level rates
    raise HTTPException(
        status_code=501,
        detail="System-level rates update not yet implemented. Use tenant-level rates."
    )
