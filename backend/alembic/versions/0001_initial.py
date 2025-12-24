"""initial schema

Revision ID: 0001_initial
Revises: 
Create Date: 2025-01-01 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=32), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
    )
    op.create_index("ix_users_tenant_email", "users", ["tenant_id", "email"], unique=True)

    op.create_table(
        "verifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("payer_name", sa.String(length=255), nullable=False),
        sa.Column("plan_name", sa.String(length=255), nullable=True),
        sa.Column("service_category", sa.String(length=255), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
    )
    op.create_index("ix_verifications_tenant_status", "verifications", ["tenant_id", "status"], unique=False)
    op.create_index("ix_verifications_created_at", "verifications", ["created_at"], unique=False)

    op.create_table(
        "patient_info",
        sa.Column("verification_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("patient_name", sa.String(length=255), nullable=False),
        sa.Column("date_of_birth", sa.Date(), nullable=False),
        sa.Column("phone", sa.String(length=64), nullable=True),
        sa.Column("patient_identifier", sa.String(length=128), nullable=True),
        sa.ForeignKeyConstraint(["verification_id"], ["verifications.id"]),
    )

    op.create_table(
        "insurance_info",
        sa.Column("verification_id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("subscriber_name", sa.String(length=255), nullable=True),
        sa.Column("relationship_to_patient", sa.String(length=32), nullable=False),
        sa.Column("member_id", sa.String(length=128), nullable=False),
        sa.Column("group_number", sa.String(length=128), nullable=True),
        sa.ForeignKeyConstraint(["verification_id"], ["verifications.id"]),
    )

    op.create_table(
        "artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("verification_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.String(length=32), nullable=False),
        sa.Column("source", sa.String(length=32), nullable=False),
        sa.Column("filename", sa.String(length=255), nullable=True),
        sa.Column("storage_key", sa.String(length=512), nullable=True),
        sa.Column("text_content", sa.Text(), nullable=True),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
        sa.ForeignKeyConstraint(["verification_id"], ["verifications.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
    )
    op.create_index("ix_artifacts_verification", "artifacts", ["verification_id"], unique=False)

    op.create_table(
        "draft_summaries",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("verification_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("llm_model_name", sa.String(length=128), nullable=False),
        sa.Column("raw_llm_output_json", postgresql.JSONB(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["verification_id"], ["verifications.id"]),
    )

    op.create_table(
        "summary_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("verification_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("field_name", sa.String(length=128), nullable=False),
        sa.Column("value_json", postgresql.JSONB(), nullable=False),
        sa.Column("confidence", sa.Numeric(4, 3), nullable=False),
        sa.Column("evidence_ref_json", postgresql.JSONB(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("reviewer_note", sa.Text(), nullable=True),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["verification_id"], ["verifications.id"]),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"]),
    )
    op.create_index("ix_summary_fields_verification", "summary_fields", ["verification_id"], unique=False)

    op.create_table(
        "generated_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("verification_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("storage_key", sa.String(length=512), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["verification_id"], ["verifications.id"]),
    )

    op.create_table(
        "audit_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("actor_type", sa.String(length=16), nullable=False),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("entity_type", sa.String(length=64), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("diff_json", postgresql.JSONB(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"]),
    )
    op.create_index("ix_audit_events_tenant", "audit_events", ["tenant_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_audit_events_tenant", table_name="audit_events")
    op.drop_table("audit_events")
    op.drop_table("generated_reports")
    op.drop_index("ix_summary_fields_verification", table_name="summary_fields")
    op.drop_table("summary_fields")
    op.drop_table("draft_summaries")
    op.drop_index("ix_artifacts_verification", table_name="artifacts")
    op.drop_table("artifacts")
    op.drop_table("insurance_info")
    op.drop_table("patient_info")
    op.drop_index("ix_verifications_created_at", table_name="verifications")
    op.drop_index("ix_verifications_tenant_status", table_name="verifications")
    op.drop_table("verifications")
    op.drop_index("ix_users_tenant_email", table_name="users")
    op.drop_table("users")
    op.drop_table("tenants")
