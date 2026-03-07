from typing import Optional, List
from datetime import datetime
from pydantic import Field, field_validator
from .base import AppBaseModel, IDMixin, TimestampMixin

class PostBase(AppBaseModel):
    title: str = Field(..., min_length=5, max_length=255)
    slug: str = Field(..., min_length=5, max_length=255)
    content: str = Field(...)
    excerpt: Optional[str] = None
    image_url: Optional[str] = Field(None, alias="imageUrl")
    category: Optional[str] = None
    meta_title: Optional[str] = Field(None, alias="metaTitle")
    meta_description: Optional[str] = Field(None, alias="metaDescription")
    meta_keywords: Optional[str] = Field(None, alias="metaKeywords")
    is_published: bool = Field(False, alias="isPublished")

class PostCreate(PostBase):
    author_id: Optional[str] = Field(None, alias="authorId")

class PostUpdate(AppBaseModel):
    title: Optional[str] = Field(None, min_length=5, max_length=255)
    slug: Optional[str] = Field(None, min_length=5, max_length=255)
    content: Optional[str] = None
    excerpt: Optional[str] = None
    image_url: Optional[str] = Field(None, alias="imageUrl")
    category: Optional[str] = None
    meta_title: Optional[str] = Field(None, alias="metaTitle")
    meta_description: Optional[str] = Field(None, alias="metaDescription")
    meta_keywords: Optional[str] = Field(None, alias="metaKeywords")
    is_published: Optional[bool] = Field(None, alias="isPublished")
    published_at: Optional[datetime] = Field(None, alias="publishedAt")

class PostRead(PostBase, IDMixin, TimestampMixin):
    author_id: Optional[str] = Field(None, alias="authorId")
    author_name: Optional[str] = Field("X-Ear Team", alias="authorName")
    published_at: Optional[datetime] = Field(None, alias="publishedAt")

    @field_validator('published_at', mode='before')
    @classmethod
    def serialize_datetime(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return v
        if hasattr(v, 'isoformat'):
            return v.isoformat()
        return str(v)
