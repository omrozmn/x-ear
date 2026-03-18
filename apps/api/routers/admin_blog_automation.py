"""
Admin Blog Automation Router

CRUD endpoints for blog automation management:
- Automations, Sources, Runs, Candidates
- Social connections, Tone templates
- Analytics, Manual triggers
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone

from database import get_db
from core.dependencies import get_current_admin_user
from core.models.blog_automation import (
    BlogAutomation, BlogSource, BlogAutomationRun,
    BlogContentCandidate, BlogSocialConnection,
    BlogToneTemplate, BlogSocialDistributionJob,
)
from schemas.blog_automation import (
    BlogAutomationCreate, BlogAutomationUpdate, BlogAutomationRead,
    BlogSourceCreate, BlogSourceUpdate, BlogSourceRead,
    BlogAutomationRunRead, BlogContentCandidateRead, BlogContentCandidateAction,
    BlogSocialConnectionCreate, BlogSocialConnectionUpdate, BlogSocialConnectionRead,
    BlogToneTemplateCreate, BlogToneTemplateUpdate, BlogToneTemplateRead,
    BlogAutomationStats,
)

router = APIRouter(prefix="/admin/blog-automation", tags=["Admin Blog Automation"])


# ── Automations CRUD ────────────────────────────────

@router.get("/", operation_id="listBlogAutomations", response_model=List[BlogAutomationRead])
def list_automations(
    sector: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None, alias="isActive"),
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    q = db.query(BlogAutomation).order_by(BlogAutomation.created_at.desc())
    if sector:
        q = q.filter(BlogAutomation.sector == sector)
    if is_active is not None:
        q = q.filter(BlogAutomation.is_active == is_active)
    return q.all()


@router.post("/", operation_id="createBlogAutomation", response_model=BlogAutomationRead)
def create_automation(
    data: BlogAutomationCreate,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = BlogAutomation(**data.model_dump(exclude_unset=True, by_alias=False))
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{automation_id}", operation_id="getBlogAutomation", response_model=BlogAutomationRead)
def get_automation(
    automation_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogAutomation).filter(BlogAutomation.id == automation_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Automation not found")
    return obj


@router.put("/{automation_id}", operation_id="updateBlogAutomation", response_model=BlogAutomationRead)
def update_automation(
    automation_id: str,
    data: BlogAutomationUpdate,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogAutomation).filter(BlogAutomation.id == automation_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Automation not found")
    for field, value in data.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{automation_id}", operation_id="deleteBlogAutomation")
def delete_automation(
    automation_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogAutomation).filter(BlogAutomation.id == automation_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Automation not found")
    db.delete(obj)
    db.commit()
    return {"message": "Automation deleted"}


@router.post("/{automation_id}/duplicate", operation_id="duplicateBlogAutomation", response_model=BlogAutomationRead)
def duplicate_automation(
    automation_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    orig = db.query(BlogAutomation).filter(BlogAutomation.id == automation_id).first()
    if not orig:
        raise HTTPException(status_code=404, detail="Automation not found")
    new_obj = BlogAutomation(
        name=f"{orig.name} (Kopya)",
        description=orig.description,
        is_active=False,
        sector=orig.sector,
        target_category=orig.target_category,
        schedule_type=orig.schedule_type,
        schedule_interval_hours=orig.schedule_interval_hours,
        schedule_cron=orig.schedule_cron,
        keywords=orig.keywords,
        negative_keywords=orig.negative_keywords,
        content_types=orig.content_types,
        min_source_quality=orig.min_source_quality,
        primary_language=orig.primary_language,
        target_languages=orig.target_languages,
        tone_template_id=orig.tone_template_id,
        target_audience=orig.target_audience,
        summary_depth=orig.summary_depth,
        citation_style=orig.citation_style,
        cta_text=orig.cta_text,
        image_source=orig.image_source,
        image_fallback=orig.image_fallback,
        auto_share_enabled=orig.auto_share_enabled,
        social_platforms=orig.social_platforms,
        approval_mode=orig.approval_mode,
        confidence_threshold=orig.confidence_threshold,
        dedup_window_days=orig.dedup_window_days,
    )
    db.add(new_obj)
    # Duplicate sources
    for src in orig.sources:
        new_src = BlogSource(
            automation_id=new_obj.id,
            name=src.name,
            url=src.url,
            source_type=src.source_type,
            is_active=src.is_active,
            priority=src.priority,
            trust_score=src.trust_score,
        )
        db.add(new_src)
    db.commit()
    db.refresh(new_obj)
    return new_obj


# ── Toggle active ────────────────────────────────

@router.post("/{automation_id}/toggle", operation_id="toggleBlogAutomation", response_model=BlogAutomationRead)
def toggle_automation(
    automation_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogAutomation).filter(BlogAutomation.id == automation_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Automation not found")
    obj.is_active = not obj.is_active
    db.commit()
    db.refresh(obj)
    return obj


# ── Manual Run ────────────────────────────────

@router.post("/{automation_id}/run", operation_id="triggerBlogAutomationRun", response_model=BlogAutomationRunRead)
def trigger_run(
    automation_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogAutomation).filter(BlogAutomation.id == automation_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Automation not found")
    # Check if already running
    running = db.query(BlogAutomationRun).filter(
        BlogAutomationRun.automation_id == automation_id,
        BlogAutomationRun.status == 'running'
    ).first()
    if running:
        raise HTTPException(status_code=409, detail="Automation is already running")
    run = BlogAutomationRun(
        automation_id=automation_id,
        status='pending',
        trigger_type='manual',
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    # Trigger async processing
    try:
        from services.blog_content_pipeline import execute_automation_run
        execute_automation_run(run.id)
    except Exception:
        pass  # Pipeline will pick it up
    return run


# ── Sources CRUD ────────────────────────────────

@router.get("/{automation_id}/sources", operation_id="listBlogSources", response_model=List[BlogSourceRead])
def list_sources(
    automation_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    return db.query(BlogSource).filter(
        BlogSource.automation_id == automation_id
    ).order_by(BlogSource.priority.desc()).all()


@router.post("/sources", operation_id="createBlogSource", response_model=BlogSourceRead)
def create_source(
    data: BlogSourceCreate,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    # Verify automation exists
    auto = db.query(BlogAutomation).filter(BlogAutomation.id == data.automation_id).first()
    if not auto:
        raise HTTPException(status_code=404, detail="Automation not found")
    obj = BlogSource(**data.model_dump(exclude_unset=True, by_alias=False))
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/sources/{source_id}", operation_id="updateBlogSource", response_model=BlogSourceRead)
def update_source(
    source_id: str,
    data: BlogSourceUpdate,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogSource).filter(BlogSource.id == source_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Source not found")
    for field, value in data.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/sources/{source_id}", operation_id="deleteBlogSource")
def delete_source(
    source_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogSource).filter(BlogSource.id == source_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Source not found")
    db.delete(obj)
    db.commit()
    return {"message": "Source deleted"}


# ── Runs ────────────────────────────────

@router.get("/{automation_id}/runs", operation_id="listBlogAutomationRuns", response_model=List[BlogAutomationRunRead])
def list_runs(
    automation_id: str,
    limit: int = Query(20, le=100),
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    return db.query(BlogAutomationRun).filter(
        BlogAutomationRun.automation_id == automation_id
    ).order_by(BlogAutomationRun.created_at.desc()).limit(limit).all()


@router.get("/runs/{run_id}", operation_id="getBlogAutomationRun", response_model=BlogAutomationRunRead)
def get_run(
    run_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogAutomationRun).filter(BlogAutomationRun.id == run_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Run not found")
    return obj


# ── Candidates (Approval Queue) ────────────────────────────────

@router.get("/runs/{run_id}/candidates", operation_id="listBlogContentCandidates", response_model=List[BlogContentCandidateRead])
def list_candidates(
    run_id: str,
    status: Optional[str] = None,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    q = db.query(BlogContentCandidate).filter(BlogContentCandidate.run_id == run_id)
    if status:
        q = q.filter(BlogContentCandidate.status == status)
    return q.order_by(BlogContentCandidate.digest_worthiness.desc()).all()


@router.get("/approval-queue", operation_id="listPendingApproval", response_model=List[BlogContentCandidateRead])
def list_pending_approval(
    sector: Optional[str] = None,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    q = db.query(BlogContentCandidate).filter(
        BlogContentCandidate.status == 'rewritten'
    )
    if sector:
        q = q.join(BlogAutomationRun).join(BlogAutomation).filter(
            BlogAutomation.sector == sector
        )
    return q.order_by(BlogContentCandidate.digest_worthiness.desc()).all()


@router.post("/candidates/{candidate_id}/action", operation_id="actionBlogContentCandidate")
def action_candidate(
    candidate_id: str,
    data: BlogContentCandidateAction,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    candidate = db.query(BlogContentCandidate).filter(BlogContentCandidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    if data.action == 'approve':
        candidate.status = 'approved'
        # Create blog post from candidate
        from core.models.post import Post
        slug = Post.generate_slug(candidate.rewritten_title or "untitled")
        # Check slug uniqueness
        existing = db.query(Post).filter(Post.slug == slug).first()
        if existing:
            slug = f"{slug}-{candidate.id[:6]}"
        run = db.query(BlogAutomationRun).filter(BlogAutomationRun.id == candidate.run_id).first()
        automation = db.query(BlogAutomation).filter(BlogAutomation.id == run.automation_id).first() if run else None
        post = Post(
            title=candidate.rewritten_title or "Untitled",
            slug=slug,
            content=candidate.rewritten_content or "",
            excerpt=candidate.rewritten_excerpt,
            image_url=candidate.image_url,
            category=automation.target_category or automation.sector if automation else None,
            is_published=automation.approval_mode == 'full_auto' if automation else False,
            published_at=datetime.now(timezone.utc) if (automation and automation.approval_mode == 'full_auto') else None,
        )
        db.add(post)
        db.flush()
        candidate.post_id = post.id
        if run:
            run.posts_generated += 1
            if post.is_published:
                run.posts_published += 1
    elif data.action == 'reject':
        candidate.status = 'rejected'
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")
    db.commit()
    return {"message": f"Candidate {data.action}d", "postId": candidate.post_id}


# ── Social Connections ────────────────────────────────

@router.get("/social-connections", operation_id="listBlogSocialConnections", response_model=List[BlogSocialConnectionRead])
def list_social_connections(
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    return db.query(BlogSocialConnection).order_by(BlogSocialConnection.platform).all()


@router.post("/social-connections", operation_id="createBlogSocialConnection", response_model=BlogSocialConnectionRead)
def create_social_connection(
    data: BlogSocialConnectionCreate,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = BlogSocialConnection(**data.model_dump(exclude_unset=True, by_alias=False))
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/social-connections/{connection_id}", operation_id="updateBlogSocialConnection", response_model=BlogSocialConnectionRead)
def update_social_connection(
    connection_id: str,
    data: BlogSocialConnectionUpdate,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogSocialConnection).filter(BlogSocialConnection.id == connection_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Connection not found")
    for field, value in data.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/social-connections/{connection_id}", operation_id="deleteBlogSocialConnection")
def delete_social_connection(
    connection_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogSocialConnection).filter(BlogSocialConnection.id == connection_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Connection not found")
    db.delete(obj)
    db.commit()
    return {"message": "Connection deleted"}


@router.post("/social-connections/{connection_id}/toggle", operation_id="toggleBlogSocialConnection", response_model=BlogSocialConnectionRead)
def toggle_social_connection(
    connection_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogSocialConnection).filter(BlogSocialConnection.id == connection_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Connection not found")
    obj.is_active = not obj.is_active
    db.commit()
    db.refresh(obj)
    return obj


# ── Tone Templates ────────────────────────────────

@router.get("/tone-templates", operation_id="listBlogToneTemplates", response_model=List[BlogToneTemplateRead])
def list_tone_templates(
    sector: Optional[str] = None,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    q = db.query(BlogToneTemplate)
    if sector:
        q = q.filter((BlogToneTemplate.sector == sector) | (BlogToneTemplate.sector.is_(None)))
    return q.order_by(BlogToneTemplate.name).all()


@router.post("/tone-templates", operation_id="createBlogToneTemplate", response_model=BlogToneTemplateRead)
def create_tone_template(
    data: BlogToneTemplateCreate,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = BlogToneTemplate(**data.model_dump(exclude_unset=True, by_alias=False))
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/tone-templates/{template_id}", operation_id="updateBlogToneTemplate", response_model=BlogToneTemplateRead)
def update_tone_template(
    template_id: str,
    data: BlogToneTemplateUpdate,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogToneTemplate).filter(BlogToneTemplate.id == template_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")
    for field, value in data.model_dump(exclude_unset=True, by_alias=False).items():
        setattr(obj, field, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/tone-templates/{template_id}", operation_id="deleteBlogToneTemplate")
def delete_tone_template(
    template_id: str,
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    obj = db.query(BlogToneTemplate).filter(BlogToneTemplate.id == template_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Template not found")
    db.delete(obj)
    db.commit()
    return {"message": "Template deleted"}


# ── Analytics ────────────────────────────────

@router.get("/stats", operation_id="getBlogAutomationStats", response_model=BlogAutomationStats)
def get_stats(
    current_user=Depends(get_current_admin_user),
    db: Session = Depends(get_db),
):
    total = db.query(func.count(BlogAutomation.id)).scalar() or 0
    active = db.query(func.count(BlogAutomation.id)).filter(BlogAutomation.is_active == True).scalar() or 0
    generated = db.query(func.coalesce(func.sum(BlogAutomation.total_posts_generated), 0)).scalar()
    published = db.query(func.coalesce(func.sum(BlogAutomation.total_posts_published), 0)).scalar()
    pending = db.query(func.count(BlogContentCandidate.id)).filter(
        BlogContentCandidate.status == 'rewritten'
    ).scalar() or 0
    total_sources = db.query(func.count(BlogSource.id)).scalar() or 0
    active_social = db.query(func.count(BlogSocialConnection.id)).filter(
        BlogSocialConnection.is_active == True
    ).scalar() or 0

    # Posts by sector
    sector_counts = db.query(
        BlogAutomation.sector,
        func.coalesce(func.sum(BlogAutomation.total_posts_published), 0)
    ).group_by(BlogAutomation.sector).all()
    posts_by_sector = {s: int(c) for s, c in sector_counts}

    return BlogAutomationStats(
        total_automations=total,
        active_automations=active,
        total_posts_generated=int(generated),
        total_posts_published=int(published),
        pending_approval=pending,
        total_sources=total_sources,
        active_social_connections=active_social,
        posts_by_sector=posts_by_sector,
    )
