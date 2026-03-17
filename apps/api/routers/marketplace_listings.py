# Marketplace Listings Router - Per-product marketplace listing management
import json
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from core.models import MarketplaceProductListing, InventoryItem, MarketplaceIntegration
from schemas.marketplace_listings import (
    MarketplaceListingCreate, MarketplaceListingUpdate, MarketplaceListingRead,
    AIFillRequest, AIFillResponse
)
from schemas.base import ResponseEnvelope

router = APIRouter(tags=["Marketplace Listings"])


def get_inventory_or_404(db: Session, item_id: str, access: UnifiedAccess) -> InventoryItem:
    item = db.query(InventoryItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    if access.tenant_id and item.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.get("/inventory/{inventory_id}/marketplace-listings", operation_id="listMarketplaceListings",
            response_model=ResponseEnvelope[List[MarketplaceListingRead]])
def list_marketplace_listings(
    inventory_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    get_inventory_or_404(db, inventory_id, access)
    listings = db.query(MarketplaceProductListing).filter_by(inventory_id=inventory_id).all()
    data = [MarketplaceListingRead.model_validate(l).model_dump(by_alias=True) for l in listings]
    return ResponseEnvelope(data=data)


@router.post("/inventory/{inventory_id}/marketplace-listings", operation_id="createMarketplaceListing",
             response_model=ResponseEnvelope[MarketplaceListingRead])
def create_marketplace_listing(
    inventory_id: str,
    body: MarketplaceListingCreate,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    inv = get_inventory_or_404(db, inventory_id, access)

    # Verify integration exists and belongs to tenant
    integration = db.query(MarketplaceIntegration).filter_by(id=body.integration_id).first()
    if not integration:
        raise HTTPException(status_code=404, detail="Marketplace integration not found")
    if access.tenant_id and integration.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Marketplace integration not found")

    listing = MarketplaceProductListing(
        tenant_id=inv.tenant_id,
        inventory_id=inventory_id,
        integration_id=body.integration_id,
        listing_data=body.listing_data,
        marketplace_title=body.marketplace_title,
        marketplace_description=body.marketplace_description,
        marketplace_price=body.marketplace_price,
        marketplace_stock=body.marketplace_stock,
        marketplace_barcode=body.marketplace_barcode,
        marketplace_brand=body.marketplace_brand,
        marketplace_category_id=body.marketplace_category_id,
    )
    db.add(listing)
    db.commit()
    db.refresh(listing)
    data = MarketplaceListingRead.model_validate(listing).model_dump(by_alias=True)
    return ResponseEnvelope(data=data)


@router.put("/inventory/{inventory_id}/marketplace-listings/{listing_id}",
            operation_id="updateMarketplaceListing",
            response_model=ResponseEnvelope[MarketplaceListingRead])
def update_marketplace_listing(
    inventory_id: str,
    listing_id: str,
    body: MarketplaceListingUpdate,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    get_inventory_or_404(db, inventory_id, access)
    listing = db.query(MarketplaceProductListing).filter_by(
        id=listing_id, inventory_id=inventory_id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    update_data = body.model_dump(exclude_unset=True, by_alias=False)
    for key, value in update_data.items():
        setattr(listing, key, value)

    db.commit()
    db.refresh(listing)
    data = MarketplaceListingRead.model_validate(listing).model_dump(by_alias=True)
    return ResponseEnvelope(data=data)


@router.delete("/inventory/{inventory_id}/marketplace-listings/{listing_id}",
               operation_id="deleteMarketplaceListing")
def delete_marketplace_listing(
    inventory_id: str,
    listing_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    get_inventory_or_404(db, inventory_id, access)
    listing = db.query(MarketplaceProductListing).filter_by(
        id=listing_id, inventory_id=inventory_id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    db.delete(listing)
    db.commit()
    return {"success": True, "message": "Listing deleted"}


@router.post("/inventory/{inventory_id}/marketplace-listings/ai-fill",
             operation_id="aiAutoFillListings",
             response_model=ResponseEnvelope[List[AIFillResponse]])
def ai_auto_fill_listings(
    inventory_id: str,
    body: AIFillRequest,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    inv = get_inventory_or_404(db, inventory_id, access)

    try:
        from services.ecommerce_ai_service import generate_marketplace_content
        results = generate_marketplace_content(inv, body.platform, db)
        data = [AIFillResponse(**r).model_dump(by_alias=True) for r in results]
        return ResponseEnvelope(data=data)
    except ImportError:
        raise HTTPException(status_code=501, detail="E-commerce AI service not available")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/inventory/{inventory_id}/marketplace-listings/{listing_id}/publish",
             operation_id="publishMarketplaceListing")
def publish_marketplace_listing(
    inventory_id: str,
    listing_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    get_inventory_or_404(db, inventory_id, access)
    listing = db.query(MarketplaceProductListing).filter_by(
        id=listing_id, inventory_id=inventory_id
    ).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")

    # Placeholder for actual marketplace API publishing
    listing.status = 'published'
    db.commit()
    return {"success": True, "message": "Listing published (simulation)"}
