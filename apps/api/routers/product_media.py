# Product Media Router - CRUD for product images/videos
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from core.models import ProductMedia, InventoryItem, gen_id
from schemas.product_media import (
    ProductMediaCreate, ProductMediaUpdate, ProductMediaRead,
    ProductMediaReorder, PresignedUrlRequest, PresignedUrlResponse
)
from schemas.base import ResponseEnvelope
from services.s3_service import s3_service

router = APIRouter(tags=["Product Media"])


def get_inventory_or_404(db: Session, item_id: str, access: UnifiedAccess) -> InventoryItem:
    item = db.query(InventoryItem).filter_by(id=item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    if access.tenant_id and item.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    return item


@router.get("/inventory/{inventory_id}/media", operation_id="listProductMedia",
            response_model=ResponseEnvelope[List[ProductMediaRead]])
def list_product_media(
    inventory_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.view")),
    db: Session = Depends(get_db)
):
    get_inventory_or_404(db, inventory_id, access)
    media = (
        db.query(ProductMedia)
        .filter_by(inventory_id=inventory_id)
        .order_by(ProductMedia.sort_order)
        .all()
    )
    data = [ProductMediaRead.model_validate(m).model_dump(by_alias=True) for m in media]
    return ResponseEnvelope(data=data)


@router.post("/inventory/{inventory_id}/media", operation_id="createProductMedia",
             response_model=ResponseEnvelope[ProductMediaRead])
def create_product_media(
    inventory_id: str,
    body: ProductMediaCreate,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    inv = get_inventory_or_404(db, inventory_id, access)

    # Get current max sort_order
    max_order = (
        db.query(ProductMedia.sort_order)
        .filter_by(inventory_id=inventory_id)
        .order_by(ProductMedia.sort_order.desc())
        .first()
    )
    next_order = (max_order[0] + 1) if max_order else 0

    media = ProductMedia(
        tenant_id=inv.tenant_id,
        inventory_id=inventory_id,
        media_type=body.media_type,
        url=body.url,
        s3_key=body.s3_key,
        filename=body.filename,
        mime_type=body.mime_type,
        file_size=body.file_size,
        width=body.width,
        height=body.height,
        sort_order=next_order,
        is_primary=body.is_primary,
        alt_text=body.alt_text,
        source=body.source,
        source_id=body.source_id,
    )
    db.add(media)

    # If this is set as primary, unset other primaries
    if body.is_primary:
        db.query(ProductMedia).filter(
            ProductMedia.inventory_id == inventory_id,
            ProductMedia.id != media.id
        ).update({'is_primary': False})

    db.commit()
    db.refresh(media)
    data = ProductMediaRead.model_validate(media).model_dump(by_alias=True)
    return ResponseEnvelope(data=data)


@router.post("/inventory/{inventory_id}/media/presigned", operation_id="getMediaPresignedUrl",
             response_model=ResponseEnvelope[PresignedUrlResponse])
def get_media_presigned_url(
    inventory_id: str,
    body: PresignedUrlRequest,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    inv = get_inventory_or_404(db, inventory_id, access)
    result = s3_service.generate_presigned_upload_url(
        folder='product_media',
        tenant_id=inv.tenant_id,
        filename=body.filename,
        content_type=body.content_type
    )
    data = PresignedUrlResponse(
        url=result.get('url', ''),
        fields=result.get('fields'),
        s3_key=result.get('key', '')
    ).model_dump(by_alias=True)
    return ResponseEnvelope(data=data)


@router.put("/inventory/{inventory_id}/media/{media_id}", operation_id="updateProductMedia",
            response_model=ResponseEnvelope[ProductMediaRead])
def update_product_media(
    inventory_id: str,
    media_id: str,
    body: ProductMediaUpdate,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    get_inventory_or_404(db, inventory_id, access)
    media = db.query(ProductMedia).filter_by(id=media_id, inventory_id=inventory_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    update_data = body.model_dump(exclude_unset=True, by_alias=False)
    for key, value in update_data.items():
        setattr(media, key, value)

    # If setting as primary, unset others
    if body.is_primary:
        db.query(ProductMedia).filter(
            ProductMedia.inventory_id == inventory_id,
            ProductMedia.id != media_id
        ).update({'is_primary': False})

    db.commit()
    db.refresh(media)
    data = ProductMediaRead.model_validate(media).model_dump(by_alias=True)
    return ResponseEnvelope(data=data)


@router.delete("/inventory/{inventory_id}/media/{media_id}", operation_id="deleteProductMedia")
def delete_product_media(
    inventory_id: str,
    media_id: str,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    get_inventory_or_404(db, inventory_id, access)
    media = db.query(ProductMedia).filter_by(id=media_id, inventory_id=inventory_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Delete from S3
    if media.s3_key:
        s3_service.delete_file(media.s3_key)

    db.delete(media)
    db.commit()
    return {"success": True, "message": "Media deleted"}


@router.post("/inventory/{inventory_id}/media/reorder", operation_id="reorderProductMedia")
def reorder_product_media(
    inventory_id: str,
    body: ProductMediaReorder,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    get_inventory_or_404(db, inventory_id, access)
    for idx, media_id in enumerate(body.media_ids):
        db.query(ProductMedia).filter_by(
            id=media_id, inventory_id=inventory_id
        ).update({'sort_order': idx})
    db.commit()
    return {"success": True, "message": "Media reordered"}
