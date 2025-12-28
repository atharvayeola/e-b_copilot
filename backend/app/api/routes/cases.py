from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.api.deps import require_roles, get_current_user
from app.db.session import get_db
from app.db import models
from app.schemas.case import CaseCreate, CaseOut, CaseUpdate

router = APIRouter()

@router.get("/", response_model=List[CaseOut])
def list_cases(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return db.query(models.Case).filter(
        models.Case.tenant_id == user.tenant_id
    ).all()

@router.post("/", response_model=CaseOut)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    new_case = models.Case(
        tenant_id=user.tenant_id,
        status="open",
        created_by=user.id,
        **payload.model_dump()
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case

@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: UUID,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    case = db.query(models.Case).filter(
        models.Case.id == case_id,
        models.Case.tenant_id == user.tenant_id
    ).first()
    if not case:
        raise HTTPException(status_code=404, detail="Not found")
    return case
