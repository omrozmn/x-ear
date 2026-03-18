"""Create blog automation tables

Revision ID: 20260318_blog_auto
Revises: 20260316_sector
Create Date: 2026-03-18
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers
revision = '20260318_blog_auto'
down_revision = '20260316_sector'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Blog Tone Templates
    op.create_table(
        'blog_tone_templates',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('sector', sa.String(50), nullable=True),
        sa.Column('tone', sa.String(50), server_default='professional'),
        sa.Column('voice', sa.String(50), server_default='authoritative'),
        sa.Column('formality_level', sa.Integer, server_default='7'),
        sa.Column('kol_style_reference', sa.Text, nullable=True),
        sa.Column('brand_guidelines', sa.Text, nullable=True),
        sa.Column('include_key_takeaways', sa.Boolean, server_default='1'),
        sa.Column('include_practical_implications', sa.Boolean, server_default='1'),
        sa.Column('include_cta', sa.Boolean, server_default='1'),
        sa.Column('max_word_count', sa.Integer, server_default='800'),
        sa.Column('system_prompt', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('ix_blog_tone_templates_sector', 'blog_tone_templates', ['sector'])

    # Blog Automations
    op.create_table(
        'blog_automations',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('is_active', sa.Boolean, server_default='0'),
        sa.Column('sector', sa.String(50), nullable=False),
        sa.Column('target_category', sa.String(100), nullable=True),
        sa.Column('schedule_type', sa.String(20), server_default='interval'),
        sa.Column('schedule_interval_hours', sa.Integer, server_default='24'),
        sa.Column('schedule_cron', sa.String(100), nullable=True),
        sa.Column('keywords', sa.JSON, nullable=True),
        sa.Column('negative_keywords', sa.JSON, nullable=True),
        sa.Column('content_types', sa.JSON, nullable=True),
        sa.Column('min_source_quality', sa.Float, server_default='0.5'),
        sa.Column('primary_language', sa.String(10), server_default='tr'),
        sa.Column('target_languages', sa.JSON, nullable=True),
        sa.Column('tone_template_id', sa.String(50), sa.ForeignKey('blog_tone_templates.id'), nullable=True),
        sa.Column('target_audience', sa.String(255), nullable=True),
        sa.Column('summary_depth', sa.String(20), server_default='medium'),
        sa.Column('citation_style', sa.String(20), server_default='inline'),
        sa.Column('cta_text', sa.String(255), nullable=True),
        sa.Column('image_source', sa.String(20), server_default='unsplash'),
        sa.Column('image_fallback', sa.String(20), server_default='unsplash'),
        sa.Column('image_keywords_override', sa.JSON, nullable=True),
        sa.Column('auto_share_enabled', sa.Boolean, server_default='0'),
        sa.Column('social_platforms', sa.JSON, nullable=True),
        sa.Column('approval_mode', sa.String(20), server_default='manual'),
        sa.Column('confidence_threshold', sa.Float, server_default='0.7'),
        sa.Column('dedup_window_days', sa.Integer, server_default='30'),
        sa.Column('total_runs', sa.Integer, server_default='0'),
        sa.Column('total_posts_generated', sa.Integer, server_default='0'),
        sa.Column('total_posts_published', sa.Integer, server_default='0'),
        sa.Column('last_run_at', sa.DateTime, nullable=True),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('ix_blog_auto_sector_active', 'blog_automations', ['sector', 'is_active'])

    # Blog Sources
    op.create_table(
        'blog_sources',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('automation_id', sa.String(50), sa.ForeignKey('blog_automations.id'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('url', sa.String(1000), nullable=False),
        sa.Column('source_type', sa.String(30), server_default='rss'),
        sa.Column('is_active', sa.Boolean, server_default='1'),
        sa.Column('priority', sa.Integer, server_default='5'),
        sa.Column('trust_score', sa.Float, server_default='0.7'),
        sa.Column('last_fetched_at', sa.DateTime, nullable=True),
        sa.Column('last_error', sa.Text, nullable=True),
        sa.Column('consecutive_failures', sa.Integer, server_default='0'),
        sa.Column('total_items_fetched', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('ix_blog_sources_automation_id', 'blog_sources', ['automation_id'])

    # Blog Automation Runs
    op.create_table(
        'blog_automation_runs',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('automation_id', sa.String(50), sa.ForeignKey('blog_automations.id'), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('started_at', sa.DateTime, nullable=True),
        sa.Column('completed_at', sa.DateTime, nullable=True),
        sa.Column('trigger_type', sa.String(20), server_default='scheduled'),
        sa.Column('sources_scanned', sa.Integer, server_default='0'),
        sa.Column('items_discovered', sa.Integer, server_default='0'),
        sa.Column('items_filtered', sa.Integer, server_default='0'),
        sa.Column('posts_generated', sa.Integer, server_default='0'),
        sa.Column('posts_published', sa.Integer, server_default='0'),
        sa.Column('posts_pending_approval', sa.Integer, server_default='0'),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('log', sa.JSON, nullable=True),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('ix_blog_run_status', 'blog_automation_runs', ['automation_id', 'status'])

    # Blog Content Candidates
    op.create_table(
        'blog_content_candidates',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('run_id', sa.String(50), sa.ForeignKey('blog_automation_runs.id'), nullable=False),
        sa.Column('source_url', sa.String(1000), nullable=False),
        sa.Column('source_title', sa.String(500), nullable=True),
        sa.Column('source_name', sa.String(255), nullable=True),
        sa.Column('source_published_at', sa.DateTime, nullable=True),
        sa.Column('relevance_score', sa.Float, server_default='0'),
        sa.Column('quality_score', sa.Float, server_default='0'),
        sa.Column('digest_worthiness', sa.Float, server_default='0'),
        sa.Column('status', sa.String(20), server_default='discovered'),
        sa.Column('rewritten_title', sa.String(500), nullable=True),
        sa.Column('rewritten_content', sa.Text, nullable=True),
        sa.Column('rewritten_excerpt', sa.Text, nullable=True),
        sa.Column('citations', sa.JSON, nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('image_source', sa.String(50), nullable=True),
        sa.Column('translations', sa.JSON, nullable=True),
        sa.Column('post_id', sa.String(50), sa.ForeignKey('posts.id'), nullable=True),
        sa.Column('content_hash', sa.String(64), nullable=True),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('ix_blog_candidates_run_id', 'blog_content_candidates', ['run_id'])
    op.create_index('ix_blog_candidates_content_hash', 'blog_content_candidates', ['content_hash'])

    # Blog Social Connections
    op.create_table(
        'blog_social_connections',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('platform', sa.String(30), nullable=False),
        sa.Column('is_active', sa.Boolean, server_default='0'),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('api_key', sa.Text, nullable=True),
        sa.Column('api_secret', sa.Text, nullable=True),
        sa.Column('access_token', sa.Text, nullable=True),
        sa.Column('refresh_token', sa.Text, nullable=True),
        sa.Column('token_expires_at', sa.DateTime, nullable=True),
        sa.Column('default_hashtags', sa.JSON, nullable=True),
        sa.Column('post_template', sa.Text, nullable=True),
        sa.Column('max_chars', sa.Integer, nullable=True),
        sa.Column('include_image', sa.Boolean, server_default='1'),
        sa.Column('include_link', sa.Boolean, server_default='1'),
        sa.Column('total_posts_shared', sa.Integer, server_default='0'),
        sa.Column('last_shared_at', sa.DateTime, nullable=True),
        sa.Column('last_error', sa.Text, nullable=True),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('ix_blog_social_platform', 'blog_social_connections', ['platform'])

    # Blog Social Distribution Jobs
    op.create_table(
        'blog_social_distribution_jobs',
        sa.Column('id', sa.String(50), primary_key=True),
        sa.Column('post_id', sa.String(50), sa.ForeignKey('posts.id'), nullable=False),
        sa.Column('connection_id', sa.String(50), sa.ForeignKey('blog_social_connections.id'), nullable=False),
        sa.Column('platform', sa.String(30), nullable=False),
        sa.Column('status', sa.String(20), server_default='pending'),
        sa.Column('scheduled_at', sa.DateTime, nullable=True),
        sa.Column('posted_at', sa.DateTime, nullable=True),
        sa.Column('content_text', sa.Text, nullable=True),
        sa.Column('image_url', sa.String(500), nullable=True),
        sa.Column('link_url', sa.String(500), nullable=True),
        sa.Column('platform_post_id', sa.String(255), nullable=True),
        sa.Column('error_message', sa.Text, nullable=True),
        sa.Column('retry_count', sa.Integer, server_default='0'),
        sa.Column('created_at', sa.DateTime),
        sa.Column('updated_at', sa.DateTime),
    )
    op.create_index('ix_blog_social_jobs_post', 'blog_social_distribution_jobs', ['post_id'])


def downgrade() -> None:
    op.drop_table('blog_social_distribution_jobs')
    op.drop_table('blog_social_connections')
    op.drop_table('blog_content_candidates')
    op.drop_table('blog_automation_runs')
    op.drop_table('blog_sources')
    op.drop_table('blog_automations')
    op.drop_table('blog_tone_templates')
