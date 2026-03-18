"""
Blog Content Pipeline

Full pipeline: source fetching → parsing → dedup → scoring → rewriting → image → translate → publish

Each stage is a discrete function for testability and composability.
"""

import logging
import hashlib
import re
from datetime import datetime, timezone, timedelta
from typing import List, Dict, Optional, Any

from database import SessionLocal

logger = logging.getLogger(__name__)


# ── Stage 1: Source Fetching ────────────────────────────────

def fetch_rss_feed(url: str, timeout: int = 30) -> List[Dict[str, Any]]:
    """Fetch and parse an RSS/Atom feed. Returns list of items."""
    try:
        import feedparser
        feed = feedparser.parse(url)
        items = []
        for entry in feed.entries[:50]:  # Cap at 50 per feed
            items.append({
                'title': getattr(entry, 'title', ''),
                'link': getattr(entry, 'link', ''),
                'summary': getattr(entry, 'summary', ''),
                'content': getattr(entry, 'content', [{}])[0].get('value', '') if hasattr(entry, 'content') else '',
                'published': getattr(entry, 'published', ''),
                'source_name': getattr(feed.feed, 'title', url),
            })
        return items
    except Exception as e:
        logger.error(f"Failed to fetch RSS feed {url}: {e}")
        return []


def fetch_sources(source_records) -> List[Dict[str, Any]]:
    """Fetch all active sources and return combined items."""
    all_items = []
    for src in source_records:
        if not src.is_active:
            continue
        items = []
        if src.source_type in ('rss', 'blog', 'sitemap'):
            items = fetch_rss_feed(src.url)
        for item in items:
            item['source_id'] = src.id
            item['source_priority'] = src.priority
            item['trust_score'] = src.trust_score
        all_items.extend(items)
        # Update source stats
        src.last_fetched_at = datetime.now(timezone.utc)
        src.total_items_fetched += len(items)
        if not items:
            src.consecutive_failures += 1
        else:
            src.consecutive_failures = 0
            src.last_error = None
    return all_items


# ── Stage 2: Deduplication ────────────────────────────────

def compute_content_hash(title: str, link: str) -> str:
    """Generate a hash for dedup."""
    raw = f"{title.lower().strip()}|{link.lower().strip()}"
    return hashlib.sha256(raw.encode()).hexdigest()


def deduplicate(items: List[Dict], automation_id: str, window_days: int = 30) -> List[Dict]:
    """Remove items that were already processed in the dedup window."""
    from core.models.blog_automation import BlogContentCandidate
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)
        existing_hashes = set()
        existing = db.query(BlogContentCandidate.content_hash).filter(
            BlogContentCandidate.created_at >= cutoff,
            BlogContentCandidate.content_hash.isnot(None),
        ).all()
        existing_hashes = {h[0] for h in existing}

        unique = []
        seen = set()
        for item in items:
            h = compute_content_hash(item.get('title', ''), item.get('link', ''))
            if h not in existing_hashes and h not in seen:
                item['content_hash'] = h
                unique.append(item)
                seen.add(h)
        return unique
    finally:
        db.close()


# ── Stage 3: Relevance Scoring ────────────────────────────────

def score_relevance(items: List[Dict], keywords: List[str], negative_keywords: List[str]) -> List[Dict]:
    """Score items by keyword match and filter negatives."""
    keywords_lower = [k.lower() for k in (keywords or [])]
    neg_lower = [k.lower() for k in (negative_keywords or [])]

    scored = []
    for item in items:
        text = f"{item.get('title', '')} {item.get('summary', '')}".lower()
        # Negative keyword filter
        if any(nk in text for nk in neg_lower):
            continue
        # Positive scoring
        score = 0.3  # base score
        for kw in keywords_lower:
            if kw in text:
                score += 0.15
        score = min(score, 1.0)
        # Trust score boost
        score = score * 0.7 + item.get('trust_score', 0.5) * 0.3
        item['relevance_score'] = round(score, 3)
        item['quality_score'] = round(item.get('trust_score', 0.5), 3)
        item['digest_worthiness'] = round(score * 0.6 + item.get('trust_score', 0.5) * 0.4, 3)
        scored.append(item)

    # Sort by digest worthiness
    scored.sort(key=lambda x: x['digest_worthiness'], reverse=True)
    return scored


# ── Stage 4: AI Rewriting ────────────────────────────────

