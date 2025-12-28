import sys
import os
import logging
from datetime import date, timedelta
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Add parent directory to path to import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db import models
from app.core.config import settings

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Setup DB connection
engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def reset_db(db):
    logger.info("Truncating all tables...")
    # Order matters for foreign keys if we don't cascade, but CASCADE makes it easier
    db.execute(text("TRUNCATE TABLE users, tenants, verifications, patient_info, insurance_info, artifacts, draft_summaries, summary_fields, generated_reports, audit_events, cases, intake_items, prior_authorizations, referrals, integration_credentials RESTART IDENTITY CASCADE;"))
    db.commit()

def seed_db(db):
    logger.info("Seeding database...")

    # 1. Create Tenant & User
    tenant = models.Tenant(name="Medos Demo")
    db.add(tenant)
    db.flush()

    user = models.User(
        tenant_id=tenant.id,
        email="admin@medos.com",
        password_hash="$2b$12$3J7c9s2omWlXjgaeVLMuROcCxAIXIeU1bzJTT0onN6HNA59BTMB22", # admin123
        role="admin"
    )
    db.add(user)
    db.flush()
    logger.info(f"Created Admin User: {user.email}")

    # 2. Intake Items (2 cases)
    # Case 1: Pending processing
    intake1 = models.IntakeItem(
        tenant_id=tenant.id,
        status="pending",
        source="upload",
        filename="urgent_referral_smith.pdf",
        created_by=user.id
    )
    db.add(intake1)

    # Case 2: Classified & Ready to Bridge (Wait, doc_type needs to match options)
    intake2 = models.IntakeItem(
        tenant_id=tenant.id,
        status="classified",
        source="fax",
        doc_type="prior_auth_request", # Assuming this is a valid type, usually internal names use underscores
        filename="prior_auth_humira.tiff",
        classification_json={"confidence": 0.98, "doc_type": "prior_auth_request"},
        created_by=user.id
    )
    db.add(intake2)
    logger.info("Seeded Intake Items")

    # 3. Verifications (2 cases)
    # Case 1: Pending (Processing)
    ver1 = models.Verification(
        tenant_id=tenant.id,
        status="pending",
        payer_name="Blue Cross Blue Shield",
        service_category="Physical Therapy",
        created_by=user.id
    )
    db.add(ver1)
    db.flush()
    
    pat1 = models.PatientInfo(
        verification_id=ver1.id,
        patient_name="John Doe",
        date_of_birth=date(1980, 5, 15),
        phone="555-0101"
    )
    ins1 = models.InsuranceInfo(
        verification_id=ver1.id,
        subscriber_name="John Doe",
        relationship_to_patient="self",
        member_id="BCBS-123456789"
    )
    db.add(pat1)
    db.add(ins1)

    # Case 2: Finalized
    ver2 = models.Verification(
        tenant_id=tenant.id,
        status="finalized",
        payer_name="UnitedHealthcare",
        service_category="MRI Lumbar Spine",
        created_by=user.id
    )
    db.add(ver2)
    db.flush()

    pat2 = models.PatientInfo(
        verification_id=ver2.id,
        patient_name="Jane Smith",
        date_of_birth=date(1992, 8, 20),
        phone="555-0102"
    )
    ins2 = models.InsuranceInfo(
        verification_id=ver2.id,
        subscriber_name="Robert Smith",
        relationship_to_patient="child",
        member_id="UHC-987654321"
    )
    db.add(pat2)
    db.add(ins2)
    
    # Add summary fields for the finalized one to make it look real
    db.add(models.SummaryField(verification_id=ver2.id, field_name="eligibility_status", value_json="active", confidence=0.99, status="verified"))
    db.add(models.SummaryField(verification_id=ver2.id, field_name="deductible_remaining", value_json="$150.00", confidence=0.95, status="verified"))
    db.add(models.SummaryField(verification_id=ver2.id, field_name="copay_amount", value_json="$50.00", confidence=0.95, status="verified"))
    
    logger.info("Seeded Verifications")

    # 4. Prior Authorization (2 cases)
    # Case 1: Pending
    pa1 = models.PriorAuthorization(
        tenant_id=tenant.id,
        status="pending",
        medication_name="Ozempic",
        procedure_code="J3490",
        verification_id=ver1.id
    )
    db.add(pa1)

    # Case 2: Approved
    pa2 = models.PriorAuthorization(
        tenant_id=tenant.id,
        status="approved",
        medication_name="Humira",
        procedure_code="J0135",
        diagnosis_codes=["K50.90"],
        clinical_notes="Patient has failed methotrexate therapy.",
        verification_id=ver2.id
    )
    db.add(pa2)
    logger.info("Seeded Prior Authorizations")

    # 5. Referrals (2 cases)
    # Case 1: New / Routine
    ref1 = models.Referral(
        tenant_id=tenant.id,
        status="new",
        patient_name="Michael Brown",
        referring_provider="Dr. House",
        target_specialty="Cardiology",
        clinical_urgency="routine"
    )
    db.add(ref1)

    # Case 2: Qualified / Urgent
    ref2 = models.Referral(
        tenant_id=tenant.id,
        status="qualified",
        patient_name="Sarah Connor",
        referring_provider="Dr. Silberman",
        target_specialty="Psychiatry",
        clinical_urgency="urgent"
    )
    db.add(ref2)
    logger.info("Seeded Referrals")

    db.commit()
    logger.info("Database reset and seeded successfully!")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        reset_db(db)
        seed_db(db)
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
        raise e
    finally:
        db.close()
