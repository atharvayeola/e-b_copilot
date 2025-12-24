import os
from pathlib import Path
import sys
from datetime import datetime, date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.core.security import get_password_hash
from app.db.models import (
    Base,
    Tenant,
    User,
    Verification,
    PatientInfo,
    InsuranceInfo,
    Artifact,
    DraftSummary,
    SummaryField,
)
from app.utils.hashing import sha256_text

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+psycopg2://postgres:postgres@localhost:5432/eb_copilot")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(bind=engine)


def main() -> None:
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter_by(name="Demo Clinic").first()
        if not tenant:
            tenant = Tenant(name="Demo Clinic")
            db.add(tenant)
            db.commit()
            db.refresh(tenant)

        def upsert_user(email: str, role: str) -> User:
            user = db.query(User).filter_by(email=email).first()
            if user:
                return user
            user = User(
                tenant_id=tenant.id,
                email=email,
                password_hash=get_password_hash("password123"),
                role=role,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            return user

        admin = upsert_user("admin@demo.com", "admin")
        reviewer = upsert_user("reviewer@demo.com", "reviewer")
        scheduler = upsert_user("scheduler@demo.com", "scheduler")

        verification = (
            db.query(Verification)
            .filter_by(payer_name="Acme Payer", tenant_id=tenant.id)
            .first()
        )
        if not verification:
            verification = Verification(
                tenant_id=tenant.id,
                status="draft_ready",
                payer_name="Acme Payer",
                plan_name="Gold",
                service_category="Outpatient PT",
                scheduled_at=datetime.utcnow(),
                created_by=scheduler.id,
            )
            db.add(verification)
            db.commit()
            db.refresh(verification)

            patient = PatientInfo(
                verification_id=verification.id,
                patient_name="Jordan Rivera",
                date_of_birth=date(1988, 4, 12),
                phone="555-0100",
                patient_identifier="P-1001",
            )
            insurance = InsuranceInfo(
                verification_id=verification.id,
                subscriber_name="Jordan Rivera",
                relationship_to_patient="self",
                member_id="ABC1234",
                group_number="GRP-1",
            )
            db.add(patient)
            db.add(insurance)
            db.commit()

            raw_text = (
                "Eligibility status: active\n"
                "Member ID: ABC1234\n"
                "Effective: 2024-01-01 to 2024-12-31\n"
                "Copay: $25\n"
                "Coinsurance: 20%\n"
                "Deductible individual total: $500 remaining: $200\n"
                "OOP max individual total: $2000 remaining: $1500\n"
                "Visit limit: 12 visits per year\n"
            )
            artifact = Artifact(
                tenant_id=tenant.id,
                verification_id=verification.id,
                type="text",
                source="manual_entry",
                filename=None,
                storage_key=None,
                text_content=raw_text,
                sha256=sha256_text(raw_text),
                created_by=reviewer.id,
            )
            db.add(artifact)
            db.commit()
        else:
            artifact = (
                db.query(Artifact)
                .filter_by(verification_id=verification.id, tenant_id=tenant.id)
                .first()
            )

        draft = db.query(DraftSummary).filter_by(verification_id=verification.id).first()
        if not draft:
            draft = DraftSummary(
                verification_id=verification.id,
                llm_model_name="mock",
                raw_llm_output_json={},
            )
            db.add(draft)
            db.commit()

        existing_fields = (
            db.query(SummaryField).filter_by(verification_id=verification.id).count()
        )
        if existing_fields == 0 and artifact:
            evidence = {"artifact_id": str(artifact.id), "text_span": [0, 120], "page": None}
            fields = [
                SummaryField(
                    verification_id=verification.id,
                    field_name="eligibility_status",
                    value_json="active",
                    confidence=0.92,
                    evidence_ref_json=evidence,
                    status="draft",
                ),
                SummaryField(
                    verification_id=verification.id,
                    field_name="effective_from",
                    value_json="2024-01-01",
                    confidence=0.88,
                    evidence_ref_json=evidence,
                    status="draft",
                ),
                SummaryField(
                    verification_id=verification.id,
                    field_name="effective_to",
                    value_json="2024-12-31",
                    confidence=0.88,
                    evidence_ref_json=evidence,
                    status="draft",
                ),
                SummaryField(
                    verification_id=verification.id,
                    field_name="copay",
                    value_json={"amount": 25, "currency": "USD"},
                    confidence=0.78,
                    evidence_ref_json=evidence,
                    status="draft",
                ),
                SummaryField(
                    verification_id=verification.id,
                    field_name="coinsurance",
                    value_json={"percent": 20},
                    confidence=0.74,
                    evidence_ref_json=evidence,
                    status="draft",
                ),
                SummaryField(
                    verification_id=verification.id,
                    field_name="deductible_remaining_individual",
                    value_json={"amount": 200, "currency": "USD"},
                    confidence=0.7,
                    evidence_ref_json=evidence,
                    status="draft",
                ),
                SummaryField(
                    verification_id=verification.id,
                    field_name="oop_max_remaining_individual",
                    value_json={"amount": 1500, "currency": "USD"},
                    confidence=0.7,
                    evidence_ref_json=evidence,
                    status="draft",
                ),
                SummaryField(
                    verification_id=verification.id,
                    field_name="limitations",
                    value_json="12 visits per year",
                    confidence=0.6,
                    evidence_ref_json=evidence,
                    status="draft",
                ),
            ]
            db.add_all(fields)
            db.commit()

        print("Seed complete. Users:")
        print("- admin@demo.com / password123")
        print("- reviewer@demo.com / password123")
        print("- scheduler@demo.com / password123")
    finally:
        db.close()


if __name__ == "__main__":
    main()