def build_rewrite_prompt(item: Dict, automation, tone_template=None) -> str:
    """Build the AI prompt for content rewriting."""
    sector_context = f"Sector: {automation.sector}" if automation else ""
    audience = f"Target audience: {automation.target_audience}" if automation and automation.target_audience else ""
    depth = automation.summary_depth if automation else "medium"

    tone_instructions = ""
    if tone_template:
        tone_instructions = f"""
Tone: {tone_template.tone}
Voice: {tone_template.voice}
Formality: {tone_template.formality_level}/10
{('Style inspiration: ' + tone_template.kol_style_reference) if tone_template.kol_style_reference else ''}
{('Brand guidelines: ' + tone_template.brand_guidelines) if tone_template.brand_guidelines else ''}
"""
    if tone_template and tone_template.system_prompt:
        tone_instructions = tone_template.system_prompt

    depth_map = {
        'short': 'Write a concise 150-200 word summary.',
        'medium': 'Write a comprehensive 400-600 word digest article.',
        'deep': 'Write an in-depth 800-1200 word analysis article.',
    }

    max_words = tone_template.max_word_count if tone_template else 600

    prompt = f"""You are a professional content writer creating a digest-style blog post.

{sector_context}
{audience}
{tone_instructions}

RULES:
- Rewrite and transform the source content - do NOT copy directly
- Summarize key insights and add value
- Cite the original source clearly
- Do NOT hallucinate facts
- Do NOT make medical/legal/financial claims without appropriate caution
- Include "Read more" source link
- {depth_map.get(depth, depth_map['medium'])}
- Maximum {max_words} words

SOURCE ARTICLE:
Title: {item.get('title', 'N/A')}
Content: {item.get('summary', '') or item.get('content', '')}
Source URL: {item.get('link', '')}
Source: {item.get('source_name', '')}

OUTPUT FORMAT (JSON):
{{
  "title": "Rewritten engaging title",
  "excerpt": "1-2 sentence hook",
  "content": "Full rewritten article in HTML format with proper headings, paragraphs. Include Key Takeaways section, Practical Implications section.",
  "citations": [{{"title": "Original article title", "url": "source_url"}}]
}}

Return ONLY valid JSON, no markdown code blocks."""

    return prompt


def rewrite_content(item: Dict, automation, tone_template=None) -> Optional[Dict]:
    """Use AI to rewrite content into a digest-style blog post."""
    import os
    import json

    prompt = build_rewrite_prompt(item, automation, tone_template)

    # Try OpenAI-compatible API (works with Ollama, OpenAI, etc.)
    api_key = os.environ.get('OPENAI_API_KEY', '')
    api_base = os.environ.get('OPENAI_API_BASE', 'https://api.openai.com/v1')
    model = os.environ.get('BLOG_AI_MODEL', 'gpt-4o-mini')

    try:
        import httpx
        response = httpx.post(
            f"{api_base}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.7,
                "max_tokens": 2000,
            },
            timeout=60,
        )
        response.raise_for_status()
        result_text = response.json()['choices'][0]['message']['content']

        # Clean markdown code blocks if present
        result_text = re.sub(r'^```json\s*', '', result_text.strip())
        result_text = re.sub(r'\s*```$', '', result_text.strip())

        return json.loads(result_text)
    except Exception as e:
        logger.error(f"AI rewrite failed: {e}")
        return None


# ── Stage 5: Image Search ────────────────────────────────

def search_unsplash(query: str, count: int = 3) -> List[Dict]:
    """Search Unsplash for images."""
    import os
    api_key = os.environ.get('UNSPLASH_ACCESS_KEY', '')
    if not api_key:
        return []
    try:
        import httpx
        resp = httpx.get(
            "https://api.unsplash.com/search/photos",
            params={"query": query, "per_page": count, "orientation": "landscape"},
            headers={"Authorization": f"Client-ID {api_key}"},
            timeout=15,
        )
        resp.raise_for_status()
        results = resp.json().get('results', [])
        return [
            {
                'url': r['urls']['regular'],
                'thumb': r['urls']['thumb'],
                'alt': r.get('alt_description', query),
                'credit': r['user']['name'],
                'source': 'unsplash',
            }
            for r in results
        ]
    except Exception as e:
        logger.warning(f"Unsplash search failed: {e}")
        return []


def search_pexels(query: str, count: int = 3) -> List[Dict]:
    """Search Pexels for images."""
    import os
    api_key = os.environ.get('PEXELS_API_KEY', '')
    if not api_key:
        return []
    try:
        import httpx
        resp = httpx.get(
            "https://api.pexels.com/v1/search",
            params={"query": query, "per_page": count, "orientation": "landscape"},
            headers={"Authorization": api_key},
            timeout=15,
        )
        resp.raise_for_status()
        results = resp.json().get('photos', [])
        return [
            {
                'url': r['src']['large'],
                'thumb': r['src']['medium'],
                'alt': query,
                'credit': r['photographer'],
                'source': 'pexels',
            }
            for r in results
        ]
    except Exception as e:
        logger.warning(f"Pexels search failed: {e}")
        return []


