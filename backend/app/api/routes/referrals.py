from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.api.deps import require_roles, get_current_user
from app.db.session import get_db
from app.db import models
from app.schemas.referral import ReferralCreate, ReferralOut, ReferralUpdate

router = APIRouter()


@router.get("/", response_model=List[ReferralOut])
def list_referrals(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return db.query(models.Referral).filter(
        models.Referral.tenant_id == user.tenant_id
    ).all()


@router.post("/", response_model=ReferralOut)
def create_referral(
    payload: ReferralCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer", "scheduler")),
):
    new_referral = models.Referral(
        tenant_id=user.tenant_id,
        status="new",
        **payload.model_dump()
    )
    db.add(new_referral)
    db.commit()
    db.refresh(new_referral)
    return new_referral

@router.get("/{referral_id}", response_model=ReferralOut)
def get_referral(
    referral_id: UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    referral = db.query(models.Referral).filter(
        models.Referral.id == referral_id,
        models.Referral.tenant_id == user.tenant_id
    ).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Not found")
    return referral


from app.workers.tasks import process_referral


@router.post("/{referral_id}/run")
def trigger_referral_processing(
    referral_id: UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer")),
):
    referral = db.query(models.Referral).filter(
        models.Referral.id == referral_id,
        models.Referral.tenant_id == user.tenant_id
    ).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Not found")
    
    referral.status = "processing"
    db.commit()
    
    process_referral.delay(str(referral.id))
    return {"status": "processing", "message": "Referral processing started"}
