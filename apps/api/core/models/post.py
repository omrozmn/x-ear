from sqlalchemy import Column, Boolean, DateTime, ForeignKey, String, Text, Index
from sqlalchemy.orm import relationship
from .base import BaseModel, gen_id
from datetime import datetime

class Post(BaseModel):
    """
    Blog Post model for the public landing page and news section.
    Posts are global (not tenant-scoped) as they belong to the X-Ear brand.
    """
    __tablename__ = 'posts'

    # Primary key with auto-generated default
    id = Column(String(50), primary_key=True, default=lambda: gen_id("pst"))
    
    title = Column(String(255), nullable=False)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    content = Column(Text, nullable=False)
    excerpt = Column(Text, nullable=True)
    
    # Author tracking (X-Ear Admin/User)
    author_id = Column(String(50), ForeignKey('users.id'), nullable=True)
    author = relationship('User', backref='posts')
    
    image_url = Column(String(500), nullable=True)
    category = Column(String(100), nullable=True, index=True)
    
    # SEO fields
    meta_title = Column(String(255), nullable=True)
    meta_description = Column(String(500), nullable=True)
    meta_keywords = Column(String(500), nullable=True)
    
    # Status and timestamps
    is_published = Column(Boolean, default=False, index=True)
    published_at = Column(DateTime, nullable=True)
    
    # Helper to generate slug from title if needed (simple version)
    @staticmethod
    def generate_slug(title: str) -> str:
        import re
        slug = title.lower()
        slug = re.sub(r'[^a-z0-9]+', '-', slug).strip('-')
        return slug

    def to_dict(self):
        """Convert to dictionary for API response"""
        base_dict = self.to_dict_base()
        post_dict = {
            'id': self.id,
            'title': self.title,
            'slug': self.slug,
            'content': self.content,
            'excerpt': self.excerpt,
            'authorId': self.author_id,
            'authorName': self.author.full_name if self.author else "X-Ear Team",
            'imageUrl': self.image_url,
            'category': self.category,
            'metaTitle': self.meta_title,
            'metaDescription': self.meta_description,
            'metaKeywords': self.meta_keywords,
            'isPublished': self.is_published,
            'publishedAt': self.published_at.isoformat() if self.published_at else None
        }
        post_dict.update(base_dict)
        return post_dict

    # Indexes for performance
    __table_args__ = (
        Index('ix_posts_published_slug', 'is_published', 'slug'),
        Index('ix_posts_created_at', 'created_at'),
    )