def find_image(keywords: List[str], image_source: str = 'unsplash', fallback: str = 'pexels') -> Optional[Dict]:
    """Find a suitable image from configured sources."""
    query = ' '.join(keywords[:3]) if keywords else 'technology'

    results = []
    if image_source == 'unsplash':
        results = search_unsplash(query)
    elif image_source == 'pexels':
        results = search_pexels(query)
    elif image_source == 'mixed':
        results = search_unsplash(query) or search_pexels(query)

    if not results and fallback:
        if fallback == 'unsplash':
            results = search_unsplash(query)
        elif fallback == 'pexels':
            results = search_pexels(query)

    return results[0] if results else None


# ── Stage 6: Translation ────────────────────────────────

def translate_content(title: str, content: str, excerpt: str, target_lang: str, source_lang: str = 'tr') -> Optional[Dict]:
    """Translate content to target language via AI."""
    import os
    import json

    api_key = os.environ.get('OPENAI_API_KEY', '')
    api_base = os.environ.get('OPENAI_API_BASE', 'https://api.openai.com/v1')
    model = os.environ.get('BLOG_AI_MODEL', 'gpt-4o-mini')

    prompt = f"""Translate the following blog post from {source_lang} to {target_lang}.
Keep HTML formatting intact. Maintain the meaning and tone.

Title: {title}
Excerpt: {excerpt}
Content: {content}

Return JSON:
{{"title": "translated title", "excerpt": "translated excerpt", "content": "translated content in HTML"}}

Return ONLY valid JSON."""

    try:
        import httpx
        response = httpx.post(
            f"{api_base}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3,
                "max_tokens": 3000,
            },
            timeout=90,
        )
        response.raise_for_status()
        result_text = response.json()['choices'][0]['message']['content']
        result_text = re.sub(r'^```json\s*', '', result_text.strip())
        result_text = re.sub(r'\s*```$', '', result_text.strip())
        return json.loads(result_text)
    except Exception as e:
        logger.error(f"Translation to {target_lang} failed: {e}")
        return None


# ── Main Pipeline Orchestrator ────────────────────────────────

