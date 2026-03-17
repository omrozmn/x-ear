# Stock Images Router - Pexels/Unsplash search proxy
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.image_processing import (
    StockImageResult, StockImageSearchResponse, StockImageDownloadRequest
)
from schemas.product_media import ProductMediaRead
from schemas.base import ResponseEnvelope
from services.s3_service import s3_service
from core.models import ProductMedia, InventoryItem

router = APIRouter(prefix="/stock-images", tags=["Stock Images"])


@router.get("/search", operation_id="searchStockImages",
            response_model=ResponseEnvelope[StockImageSearchResponse])
def search_stock_images(
    query: str = Query(..., description="Search query"),
    provider: str = Query('pexels', description="pexels or unsplash"),
    page: int = Query(1),
    per_page: int = Query(20),
    access: UnifiedAccess = Depends(require_access("inventory.view")),
):
    results = []
    total = 0

    if provider == 'pexels':
        api_key = os.getenv('PEXELS_API_KEY')
        if not api_key:
            raise HTTPException(status_code=503, detail="Pexels API key not configured")

        resp = httpx.get(
            'https://api.pexels.com/v1/search',
            headers={'Authorization': api_key},
            params={'query': query, 'page': page, 'per_page': per_page}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Pexels API error")

        data = resp.json()
        total = data.get('total_results', 0)
        for photo in data.get('photos', []):
            results.append(StockImageResult(
                id=str(photo['id']),
                provider='pexels',
                url=photo['src']['original'],
                thumbnail_url=photo['src']['medium'],
                width=photo['width'],
                height=photo['height'],
                photographer=photo.get('photographer'),
                description=photo.get('alt'),
            ))

    elif provider == 'unsplash':
        access_key = os.getenv('UNSPLASH_ACCESS_KEY')
        if not access_key:
            raise HTTPException(status_code=503, detail="Unsplash API key not configured")

        resp = httpx.get(
            'https://api.unsplash.com/search/photos',
            headers={'Authorization': f'Client-ID {access_key}'},
            params={'query': query, 'page': page, 'per_page': per_page}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Unsplash API error")

        data = resp.json()
        total = data.get('total', 0)
        for photo in data.get('results', []):
            results.append(StockImageResult(
                id=photo['id'],
                provider='unsplash',
                url=photo['urls']['full'],
                thumbnail_url=photo['urls']['small'],
                width=photo['width'],
                height=photo['height'],
                photographer=photo.get('user', {}).get('name'),
                description=photo.get('alt_description'),
            ))
    else:
        raise HTTPException(status_code=400, detail="Invalid provider. Use 'pexels' or 'unsplash'.")

    response_data = StockImageSearchResponse(
        results=results,
        total=total,
        page=page,
        per_page=per_page
    ).model_dump(by_alias=True)
    return ResponseEnvelope(data=response_data)


@router.post("/download", operation_id="downloadStockImage",
             response_model=ResponseEnvelope[ProductMediaRead])
def download_stock_image(
    body: StockImageDownloadRequest,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    # Verify inventory item exists
    inv = db.query(InventoryItem).filter_by(id=body.inventory_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Inventory item not found")
    if access.tenant_id and inv.tenant_id != access.tenant_id:
        raise HTTPException(status_code=404, detail="Inventory item not found")

    # Download image
    resp = httpx.get(body.image_url, follow_redirects=True, timeout=30)
    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to download image")

    content_type = resp.headers.get('content-type', 'image/jpeg')
    ext = content_type.split('/')[-1].split(';')[0]
    filename = f"stock_{body.provider}_{body.image_id}.{ext}"

    import io
    file_obj = io.BytesIO(resp.content)
    result = s3_service.upload_file(
        file_obj, 'product_media',
        inv.tenant_id, filename
    )

    # Get image dimensions
    width, height = None, None
    try:
        from PIL import Image
        file_obj.seek(0)
        img = Image.open(file_obj)
        width, height = img.size
    except Exception:
        pass

    # Get max sort order
    max_order = (
        db.query(ProductMedia.sort_order)
        .filter_by(inventory_id=body.inventory_id)
        .order_by(ProductMedia.sort_order.desc())
        .first()
    )
    next_order = (max_order[0] + 1) if max_order else 0

    media = ProductMedia(
        tenant_id=inv.tenant_id,
        inventory_id=body.inventory_id,
        media_type='image',
        url=result['url'],
        s3_key=result['key'],
        filename=result['filename'],
        mime_type=content_type,
        file_size=result['size'],
        width=width,
        height=height,
        sort_order=next_order,
        source=body.provider,
        source_id=body.image_id,
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    data = ProductMediaRead.model_validate(media).model_dump(by_alias=True)
    return ResponseEnvelope(data=data)
