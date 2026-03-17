# Cargo Integrations Router - Shipping provider management
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from core.models import CargoIntegration
from schemas.cargo_integrations import (
    CargoIntegrationCreate, CargoIntegrationUpdate, CargoIntegrationRead
)
from schemas.base import ResponseEnvelope

router = APIRouter(prefix="/cargo-integrations", tags=["Cargo Integrations"])


@router.get("", operation_id="listCargoIntegrations",
            response_model=ResponseEnvelope[List[CargoIntegrationRead]])
def list_cargo_integrations(
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    integrations = db.query(CargoIntegration).all()
    data = [CargoIntegrationRead.model_validate(i).model_dump(by_alias=True) for i in integrations]
    return ResponseEnvelope(data=data)


@router.post("", operation_id="createCargoIntegration",
             response_model=ResponseEnvelope[CargoIntegrationRead])
def create_cargo_integration(
    body: CargoIntegrationCreate,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    integration = CargoIntegration(
        tenant_id=access.tenant_id,
        platform=body.platform,
        name=body.name,
        api_key=body.api_key,
        api_secret=body.api_secret,
        customer_id=body.customer_id,
        other_params=body.other_params,
    )
    db.add(integration)
    db.commit()
    db.refresh(integration)
    data = CargoIntegrationRead.model_validate(integration).model_dump(by_alias=True)
    return ResponseEnvelope(data=data)


@router.put("/{integration_id}", operation_id="updateCargoIntegration",
            response_model=ResponseEnvelope[CargoIntegrationRead])
def update_cargo_integration(
    integration_id: str,
    body: CargoIntegrationUpdate,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    integration = db.query(CargoIntegration).filter_by(id=integration_id).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Cargo integration not found")
    if access.tenant_id and integration.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Cargo integration not found")

    update_data = body.model_dump(exclude_unset=True, by_alias=False)
    for key, value in update_data.items():
        setattr(integration, key, value)

    db.commit()
    db.refresh(integration)
    data = CargoIntegrationRead.model_validate(integration).model_dump(by_alias=True)
    return ResponseEnvelope(data=data)


@router.delete("/{integration_id}", operation_id="deleteCargoIntegration")
def delete_cargo_integration(
    integration_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    integration = db.query(CargoIntegration).filter_by(id=integration_id).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Cargo integration not found")
    if access.tenant_id and integration.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Cargo integration not found")

    db.delete(integration)
    db.commit()
    return {"success": True, "message": "Cargo integration deleted"}


@router.post("/{integration_id}/test", operation_id="testCargoIntegration")
def test_cargo_integration(
    integration_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    integration = db.query(CargoIntegration).filter_by(id=integration_id).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Cargo integration not found")
    if access.tenant_id and integration.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Cargo integration not found")

    # Placeholder - would test actual cargo API connection
    integration.status = 'connected'
    db.commit()
    return {"success": True, "message": "Connection test successful (simulation)", "status": "connected"}
