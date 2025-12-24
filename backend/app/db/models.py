import uuid

from sqlalchemy import (
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class Tenant(Base):
    __tablename__ = "tenants"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    email = Column(String(255), nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(32), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    tenant = relationship("Tenant")


class Verification(Base):
    __tablename__ = "verifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    status = Column(String(32), nullable=False)
    payer_name = Column(String(255), nullable=False)
    plan_name = Column(String(255), nullable=True)
    service_category = Column(String(255), nullable=False)
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    tenant = relationship("Tenant")
    creator = relationship("User")
    patient_info = relationship("PatientInfo", uselist=False, back_populates="verification")
    insurance_info = relationship("InsuranceInfo", uselist=False, back_populates="verification")
    artifacts = relationship("Artifact", back_populates="verification")


class PatientInfo(Base):
    __tablename__ = "patient_info"

    verification_id = Column(
        UUID(as_uuid=True), ForeignKey("verifications.id"), primary_key=True
    )
    patient_name = Column(String(255), nullable=False)
    date_of_birth = Column(Date, nullable=False)
    phone = Column(String(64), nullable=True)
    patient_identifier = Column(String(128), nullable=True)

    verification = relationship("Verification", back_populates="patient_info")


class InsuranceInfo(Base):
    __tablename__ = "insurance_info"

    verification_id = Column(
        UUID(as_uuid=True), ForeignKey("verifications.id"), primary_key=True
    )
    subscriber_name = Column(String(255), nullable=True)
    relationship_to_patient = Column(String(32), nullable=False)
    member_id = Column(String(128), nullable=False)
    group_number = Column(String(128), nullable=True)

    verification = relationship("Verification", back_populates="insurance_info")


class Artifact(Base):
    __tablename__ = "artifacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    verification_id = Column(UUID(as_uuid=True), ForeignKey("verifications.id"), nullable=False)
    type = Column(String(32), nullable=False)
    source = Column(String(32), nullable=False)
    filename = Column(String(255), nullable=True)
    storage_key = Column(String(512), nullable=True)
    text_content = Column(Text, nullable=True)
    sha256 = Column(String(64), nullable=False)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    verification = relationship("Verification", back_populates="artifacts")


class DraftSummary(Base):
    __tablename__ = "draft_summaries"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    verification_id = Column(UUID(as_uuid=True), ForeignKey("verifications.id"), nullable=False)
    llm_model_name = Column(String(128), nullable=False)
    raw_llm_output_json = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class SummaryField(Base):
    __tablename__ = "summary_fields"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    verification_id = Column(UUID(as_uuid=True), ForeignKey("verifications.id"), nullable=False)
    field_name = Column(String(128), nullable=False)
    value_json = Column(JSONB, nullable=False)
    confidence = Column(Numeric(4, 3), nullable=False)
    evidence_ref_json = Column(JSONB, nullable=True)
    status = Column(String(32), nullable=False)
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reviewer_note = Column(Text, nullable=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    verification_id = Column(UUID(as_uuid=True), ForeignKey("verifications.id"), nullable=False)
    storage_key = Column(String(512), nullable=False)
    sha256 = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    actor_type = Column(String(16), nullable=False)
    actor_id = Column(UUID(as_uuid=True), nullable=True)
    event_type = Column(String(64), nullable=False)
    entity_type = Column(String(64), nullable=False)
    entity_id = Column(UUID(as_uuid=True), nullable=False)
    diff_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


Index("ix_users_tenant_email", User.tenant_id, User.email, unique=True)
Index("ix_verifications_tenant_status", Verification.tenant_id, Verification.status)
Index("ix_verifications_created_at", Verification.created_at)
Index("ix_artifacts_verification", Artifact.verification_id)
Index("ix_summary_fields_verification", SummaryField.verification_id)
Index("ix_audit_events_tenant", AuditEvent.tenant_id)
