"""
Blog Automation Models

Handles:
- BlogAutomation: Automation flow config per sector
- BlogSource: RSS/feed sources for content discovery
- BlogAutomationRun: Execution history
- BlogContentCandidate: Discovered content items
- BlogSocialConnection: Social platform connections
- BlogToneTemplate: Style/KOL tone templates
"""

from sqlalchemy import (
    Column, Boolean, DateTime, ForeignKey, String, Text, Integer, Float, Index, JSON
)
from sqlalchemy.orm import relationship
from .base import BaseModel, gen_id
from database import now_utc


class BlogAutomation(BaseModel):
    """Blog automation flow configuration per sector."""
    __tablename__ = 'blog_automations'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("ba"))

    # Basic info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=False, index=True)

    # Target sector & blog category mapping
    sector = Column(String(50), nullable=False, index=True)
    target_category = Column(String(100), nullable=True)

    # Schedule: cron-like or interval (in minutes)
    schedule_type = Column(String(20), default='interval')  # 'interval' | 'cron'
    schedule_interval_hours = Column(Integer, default=24)
    schedule_cron = Column(String(100), nullable=True)

    # Content discovery settings
    keywords = Column(JSON, nullable=True)  # ["hearing aid", "audiology"]
    negative_keywords = Column(JSON, nullable=True)  # ["spam", "ad"]
    content_types = Column(JSON, nullable=True)  # ["trend", "how-to", "news"]
    min_source_quality = Column(Float, default=0.5)

    # Language settings
    primary_language = Column(String(10), default='tr')
    target_languages = Column(JSON, nullable=True)  # ["en", "de", "ar"]

    # Tone/Style settings
    tone_template_id = Column(String(50), ForeignKey('blog_tone_templates.id'), nullable=True)
    tone_template = relationship('BlogToneTemplate', backref='automations')
    target_audience = Column(String(255), nullable=True)
    summary_depth = Column(String(20), default='medium')  # 'short' | 'medium' | 'deep'
    citation_style = Column(String(20), default='inline')  # 'inline' | 'footnote' | 'endnote'
    cta_text = Column(String(255), nullable=True)

    # Image settings
    image_source = Column(String(20), default='unsplash')  # 'unsplash' | 'pexels' | 'ai' | 'mixed'
    image_fallback = Column(String(20), default='unsplash')
    image_keywords_override = Column(JSON, nullable=True)

    # Social distribution
    auto_share_enabled = Column(Boolean, default=False)
    social_platforms = Column(JSON, nullable=True)  # {"linkedin": true, "twitter": true}

    # Approval mode
    approval_mode = Column(String(20), default='manual')  # 'manual' | 'semi_auto' | 'full_auto'
    confidence_threshold = Column(Float, default=0.7)

    # Deduplication
    dedup_window_days = Column(Integer, default=30)

    # Stats
    total_runs = Column(Integer, default=0)
    total_posts_generated = Column(Integer, default=0)
    total_posts_published = Column(Integer, default=0)
    last_run_at = Column(DateTime, nullable=True)

    # Relationships
    sources = relationship('BlogSource', back_populates='automation', cascade='all, delete-orphan')
    runs = relationship('BlogAutomationRun', back_populates='automation', cascade='all, delete-orphan')

    def to_dict(self):
        base = self.to_dict_base()
        base.update({
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'isActive': self.is_active,
            'sector': self.sector,
            'targetCategory': self.target_category,
            'scheduleType': self.schedule_type,
            'scheduleIntervalHours': self.schedule_interval_hours,
            'scheduleCron': self.schedule_cron,
            'keywords': self.keywords or [],
            'negativeKeywords': self.negative_keywords or [],
            'contentTypes': self.content_types or [],
            'minSourceQuality': self.min_source_quality,
            'primaryLanguage': self.primary_language,
            'targetLanguages': self.target_languages or [],
            'toneTemplateId': self.tone_template_id,
            'targetAudience': self.target_audience,
            'summaryDepth': self.summary_depth,
            'citationStyle': self.citation_style,
            'ctaText': self.cta_text,
            'imageSource': self.image_source,
            'imageFallback': self.image_fallback,
            'imageKeywordsOverride': self.image_keywords_override,
            'autoShareEnabled': self.auto_share_enabled,
            'socialPlatforms': self.social_platforms or {},
            'approvalMode': self.approval_mode,
            'confidenceThreshold': self.confidence_threshold,
            'dedupWindowDays': self.dedup_window_days,
            'totalRuns': self.total_runs,
            'totalPostsGenerated': self.total_posts_generated,
            'totalPostsPublished': self.total_posts_published,
            'lastRunAt': self.last_run_at.isoformat() if self.last_run_at else None,
            'sourcesCount': len(self.sources) if self.sources else 0,
        })
        return base

    __table_args__ = (
        Index('ix_blog_auto_sector_active', 'sector', 'is_active'),
    )


