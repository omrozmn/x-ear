"""add sector and country_code to plans, addons, sms_packages

Revision ID: 20260317_010000
Revises: 20260312_180500
Create Date: 2026-03-17 01:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260317_010000"
down_revision = "20260312_180500"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    dialect = bind.dialect.name

    # --- plans table ---
    plans_cols = {c["name"] for c in inspector.get_columns("plans")}

    if "sector" not in plans_cols:
        op.add_column("plans", sa.Column("sector", sa.String(30), nullable=True))

    if "country_code" not in plans_cols:
        countries_exists = "countries" in inspector.get_table_names()
        if dialect == "sqlite" or not countries_exists:
            # SQLite does not support ALTER ADD with FK constraint
            # Also skip FK if countries table doesn't exist yet
            op.add_column("plans", sa.Column("country_code", sa.String(2), nullable=True))
        else:
            op.add_column(
                "plans",
                sa.Column("country_code", sa.String(2), sa.ForeignKey("countries.code"), nullable=True),
            )

    # --- addons table ---
    addons_cols = {c["name"] for c in inspector.get_columns("addons")}

    if "sector" not in addons_cols:
        op.add_column("addons", sa.Column("sector", sa.String(30), nullable=True))

    if "country_code" not in addons_cols:
        if dialect == "sqlite" or not countries_exists:
            op.add_column("addons", sa.Column("country_code", sa.String(2), nullable=True))
        else:
            op.add_column(
                "addons",
                sa.Column("country_code", sa.String(2), sa.ForeignKey("countries.code"), nullable=True),
            )

    # --- sms_packages table ---
    sms_cols = {c["name"] for c in inspector.get_columns("sms_packages")}

    if "country_code" not in sms_cols:
        if dialect == "sqlite" or not countries_exists:
            op.add_column("sms_packages", sa.Column("country_code", sa.String(2), nullable=True))
        else:
            op.add_column(
                "sms_packages",
                sa.Column("country_code", sa.String(2), sa.ForeignKey("countries.code"), nullable=True),
            )

    # Create indexes (skip for SQLite dev — indexes defined in model for prod)
    if dialect != "sqlite":
        op.create_index("idx_plans_sector", "plans", ["sector"], if_not_exists=True)
        op.create_index("idx_plans_country_code", "plans", ["country_code"], if_not_exists=True)
        op.create_index("idx_plans_sector_country", "plans", ["sector", "country_code"], if_not_exists=True)
        op.create_index("idx_addons_sector", "addons", ["sector"], if_not_exists=True)
        op.create_index("idx_addons_country_code", "addons", ["country_code"], if_not_exists=True)
        op.create_index("idx_addons_sector_country", "addons", ["sector", "country_code"], if_not_exists=True)
        op.create_index("idx_sms_packages_country_code", "sms_packages", ["country_code"], if_not_exists=True)


def downgrade():
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect != "sqlite":
        op.drop_index("idx_sms_packages_country_code", table_name="sms_packages")
        op.drop_index("idx_addons_sector_country", table_name="addons")
        op.drop_index("idx_addons_country_code", table_name="addons")
        op.drop_index("idx_addons_sector", table_name="addons")
        op.drop_index("idx_plans_sector_country", table_name="plans")
        op.drop_index("idx_plans_country_code", table_name="plans")
        op.drop_index("idx_plans_sector", table_name="plans")

    op.drop_column("sms_packages", "country_code")
    op.drop_column("addons", "country_code")
    op.drop_column("addons", "sector")
    op.drop_column("plans", "country_code")
    op.drop_column("plans", "sector")
