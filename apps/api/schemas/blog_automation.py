"""
Blog Automation Schemas - Pydantic models for request/response validation.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import Field
from .base import AppBaseModel, IDMixin, TimestampMixin


# ── BlogAutomation ────────────────────────────────

class BlogAutomationBase(AppBaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    sector: str = Field(..., max_length=50)
    target_category: Optional[str] = Field(None, alias="targetCategory")
    schedule_type: str = Field("interval", alias="scheduleType")
    schedule_interval_hours: int = Field(24, alias="scheduleIntervalHours")
    schedule_cron: Optional[str] = Field(None, alias="scheduleCron")
    keywords: Optional[List[str]] = None
    negative_keywords: Optional[List[str]] = Field(None, alias="negativeKeywords")
    content_types: Optional[List[str]] = Field(None, alias="contentTypes")
    min_source_quality: float = Field(0.5, alias="minSourceQuality")
    primary_language: str = Field("tr", alias="primaryLanguage")
    target_languages: Optional[List[str]] = Field(None, alias="targetLanguages")
    tone_template_id: Optional[str] = Field(None, alias="toneTemplateId")
    target_audience: Optional[str] = Field(None, alias="targetAudience")
    summary_depth: str = Field("medium", alias="summaryDepth")
    citation_style: str = Field("inline", alias="citationStyle")
    cta_text: Optional[str] = Field(None, alias="ctaText")
    image_source: str = Field("unsplash", alias="imageSource")
    image_fallback: str = Field("unsplash", alias="imageFallback")
    image_keywords_override: Optional[List[str]] = Field(None, alias="imageKeywordsOverride")
    auto_share_enabled: bool = Field(False, alias="autoShareEnabled")
    social_platforms: Optional[Dict[str, bool]] = Field(None, alias="socialPlatforms")
    approval_mode: str = Field("manual", alias="approvalMode")
    confidence_threshold: float = Field(0.7, alias="confidenceThreshold")
    dedup_window_days: int = Field(30, alias="dedupWindowDays")


class BlogAutomationCreate(BlogAutomationBase):
    is_active: bool = Field(False, alias="isActive")


class BlogAutomationUpdate(AppBaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    is_active: Optional[bool] = Field(None, alias="isActive")
    sector: Optional[str] = None
    target_category: Optional[str] = Field(None, alias="targetCategory")
    schedule_type: Optional[str] = Field(None, alias="scheduleType")
    schedule_interval_hours: Optional[int] = Field(None, alias="scheduleIntervalHours")
    schedule_cron: Optional[str] = Field(None, alias="scheduleCron")
    keywords: Optional[List[str]] = None
    negative_keywords: Optional[List[str]] = Field(None, alias="negativeKeywords")
    content_types: Optional[List[str]] = Field(None, alias="contentTypes")
    min_source_quality: Optional[float] = Field(None, alias="minSourceQuality")
    primary_language: Optional[str] = Field(None, alias="primaryLanguage")
    target_languages: Optional[List[str]] = Field(None, alias="targetLanguages")
    tone_template_id: Optional[str] = Field(None, alias="toneTemplateId")
    target_audience: Optional[str] = Field(None, alias="targetAudience")
    summary_depth: Optional[str] = Field(None, alias="summaryDepth")
    citation_style: Optional[str] = Field(None, alias="citationStyle")
    cta_text: Optional[str] = Field(None, alias="ctaText")
    image_source: Optional[str] = Field(None, alias="imageSource")
    image_fallback: Optional[str] = Field(None, alias="imageFallback")
    image_keywords_override: Optional[List[str]] = Field(None, alias="imageKeywordsOverride")
    auto_share_enabled: Optional[bool] = Field(None, alias="autoShareEnabled")
    social_platforms: Optional[Dict[str, bool]] = Field(None, alias="socialPlatforms")
    approval_mode: Optional[str] = Field(None, alias="approvalMode")
    confidence_threshold: Optional[float] = Field(None, alias="confidenceThreshold")
    dedup_window_days: Optional[int] = Field(None, alias="dedupWindowDays")


class BlogAutomationRead(BlogAutomationBase, IDMixin, TimestampMixin):
    is_active: bool = Field(False, alias="isActive")
    total_runs: int = Field(0, alias="totalRuns")
    total_posts_generated: int = Field(0, alias="totalPostsGenerated")
    total_posts_published: int = Field(0, alias="totalPostsPublished")
    last_run_at: Optional[datetime] = Field(None, alias="lastRunAt")
    sources_count: int = Field(0, alias="sourcesCount")


# ── BlogSource ────────────────────────────────

class BlogSourceBase(AppBaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    url: str = Field(..., max_length=1000)
    source_type: str = Field("rss", alias="sourceType")
    is_active: bool = Field(True, alias="isActive")
    priority: int = Field(5, ge=1, le=10)
    trust_score: float = Field(0.7, ge=0.0, le=1.0, alias="trustScore")


class BlogSourceCreate(BlogSourceBase):
    automation_id: str = Field(..., alias="automationId")


class BlogSourceUpdate(AppBaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    url: Optional[str] = Field(None, max_length=1000)
    source_type: Optional[str] = Field(None, alias="sourceType")
    is_active: Optional[bool] = Field(None, alias="isActive")
    priority: Optional[int] = Field(None, ge=1, le=10)
    trust_score: Optional[float] = Field(None, ge=0.0, le=1.0, alias="trustScore")


class BlogSourceRead(BlogSourceBase, IDMixin, TimestampMixin):
    automation_id: str = Field(..., alias="automationId")
    last_fetched_at: Optional[datetime] = Field(None, alias="lastFetchedAt")
    last_error: Optional[str] = Field(None, alias="lastError")
    consecutive_failures: int = Field(0, alias="consecutiveFailures")
    total_items_fetched: int = Field(0, alias="totalItemsFetched")


# ── BlogAutomationRun ────────────────────────────────

class BlogAutomationRunRead(AppBaseModel, IDMixin, TimestampMixin):
    automation_id: str = Field(..., alias="automationId")
    status: str
    started_at: Optional[datetime] = Field(None, alias="startedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")
    trigger_type: str = Field("scheduled", alias="triggerType")
    sources_scanned: int = Field(0, alias="sourcesScanned")
    items_discovered: int = Field(0, alias="itemsDiscovered")
    items_filtered: int = Field(0, alias="itemsFiltered")
    posts_generated: int = Field(0, alias="postsGenerated")
    posts_published: int = Field(0, alias="postsPublished")
    posts_pending_approval: int = Field(0, alias="postsPendingApproval")
    error_message: Optional[str] = Field(None, alias="errorMessage")


# ── BlogContentCandidate ────────────────────────────────

class BlogContentCandidateRead(AppBaseModel, IDMixin, TimestampMixin):
    run_id: str = Field(..., alias="runId")
    source_url: str = Field(..., alias="sourceUrl")
    source_title: Optional[str] = Field(None, alias="sourceTitle")
    source_name: Optional[str] = Field(None, alias="sourceName")
    relevance_score: float = Field(0.0, alias="relevanceScore")
    quality_score: float = Field(0.0, alias="qualityScore")
    digest_worthiness: float = Field(0.0, alias="digestWorthiness")
    status: str
    rewritten_title: Optional[str] = Field(None, alias="rewrittenTitle")
    rewritten_content: Optional[str] = Field(None, alias="rewrittenContent")
    rewritten_excerpt: Optional[str] = Field(None, alias="rewrittenExcerpt")
    citations: Optional[List[Dict[str, str]]] = None
    image_url: Optional[str] = Field(None, alias="imageUrl")
    image_source: Optional[str] = Field(None, alias="imageSource")
    translations: Optional[Dict[str, Any]] = None
    post_id: Optional[str] = Field(None, alias="postId")


class BlogContentCandidateAction(AppBaseModel):
    """Action on a content candidate (approve/reject)."""
    action: str = Field(..., description="approve | reject")
    notes: Optional[str] = None


# ── BlogSocialConnection ────────────────────────────────

class BlogSocialConnectionBase(AppBaseModel):
    platform: str = Field(..., max_length=30)
    is_active: bool = Field(False, alias="isActive")
    display_name: Optional[str] = Field(None, alias="displayName")
    default_hashtags: Optional[List[str]] = Field(None, alias="defaultHashtags")
    post_template: Optional[str] = Field(None, alias="postTemplate")
    max_chars: Optional[int] = Field(None, alias="maxChars")
    include_image: bool = Field(True, alias="includeImage")
    include_link: bool = Field(True, alias="includeLink")


class BlogSocialConnectionCreate(BlogSocialConnectionBase):
    api_key: Optional[str] = Field(None, alias="apiKey")
    api_secret: Optional[str] = Field(None, alias="apiSecret")
    access_token: Optional[str] = Field(None, alias="accessToken")
    refresh_token: Optional[str] = Field(None, alias="refreshToken")


class BlogSocialConnectionUpdate(AppBaseModel):
    is_active: Optional[bool] = Field(None, alias="isActive")
    display_name: Optional[str] = Field(None, alias="displayName")
    api_key: Optional[str] = Field(None, alias="apiKey")
    api_secret: Optional[str] = Field(None, alias="apiSecret")
    access_token: Optional[str] = Field(None, alias="accessToken")
    refresh_token: Optional[str] = Field(None, alias="refreshToken")
    default_hashtags: Optional[List[str]] = Field(None, alias="defaultHashtags")
    post_template: Optional[str] = Field(None, alias="postTemplate")
    max_chars: Optional[int] = Field(None, alias="maxChars")
    include_image: Optional[bool] = Field(None, alias="includeImage")
    include_link: Optional[bool] = Field(None, alias="includeLink")


class BlogSocialConnectionRead(BlogSocialConnectionBase, IDMixin, TimestampMixin):
    has_api_key: bool = Field(False, alias="hasApiKey")
    has_access_token: bool = Field(False, alias="hasAccessToken")
    token_expires_at: Optional[datetime] = Field(None, alias="tokenExpiresAt")
    total_posts_shared: int = Field(0, alias="totalPostsShared")
    last_shared_at: Optional[datetime] = Field(None, alias="lastSharedAt")
    last_error: Optional[str] = Field(None, alias="lastError")


# ── BlogToneTemplate ────────────────────────────────

class BlogToneTemplateBase(AppBaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    description: Optional[str] = None
    sector: Optional[str] = None
    tone: str = Field("professional")
    voice: str = Field("authoritative")
    formality_level: int = Field(7, ge=1, le=10, alias="formalityLevel")
    kol_style_reference: Optional[str] = Field(None, alias="kolStyleReference")
    brand_guidelines: Optional[str] = Field(None, alias="brandGuidelines")
    include_key_takeaways: bool = Field(True, alias="includeKeyTakeaways")
    include_practical_implications: bool = Field(True, alias="includePracticalImplications")
    include_cta: bool = Field(True, alias="includeCta")
    max_word_count: int = Field(800, alias="maxWordCount")
    system_prompt: Optional[str] = Field(None, alias="systemPrompt")


class BlogToneTemplateCreate(BlogToneTemplateBase):
    pass


class BlogToneTemplateUpdate(AppBaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    description: Optional[str] = None
    sector: Optional[str] = None
    tone: Optional[str] = None
    voice: Optional[str] = None
    formality_level: Optional[int] = Field(None, ge=1, le=10, alias="formalityLevel")
    kol_style_reference: Optional[str] = Field(None, alias="kolStyleReference")
    brand_guidelines: Optional[str] = Field(None, alias="brandGuidelines")
    include_key_takeaways: Optional[bool] = Field(None, alias="includeKeyTakeaways")
    include_practical_implications: Optional[bool] = Field(None, alias="includePracticalImplications")
    include_cta: Optional[bool] = Field(None, alias="includeCta")
    max_word_count: Optional[int] = Field(None, alias="maxWordCount")
    system_prompt: Optional[str] = Field(None, alias="systemPrompt")


class BlogToneTemplateRead(BlogToneTemplateBase, IDMixin, TimestampMixin):
    pass


# ── Analytics ────────────────────────────────

class BlogAutomationStats(AppBaseModel):
    total_automations: int = Field(0, alias="totalAutomations")
    active_automations: int = Field(0, alias="activeAutomations")
    total_posts_generated: int = Field(0, alias="totalPostsGenerated")
    total_posts_published: int = Field(0, alias="totalPostsPublished")
    pending_approval: int = Field(0, alias="pendingApproval")
    total_sources: int = Field(0, alias="totalSources")
    active_social_connections: int = Field(0, alias="activeSocialConnections")
    posts_by_sector: Dict[str, int] = Field(default_factory=dict, alias="postsBySector")
