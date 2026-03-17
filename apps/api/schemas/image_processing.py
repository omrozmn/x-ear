from typing import Optional
from pydantic import Field
from .base import AppBaseModel


class ResizeRequest(AppBaseModel):
    s3_key: str = Field(..., alias="s3Key")
    width: int
    height: int
    maintain_aspect: bool = Field(True, alias="maintainAspect")


class RemoveBgRequest(AppBaseModel):
    s3_key: str = Field(..., alias="s3Key")


class AIGenerateRequest(AppBaseModel):
    prompt: str
    style: Optional[str] = None  # realistic/illustration/product-photo
    width: int = 1024
    height: int = 1024


class AIEditRequest(AppBaseModel):
    s3_key: str = Field(..., alias="s3Key")
    prompt: str


class ImageProcessingResponse(AppBaseModel):
    url: str
    s3_key: str = Field(..., alias="s3Key")
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: Optional[int] = Field(None, alias="fileSize")


class StockImageSearchRequest(AppBaseModel):
    query: str
    provider: str = 'pexels'  # pexels/unsplash
    page: int = 1
    per_page: int = Field(20, alias="perPage")


class StockImageResult(AppBaseModel):
    id: str
    provider: str
    url: str
    thumbnail_url: str = Field(..., alias="thumbnailUrl")
    width: int
    height: int
    photographer: Optional[str] = None
    description: Optional[str] = None


class StockImageSearchResponse(AppBaseModel):
    results: list[StockImageResult]
    total: int
    page: int
    per_page: int = Field(..., alias="perPage")


class StockImageDownloadRequest(AppBaseModel):
    provider: str
    image_id: str = Field(..., alias="imageId")
    image_url: str = Field(..., alias="imageUrl")
    inventory_id: str = Field(..., alias="inventoryId")
