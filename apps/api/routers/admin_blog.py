from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from core.models.post import Post
from schemas.post import PostRead, PostCreate, PostUpdate
from core.dependencies import get_current_admin_user
from datetime import datetime

router = APIRouter(prefix="/admin/blog", tags=["Admin Blog"])

@router.get("/", response_model=List[PostRead])
def admin_get_posts(
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Admin endpoint to see all posts (published or not)."""
    return db.query(Post).order_by(Post.created_at.desc()).all()

@router.post("/", response_model=PostRead)
def create_post(
    post_in: PostCreate,
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Create a new blog post."""
    # Check if slug exists
    if db.query(Post).filter(Post.slug == post_in.slug).first():
        throw_slug_error = True
        # Simple slug modification if duplicate? No, better let admin decide.
        raise HTTPException(status_code=400, detail="Slug already exists")
    
    db_post = Post(
        title=post_in.title,
        slug=post_in.slug or Post.generate_slug(post_in.title),
        content=post_in.content,
        excerpt=post_in.excerpt,
        image_url=post_in.image_url,
        category=post_in.category,
        is_published=post_in.is_published,
        author_id=current_user.id,
        published_at=datetime.utcnow() if post_in.is_published else None
    )
    
    db.add(db_post)
    db.commit()
    db.refresh(db_post)
    return db_post

@router.put("/{post_id}", response_model=PostRead)
def update_post(
    post_id: str,
    post_in: PostUpdate,
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Update an existing blog post."""
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    update_data = post_in.model_dump(exclude_unset=True, by_alias=False)
    
    # Handle published_at logic
    if 'is_published' in update_data:
        if update_data['is_published'] and not db_post.is_published:
            db_post.published_at = datetime.utcnow()
        elif not update_data['is_published']:
            db_post.published_at = None

    for field, value in update_data.items():
        setattr(db_post, field, value)
        
    db.commit()
    db.refresh(db_post)
    return db_post

@router.delete("/{post_id}")
def delete_post(
    post_id: str,
    current_user = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Delete a blog post."""
    db_post = db.query(Post).filter(Post.id == post_id).first()
    if not db_post:
        raise HTTPException(status_code=404, detail="Post not found")
        
    db.delete(db_post)
    db.commit()
    return {"message": "Post deleted successfully"}
