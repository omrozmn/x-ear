"""add countries table and tenant country_code

Revision ID: a1b2c3d4e5f6
Revises:
Create Date: 2026-03-16
"""
from alembic import op
import sqlalchemy as sa
from datetime import datetime

revision = 'a1b2c3d4e5f6'
down_revision = None
branch_labels = None
depends_on = None

_NOW = datetime.utcnow().isoformat()

SEED_COUNTRIES = [
    ('TR', 'Turkey', 'Türkiye', True, True, 'TRY', 'tr-TR', 'Europe/Istanbul', '+90', '🇹🇷', 'DD.MM.YYYY', 0),
    ('US', 'United States', 'United States', False, False, 'USD', 'en-US', 'America/New_York', '+1', '🇺🇸', 'MM/DD/YYYY', 1),
    ('CA', 'Canada', 'Canada', False, False, 'CAD', 'en-CA', 'America/Toronto', '+1', '🇨🇦', 'YYYY-MM-DD', 2),
    ('DE', 'Germany', 'Deutschland', False, False, 'EUR', 'de-DE', 'Europe/Berlin', '+49', '🇩🇪', 'DD.MM.YYYY', 3),
    ('FR', 'France', 'France', False, False, 'EUR', 'fr-FR', 'Europe/Paris', '+33', '🇫🇷', 'DD/MM/YYYY', 4),
    ('NL', 'Netherlands', 'Nederland', False, False, 'EUR', 'nl-NL', 'Europe/Amsterdam', '+31', '🇳🇱', 'DD-MM-YYYY', 5),
    ('SA', 'Saudi Arabia', 'المملكة العربية السعودية', False, False, 'SAR', 'ar-SA', 'Asia/Riyadh', '+966', '🇸🇦', 'DD/MM/YYYY', 6),
    ('AE', 'United Arab Emirates', 'الإمارات العربية المتحدة', False, False, 'AED', 'ar-AE', 'Asia/Dubai', '+971', '🇦🇪', 'DD/MM/YYYY', 7),
    ('QA', 'Qatar', 'قطر', False, False, 'QAR', 'ar-QA', 'Asia/Qatar', '+974', '🇶🇦', 'DD/MM/YYYY', 8),
    ('IQ', 'Iraq', 'العراق', False, False, 'IQD', 'ar-IQ', 'Asia/Baghdad', '+964', '🇮🇶', 'DD/MM/YYYY', 9),
]

def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Create countries table (if not exists)
    if 'countries' not in inspector.get_table_names():
        op.create_table(
            'countries',
            sa.Column('code', sa.String(2), primary_key=True),
            sa.Column('name', sa.String(100), nullable=False),
            sa.Column('native_name', sa.String(100)),
            sa.Column('enabled', sa.Boolean(), nullable=False, server_default='0'),
            sa.Column('creatable', sa.Boolean(), nullable=False, server_default='0'),
            sa.Column('currency_code', sa.String(3), nullable=False),
            sa.Column('locale', sa.String(10), nullable=False),
            sa.Column('timezone', sa.String(50), nullable=False),
            sa.Column('phone_prefix', sa.String(5), nullable=False),
            sa.Column('flag_emoji', sa.String(4)),
            sa.Column('date_format', sa.String(20), server_default='DD.MM.YYYY'),
            sa.Column('config', sa.JSON(), server_default='{}'),
            sa.Column('sort_order', sa.Integer(), server_default='0'),
            sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        )

    # Seed countries using raw SQL (handles server_default correctly for SQLite)
    for c in SEED_COUNTRIES:
        conn.execute(sa.text(
            "INSERT OR IGNORE INTO countries "
            "(code, name, native_name, enabled, creatable, currency_code, locale, timezone, phone_prefix, flag_emoji, date_format, sort_order, created_at, updated_at) "
            "VALUES (:code, :name, :native_name, :enabled, :creatable, :currency_code, :locale, :timezone, :phone_prefix, :flag_emoji, :date_format, :sort_order, :created_at, :updated_at)"
        ), {
            'code': c[0], 'name': c[1], 'native_name': c[2],
            'enabled': c[3], 'creatable': c[4], 'currency_code': c[5],
            'locale': c[6], 'timezone': c[7], 'phone_prefix': c[8],
            'flag_emoji': c[9], 'date_format': c[10], 'sort_order': c[11],
            'created_at': _NOW, 'updated_at': _NOW,
        })

    # Add country_code to tenants (check if column already exists)
    tenant_cols = [col['name'] for col in inspector.get_columns('tenants')]
    if 'country_code' not in tenant_cols:
        with op.batch_alter_table('tenants') as batch_op:
            batch_op.add_column(sa.Column('country_code', sa.String(2), nullable=True, server_default='TR'))
            batch_op.create_index('idx_tenants_country_code', ['country_code'])

    # Update existing tenants
    op.execute("UPDATE tenants SET country_code = 'TR' WHERE country_code IS NULL")


def downgrade() -> None:
    with op.batch_alter_table('tenants') as batch_op:
        batch_op.drop_index('idx_tenants_country_code')
        batch_op.drop_column('country_code')
    op.drop_table('countries')