def execute_automation_run(run_id: str):
    """Execute a full automation run pipeline."""
    from core.models.blog_automation import (
        BlogAutomation, BlogSource, BlogAutomationRun,
        BlogContentCandidate, BlogToneTemplate,
    )
    from core.models.post import Post

    db = SessionLocal()
    try:
        run = db.query(BlogAutomationRun).filter(BlogAutomationRun.id == run_id).first()
        if not run:
            logger.error(f"Run {run_id} not found")
            return

        run.status = 'running'
        run.started_at = datetime.now(timezone.utc)
        db.commit()

        automation = db.query(BlogAutomation).filter(BlogAutomation.id == run.automation_id).first()
        if not automation:
            run.status = 'failed'
            run.error_message = 'Automation config not found'
            run.completed_at = datetime.now(timezone.utc)
            db.commit()
            return

        tone_template = None
        if automation.tone_template_id:
            tone_template = db.query(BlogToneTemplate).filter(
                BlogToneTemplate.id == automation.tone_template_id
            ).first()

        # Stage 1: Fetch sources
        sources = db.query(BlogSource).filter(
            BlogSource.automation_id == automation.id,
            BlogSource.is_active == True,
        ).all()
        run.sources_scanned = len(sources)

        all_items = fetch_sources(sources)
        run.items_discovered = len(all_items)
        db.commit()

        if not all_items:
            run.status = 'completed'
            run.completed_at = datetime.now(timezone.utc)
            db.commit()
            logger.info(f"Run {run_id}: No items discovered from {len(sources)} sources")
            return

        # Stage 2: Dedup
        unique_items = deduplicate(all_items, automation.id, automation.dedup_window_days)
        run.items_filtered = len(all_items) - len(unique_items)
        db.commit()

        # Stage 3: Score & filter
        scored = score_relevance(
            unique_items,
            automation.keywords or [],
            automation.negative_keywords or [],
        )
        # Keep top items above quality threshold
        qualified = [s for s in scored if s['digest_worthiness'] >= automation.min_source_quality]
        qualified = qualified[:10]  # Cap at 10 per run

        if not qualified:
            run.status = 'completed'
            run.completed_at = datetime.now(timezone.utc)
            db.commit()
            logger.info(f"Run {run_id}: No items passed quality filter")
            return

        # Stage 4-6: Process each candidate
        for item in qualified:
            candidate = BlogContentCandidate(
                run_id=run.id,
                source_url=item.get('link', ''),
                source_title=item.get('title', ''),
                source_name=item.get('source_name', ''),
                relevance_score=item.get('relevance_score', 0),
                quality_score=item.get('quality_score', 0),
                digest_worthiness=item.get('digest_worthiness', 0),
                content_hash=item.get('content_hash'),
                status='discovered',
            )
            db.add(candidate)
            db.flush()

            # AI Rewrite
            rewritten = rewrite_content(item, automation, tone_template)
            if rewritten:
                candidate.rewritten_title = rewritten.get('title')
                candidate.rewritten_content = rewritten.get('content')
                candidate.rewritten_excerpt = rewritten.get('excerpt')
                candidate.citations = rewritten.get('citations', [])
                candidate.status = 'rewritten'

                # Image
                img_keywords = automation.image_keywords_override or automation.keywords or []
                if candidate.rewritten_title:
                    img_keywords = candidate.rewritten_title.split()[:5] + img_keywords[:2]
                image = find_image(img_keywords, automation.image_source, automation.image_fallback)
                if image:
                    candidate.image_url = image['url']
                    candidate.image_source = image['source']

                # Translation
                if automation.target_languages:
                    translations = {}
                    for lang in automation.target_languages:
                        if lang != automation.primary_language:
                            tr = translate_content(
                                candidate.rewritten_title or '',
                                candidate.rewritten_content or '',
                                candidate.rewritten_excerpt or '',
                                lang,
                                automation.primary_language,
                            )
                            if tr:
                                translations[lang] = tr
                    if translations:
                        candidate.translations = translations

                # Auto-publish in full_auto mode
                if automation.approval_mode == 'full_auto' and candidate.rewritten_title:
                    slug = Post.generate_slug(candidate.rewritten_title)
                    existing = db.query(Post).filter(Post.slug == slug).first()
                    if existing:
                        slug = f"{slug}-{candidate.id[:6]}"
                    post = Post(
                        title=candidate.rewritten_title,
                        slug=slug,
                        content=candidate.rewritten_content or '',
                        excerpt=candidate.rewritten_excerpt,
                        image_url=candidate.image_url,
                        category=automation.target_category or automation.sector,
                        is_published=True,
                        published_at=datetime.now(timezone.utc),
                    )
                    db.add(post)
                    db.flush()
                    candidate.post_id = post.id
                    candidate.status = 'published'
                    run.posts_published += 1
                elif automation.approval_mode == 'semi_auto' and candidate.digest_worthiness >= automation.confidence_threshold:
                    # Semi-auto: auto-approve high-confidence items
                    slug = Post.generate_slug(candidate.rewritten_title)
                    existing = db.query(Post).filter(Post.slug == slug).first()
                    if existing:
                        slug = f"{slug}-{candidate.id[:6]}"
                    post = Post(
                        title=candidate.rewritten_title,
                        slug=slug,
                        content=candidate.rewritten_content or '',
                        excerpt=candidate.rewritten_excerpt,
                        image_url=candidate.image_url,
                        category=automation.target_category or automation.sector,
                        is_published=False,  # Created but not published
                    )
                    db.add(post)
                    db.flush()
                    candidate.post_id = post.id
                    candidate.status = 'approved'
                else:
                    run.posts_pending_approval += 1

                run.posts_generated += 1
            else:
                candidate.status = 'filtered'

        # Finalize run
        run.status = 'completed'
        run.completed_at = datetime.now(timezone.utc)

        # Update automation stats
        automation.total_runs += 1
        automation.total_posts_generated += run.posts_generated
        automation.total_posts_published += run.posts_published
        automation.last_run_at = datetime.now(timezone.utc)

        db.commit()
        logger.info(
            f"Run {run_id} completed: {run.items_discovered} discovered, "
            f"{run.posts_generated} generated, {run.posts_published} published"
        )

    except Exception as e:
        logger.error(f"Run {run_id} failed: {e}", exc_info=True)
        try:
            run = db.query(BlogAutomationRun).filter(BlogAutomationRun.id == run_id).first()
            if run:
                run.status = 'failed'
                run.error_message = str(e)[:1000]
                run.completed_at = datetime.now(timezone.utc)
                db.commit()
        except Exception:
            pass
    finally:
        db.close()