class BlogSource(BaseModel):
    """Feed/source for a blog automation."""
    __tablename__ = 'blog_sources'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("bs"))

    automation_id = Column(String(50), ForeignKey('blog_automations.id'), nullable=False, index=True)
    automation = relationship('BlogAutomation', back_populates='sources')

    name = Column(String(255), nullable=False)
    url = Column(String(1000), nullable=False)
    source_type = Column(String(30), default='rss')  # 'rss' | 'sitemap' | 'blog' | 'manual'
    is_active = Column(Boolean, default=True)

    # Quality & trust
    priority = Column(Integer, default=5)  # 1-10
    trust_score = Column(Float, default=0.7)  # 0-1

    # Health
    last_fetched_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)
    consecutive_failures = Column(Integer, default=0)
    total_items_fetched = Column(Integer, default=0)

    def to_dict(self):
        base = self.to_dict_base()
        base.update({
            'id': self.id,
            'automationId': self.automation_id,
            'name': self.name,
            'url': self.url,
            'sourceType': self.source_type,
            'isActive': self.is_active,
            'priority': self.priority,
            'trustScore': self.trust_score,
            'lastFetchedAt': self.last_fetched_at.isoformat() if self.last_fetched_at else None,
            'lastError': self.last_error,
            'consecutiveFailures': self.consecutive_failures,
            'totalItemsFetched': self.total_items_fetched,
        })
        return base


class BlogAutomationRun(BaseModel):
    """Execution history for a blog automation."""
    __tablename__ = 'blog_automation_runs'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("bar"))

    automation_id = Column(String(50), ForeignKey('blog_automations.id'), nullable=False, index=True)
    automation = relationship('BlogAutomation', back_populates='runs')

    status = Column(String(20), default='pending')  # pending | running | completed | failed | cancelled
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    trigger_type = Column(String(20), default='scheduled')  # 'scheduled' | 'manual'

    # Results
    sources_scanned = Column(Integer, default=0)
    items_discovered = Column(Integer, default=0)
    items_filtered = Column(Integer, default=0)
    posts_generated = Column(Integer, default=0)
    posts_published = Column(Integer, default=0)
    posts_pending_approval = Column(Integer, default=0)

    error_message = Column(Text, nullable=True)
    log = Column(JSON, nullable=True)  # Detailed step log

    # Related candidates
    candidates = relationship('BlogContentCandidate', back_populates='run', cascade='all, delete-orphan')

    def to_dict(self):
        base = self.to_dict_base()
        base.update({
            'id': self.id,
            'automationId': self.automation_id,
            'status': self.status,
            'startedAt': self.started_at.isoformat() if self.started_at else None,
            'completedAt': self.completed_at.isoformat() if self.completed_at else None,
            'triggerType': self.trigger_type,
            'sourcesScanned': self.sources_scanned,
            'itemsDiscovered': self.items_discovered,
            'itemsFiltered': self.items_filtered,
            'postsGenerated': self.posts_generated,
            'postsPublished': self.posts_published,
            'postsPendingApproval': self.posts_pending_approval,
            'errorMessage': self.error_message,
        })
        return base

    __table_args__ = (
        Index('ix_blog_run_status', 'automation_id', 'status'),
    )


class BlogContentCandidate(BaseModel):
    """Discovered content item from source scan."""
    __tablename__ = 'blog_content_candidates'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("bcc"))

    run_id = Column(String(50), ForeignKey('blog_automation_runs.id'), nullable=False, index=True)
    run = relationship('BlogAutomationRun', back_populates='candidates')

    # Source info
    source_url = Column(String(1000), nullable=False)
    source_title = Column(String(500), nullable=True)
    source_name = Column(String(255), nullable=True)
    source_published_at = Column(DateTime, nullable=True)

    # Scoring
    relevance_score = Column(Float, default=0.0)
    quality_score = Column(Float, default=0.0)
    digest_worthiness = Column(Float, default=0.0)

    # Processed content
    status = Column(String(20), default='discovered')  # discovered | filtered | rewritten | approved | published | rejected
    rewritten_title = Column(String(500), nullable=True)
    rewritten_content = Column(Text, nullable=True)
    rewritten_excerpt = Column(Text, nullable=True)
    citations = Column(JSON, nullable=True)  # [{"title": "...", "url": "..."}]
    image_url = Column(String(500), nullable=True)
    image_source = Column(String(50), nullable=True)  # 'unsplash' | 'pexels' | 'ai'

    # Translation
    translations = Column(JSON, nullable=True)  # {"en": {"title": "...", "content": "..."}}

    # Blog post reference (after publishing)
    post_id = Column(String(50), ForeignKey('posts.id'), nullable=True)
    post = relationship('Post')

    # Dedup
    content_hash = Column(String(64), nullable=True, index=True)

    def to_dict(self):
        base = self.to_dict_base()
        base.update({
            'id': self.id,
            'runId': self.run_id,
            'sourceUrl': self.source_url,
            'sourceTitle': self.source_title,
            'sourceName': self.source_name,
            'sourcePublishedAt': self.source_published_at.isoformat() if self.source_published_at else None,
            'relevanceScore': self.relevance_score,
            'qualityScore': self.quality_score,
            'digestWorthiness': self.digest_worthiness,
            'status': self.status,
            'rewrittenTitle': self.rewritten_title,
            'rewrittenContent': self.rewritten_content,
            'rewrittenExcerpt': self.rewritten_excerpt,
            'citations': self.citations or [],
            'imageUrl': self.image_url,
            'imageSource': self.image_source,
            'translations': self.translations or {},
            'postId': self.post_id,
            'contentHash': self.content_hash,
        })
        return base


