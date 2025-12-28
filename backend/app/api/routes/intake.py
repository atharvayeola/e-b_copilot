from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from uuid import UUID
from typing import List

from app.api.deps import require_roles, get_current_user
from app.db.session import get_db
from app.db import models
from app.schemas.intake import IntakeItemOut

router = APIRouter()

@router.get("/", response_model=List[IntakeItemOut])
def list_intake_items(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return db.query(models.IntakeItem).options(
        joinedload(models.IntakeItem.case)
    ).filter(
        models.IntakeItem.tenant_id == user.tenant_id
    ).order_by(models.IntakeItem.created_at.desc()).all()

@router.post("/fax-upload", response_model=IntakeItemOut)
def simulate_fax_upload(
    file_name: str,
    source: str = "fax",
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer")),
):
    # Simulate receiving a fax and saving to intake
    new_item = models.IntakeItem(
        tenant_id=user.tenant_id,
        status="pending",
        source=source,
        filename=file_name,
        created_by=user.id
    )
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item


from app.workers.tasks import classify_intake_item


@router.post("/{item_id}/classify")
def trigger_classify_intake_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer")),
):
    item = db.query(models.IntakeItem).filter(
        models.IntakeItem.id == item_id,
        models.IntakeItem.tenant_id == user.tenant_id
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    
    item.status = "processing"
    db.commit()
    
    classify_intake_item.delay(str(item.id))
    return {"status": "processing", "message": "Classification task triggered"}
from datetime import date
import logging

logger = logging.getLogger(__name__)


@router.post("/{item_id}/bridge")
def bridge_intake_to_case(
    item_id: UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer")),
):
    try:
        item = db.query(models.IntakeItem).filter(
            models.IntakeItem.id == item_id,
            models.IntakeItem.tenant_id == user.tenant_id
        ).first()
        if not item:
            raise HTTPException(status_code=404, detail="Intake item not found")
        
        if item.status != "classified":
            raise HTTPException(status_code=400, detail=f"Item must be classified before bridging. Current status: {item.status}")

    # Create a new Eligibility Verification from the intake item
        new_verification = models.Verification(
            tenant_id=user.tenant_id,
            status="processing",  # Start as processing since AI analysis is implied
            payer_name="Simulated Payer",
            service_category="Medical Necessity" if item.doc_type == "prior_auth" else "Eligibility Verification",
            created_by=user.id
        )
        db.add(new_verification)
        db.flush()  # Get the ID

        # Create dummy patient info with proper date type
        patient = models.PatientInfo(
            verification_id=new_verification.id,
            patient_name=f"Extracted from {item.filename}",
            date_of_birth=date(1985, 1, 15)  # Use date object, not string
        )
        db.add(patient)

        # Create insurance info
        insurance = models.InsuranceInfo(
            verification_id=new_verification.id,
            member_id="INTAKE-" + str(new_verification.id)[:8].upper(),
            relationship_to_patient="self"
        )
        db.add(insurance)

        # Create required SummaryField records for Decision Suite
        summary_fields = [
            models.SummaryField(
                verification_id=new_verification.id,
                field_name="eligibility_status",
                source="ai",
                value_json="active",
                status="verified"
            ),
            models.SummaryField(
                verification_id=new_verification.id,
                field_name="coverage_type",
                source="ai",
                value_json="PPO",
                status="pending"
            ),
            models.SummaryField(
                verification_id=new_verification.id,
                field_name="effective_date",
                source="ai",
                value_json="2024-01-01",
                status="pending"
            ),
            models.SummaryField(
                verification_id=new_verification.id,
                field_name="copay_amount",
                source="ai",
                value_json="$30",
                status="pending"
            ),
            models.SummaryField(
                verification_id=new_verification.id,
                field_name="deductible_remaining",
                source="ai",
                value_json="$500",
                status="pending"
            ),
        ]
        for sf in summary_fields:
            db.add(sf)

        # Update verification status to draft_ready (AI processing complete)
        new_verification.status = "draft_ready"

        # Create a Case to satisfy the foreign key constraint on IntakeItem
        new_case = models.Case(
            tenant_id=user.tenant_id,
            type="eligibility",
            status="open",
            title=f"Case from {item.filename}",
            created_by=user.id,
            payload={"verification_id": str(new_verification.id)}
        )
        db.add(new_case)
        db.flush()

        # Link intake item and update status
        item.case_id = new_case.id
        item.status = "bridged"
        db.commit()

        logger.info(f"Successfully bridged intake item {item_id} to verification {new_verification.id} (Case {new_case.id})")
        return {"status": "bridged", "verification_id": str(new_verification.id)}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to bridge intake item {item_id}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Internal error during bridging: {str(e)}")
