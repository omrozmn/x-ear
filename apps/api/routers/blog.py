from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from core.models.post import Post
from schemas.post import PostRead
from datetime import datetime

router = APIRouter(prefix="/blog", tags=["Blog"])

@router.get("/", response_model=List[PostRead])
def get_posts(
    skip: int = 0, 
    limit: int = 20, 
    category: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Fetch published blog posts for the landing page."""
    query = db.query(Post).filter(Post.is_published == True)
    
    if category:
        query = query.filter(Post.category == category)
        
    posts = query.order_by(Post.published_at.desc()).offset(skip).limit(limit).all()
    return posts

@router.get("/{slug}", response_model=PostRead)
def get_post_by_slug(slug: str, db: Session = Depends(get_db)):
    """Fetch a single blog post by its slug."""
    post = db.query(Post).filter(Post.slug == slug, Post.is_published == True).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post
