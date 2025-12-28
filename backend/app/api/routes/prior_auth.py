from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.api.deps import require_roles, get_current_user
from app.db.session import get_db
from app.db import models
from app.schemas.prior_auth import PriorAuthCreate, PriorAuthOut, PriorAuthUpdate

router = APIRouter()

@router.get("/", response_model=List[PriorAuthOut])
def list_prior_auths(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return db.query(models.PriorAuthorization).filter(
        models.PriorAuthorization.tenant_id == user.tenant_id
    ).all()

@router.post("/", response_model=PriorAuthOut)
def create_prior_auth(
    payload: PriorAuthCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer", "scheduler")),
):
    new_pa = models.PriorAuthorization(
        tenant_id=user.tenant_id,
        status="pending",
        **payload.model_dump()
    )
    db.add(new_pa)
    db.commit()
    db.refresh(new_pa)
    return new_pa

@router.get("/{pa_id}", response_model=PriorAuthOut)
def get_prior_auth(
    pa_id: UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    pa = db.query(models.PriorAuthorization).filter(
        models.PriorAuthorization.id == pa_id,
        models.PriorAuthorization.tenant_id == user.tenant_id
    ).first()
    if not pa:
        raise HTTPException(status_code=404, detail="Not found")
    return pa


from app.workers.tasks import process_prior_auth


@router.post("/{pa_id}/run")
def trigger_prior_auth_processing(
    pa_id: UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer")),
):
    pa = db.query(models.PriorAuthorization).filter(
        models.PriorAuthorization.id == pa_id,
        models.PriorAuthorization.tenant_id == user.tenant_id
    ).first()
    if not pa:
        raise HTTPException(status_code=404, detail="Not found")
    
    pa.status = "processing"
    db.commit()
    
    process_prior_auth.delay(str(pa.id))
    return {"status": "processing", "message": "Prior Auth processing started"}
