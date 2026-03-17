# Image Processing Router - Resize, Remove BG, AI Generate/Edit
import io
import os
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from middleware.unified_access import UnifiedAccess, require_access
from schemas.image_processing import (
    ResizeRequest, RemoveBgRequest, AIGenerateRequest, AIEditRequest,
    ImageProcessingResponse
)
from schemas.base import ResponseEnvelope
from services.s3_service import s3_service

router = APIRouter(prefix="/image-processing", tags=["Image Processing"])


@router.post("/resize", operation_id="resizeImage",
             response_model=ResponseEnvelope[ImageProcessingResponse])
def resize_image(
    body: ResizeRequest,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    try:
        from PIL import Image

        # Download from S3
        file_bytes = s3_service.download_file(body.s3_key)
        if not file_bytes:
            raise HTTPException(status_code=404, detail="Source image not found")

        img = Image.open(io.BytesIO(file_bytes))

        if body.maintain_aspect:
            img.thumbnail((body.width, body.height), Image.LANCZOS)
        else:
            img = img.resize((body.width, body.height), Image.LANCZOS)

        # Save to buffer
        buf = io.BytesIO()
        fmt = img.format or 'PNG'
        img.save(buf, format=fmt)
        buf.seek(0)

        # Upload resized image
        result = s3_service.upload_file(
            buf, 'product_media_processed',
            access.tenant_id, f"resized_{body.width}x{body.height}.{fmt.lower()}"
        )

        data = ImageProcessingResponse(
            url=result['url'],
            s3_key=result['key'],
            width=img.width,
            height=img.height,
            file_size=result['size']
        ).model_dump(by_alias=True)
        return ResponseEnvelope(data=data)

    except ImportError:
        raise HTTPException(status_code=501, detail="Pillow not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/remove-bg", operation_id="removeBackground",
             response_model=ResponseEnvelope[ImageProcessingResponse])
def remove_background(
    body: RemoveBgRequest,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    try:
        from rembg import remove
        from PIL import Image

        file_bytes = s3_service.download_file(body.s3_key)
        if not file_bytes:
            raise HTTPException(status_code=404, detail="Source image not found")

        input_img = Image.open(io.BytesIO(file_bytes))
        output_img = remove(input_img)

        buf = io.BytesIO()
        output_img.save(buf, format='PNG')
        buf.seek(0)

        result = s3_service.upload_file(
            buf, 'product_media_processed',
            access.tenant_id, 'no_bg.png'
        )

        data = ImageProcessingResponse(
            url=result['url'],
            s3_key=result['key'],
            width=output_img.width,
            height=output_img.height,
            file_size=result['size']
        ).model_dump(by_alias=True)
        return ResponseEnvelope(data=data)

    except ImportError:
        raise HTTPException(status_code=501, detail="rembg not installed")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai-generate", operation_id="aiGenerateImage",
             response_model=ResponseEnvelope[ImageProcessingResponse])
def ai_generate_image(
    body: AIGenerateRequest,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    # Placeholder - would integrate with AI image generation service
    raise HTTPException(status_code=501, detail="AI image generation not yet configured")


@router.post("/ai-edit", operation_id="aiEditImage",
             response_model=ResponseEnvelope[ImageProcessingResponse])
def ai_edit_image(
    body: AIEditRequest,
    access: UnifiedAccess = Depends(require_access("inventory.manage")),
    db: Session = Depends(get_db)
):
    # Placeholder - would integrate with AI image editing service
    raise HTTPException(status_code=501, detail="AI image editing not yet configured")
