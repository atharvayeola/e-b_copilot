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


class Case(Base):
    __tablename__ = "cases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    type = Column(String(64), nullable=False)  # eligibility, intake, prior_auth, appeal, etc.
    status = Column(String(64), nullable=False)
    title = Column(String(255), nullable=True)
    summary = Column(Text, nullable=True)
    payload = Column(JSONB, nullable=True)  # arbitrary case-specific data
    sla_due_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )


class IntakeItem(Base):
    __tablename__ = "intake_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    case_id = Column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=True)
    status = Column(String(64), nullable=False)
    source = Column(String(64), nullable=False)  # fax, email, portal, upload
    doc_type = Column(String(64), nullable=True)  # classified document type
    filename = Column(String(255), nullable=True)
    storage_key = Column(String(512), nullable=True)
    text_content = Column(Text, nullable=True)
    sha256 = Column(String(64), nullable=True)
    classification_json = Column(JSONB, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    case = relationship("Case")

    @property
    def verification_id(self):
        if self.case and self.case.payload:
            return self.case.payload.get("verification_id")
        return None


class PriorAuthorization(Base):
    __tablename__ = "prior_authorizations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    verification_id = Column(UUID(as_uuid=True), ForeignKey("verifications.id"), nullable=True)
    status = Column(String(64), nullable=False)  # pending, submitted, approved, denied, appeal_needed
    medication_name = Column(String(255), nullable=True)
    procedure_code = Column(String(64), nullable=True)
    diagnosis_codes = Column(JSONB, nullable=True)  # List of ICD-10
    clinical_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    response_json = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    verification = relationship("Verification")


class Referral(Base):
    __tablename__ = "referrals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    status = Column(String(64), nullable=False)  # new, processing, qualified, rejected, converted
    patient_name = Column(String(255), nullable=False)
    referring_provider = Column(String(255), nullable=True)
    target_specialty = Column(String(255), nullable=True)
    clinical_urgency = Column(String(32), nullable=True)  # routine, urgent, stat
    content_json = Column(JSONB, nullable=True)  # full extracted data
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class IntegrationCredentials(Base):
    __tablename__ = "integration_credentials"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    service_name = Column(String(64), nullable=False)  # trellis, lamar, etc (simulated)
    api_key_hash = Column(String(255), nullable=False)
    settings = Column(JSONB, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


Index("ix_prior_auth_tenant", PriorAuthorization.tenant_id)
Index("ix_referrals_tenant", Referral.tenant_id)
Index("ix_cases_tenant_type_status", Case.tenant_id, Case.type, Case.status)
Index("ix_cases_created_at", Case.created_at)
Index("ix_intake_items_tenant_status", IntakeItem.tenant_id, IntakeItem.status)