class BlogSocialConnection(BaseModel):
    """Social platform connection for auto-sharing."""
    __tablename__ = 'blog_social_connections'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("bsc"))

    platform = Column(String(30), nullable=False, index=True)  # 'linkedin' | 'twitter' | 'facebook' | 'instagram'
    is_active = Column(Boolean, default=False)
    display_name = Column(String(255), nullable=True)

    # Auth credentials (encrypted in production)
    api_key = Column(Text, nullable=True)
    api_secret = Column(Text, nullable=True)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)

    # Platform-specific settings
    default_hashtags = Column(JSON, nullable=True)
    post_template = Column(Text, nullable=True)
    max_chars = Column(Integer, nullable=True)
    include_image = Column(Boolean, default=True)
    include_link = Column(Boolean, default=True)

    # Stats
    total_posts_shared = Column(Integer, default=0)
    last_shared_at = Column(DateTime, nullable=True)
    last_error = Column(Text, nullable=True)

    def to_dict(self):
        base = self.to_dict_base()
        base.update({
            'id': self.id,
            'platform': self.platform,
            'isActive': self.is_active,
            'displayName': self.display_name,
            'hasApiKey': bool(self.api_key),
            'hasAccessToken': bool(self.access_token),
            'tokenExpiresAt': self.token_expires_at.isoformat() if self.token_expires_at else None,
            'defaultHashtags': self.default_hashtags or [],
            'postTemplate': self.post_template,
            'maxChars': self.max_chars,
            'includeImage': self.include_image,
            'includeLink': self.include_link,
            'totalPostsShared': self.total_posts_shared,
            'lastSharedAt': self.last_shared_at.isoformat() if self.last_shared_at else None,
            'lastError': self.last_error,
        })
        return base


class BlogToneTemplate(BaseModel):
    """Tone/style template for content generation."""
    __tablename__ = 'blog_tone_templates'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("btt"))

    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    sector = Column(String(50), nullable=True, index=True)

    # Tone controls
    tone = Column(String(50), default='professional')  # professional | casual | academic | conversational
    voice = Column(String(50), default='authoritative')  # authoritative | friendly | expert | neutral
    formality_level = Column(Integer, default=7)  # 1-10

    # KOL inspiration (style reference, NOT impersonation)
    kol_style_reference = Column(Text, nullable=True)  # "Write like a senior audiologist explaining to peers"
    brand_guidelines = Column(Text, nullable=True)

    # Output structure
    include_key_takeaways = Column(Boolean, default=True)
    include_practical_implications = Column(Boolean, default=True)
    include_cta = Column(Boolean, default=True)
    max_word_count = Column(Integer, default=800)

    # System prompt template for AI
    system_prompt = Column(Text, nullable=True)

    def to_dict(self):
        base = self.to_dict_base()
        base.update({
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'sector': self.sector,
            'tone': self.tone,
            'voice': self.voice,
            'formalityLevel': self.formality_level,
            'kolStyleReference': self.kol_style_reference,
            'brandGuidelines': self.brand_guidelines,
            'includeKeyTakeaways': self.include_key_takeaways,
            'includePracticalImplications': self.include_practical_implications,
            'includeCta': self.include_cta,
            'maxWordCount': self.max_word_count,
            'systemPrompt': self.system_prompt,
        })
        return base


class BlogSocialDistributionJob(BaseModel):
    """Track social media posting jobs."""
    __tablename__ = 'blog_social_distribution_jobs'

    id = Column(String(50), primary_key=True, default=lambda: gen_id("bsj"))

    post_id = Column(String(50), ForeignKey('posts.id'), nullable=False, index=True)
    connection_id = Column(String(50), ForeignKey('blog_social_connections.id'), nullable=False)
    connection = relationship('BlogSocialConnection')

    platform = Column(String(30), nullable=False)
    status = Column(String(20), default='pending')  # pending | posted | failed | cancelled
    scheduled_at = Column(DateTime, nullable=True)
    posted_at = Column(DateTime, nullable=True)

    # Content sent
    content_text = Column(Text, nullable=True)
    image_url = Column(String(500), nullable=True)
    link_url = Column(String(500), nullable=True)

    # Platform response
    platform_post_id = Column(String(255), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)

    def to_dict(self):
        base = self.to_dict_base()
        base.update({
            'id': self.id,
            'postId': self.post_id,
            'connectionId': self.connection_id,
            'platform': self.platform,
            'status': self.status,
            'scheduledAt': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'postedAt': self.posted_at.isoformat() if self.posted_at else None,
            'contentText': self.content_text,
            'imageUrl': self.image_url,
            'linkUrl': self.link_url,
            'platformPostId': self.platform_post_id,
            'errorMessage': self.error_message,
            'retryCount': self.retry_count,
        })
        return base
