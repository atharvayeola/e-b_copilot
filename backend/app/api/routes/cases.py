from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db import models
from app.db.session import get_db
from app.schemas.case import CaseCreate, CaseListItem, CaseOut
from app.services import audit

router = APIRouter()


@router.post("", response_model=CaseOut)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer", "scheduler")),
) -> CaseOut:
    case = models.Case(
        tenant_id=user.tenant_id,
        type=payload.type,
        status=payload.status,
        title=payload.title,
        summary=payload.summary,
        payload=payload.payload,
        sla_due_at=payload.sla_due_at,
        created_by=user.id,
    )
    db.add(case)
    db.commit()
    db.refresh(case)

    audit.log_event(
        db,
        tenant_id=user.tenant_id,
        actor_type="user",
        actor_id=user.id,
        event_type="case_created",
        entity_type="case",
        entity_id=case.id,
        diff_json=payload.model_dump(),
    )

    return case


@router.get("", response_model=list[CaseListItem])
def list_cases(
    case_type: Optional[str] = Query(default=None, alias="type"),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    page: int = 1,
    page_size: int = 25,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> list[CaseListItem]:
    query = db.query(models.Case).filter(models.Case.tenant_id == user.tenant_id)
    if case_type:
        query = query.filter(models.Case.type == case_type)
    if status_filter:
        query = query.filter(models.Case.status == status_filter)

    cases = (
        query.order_by(models.Case.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return cases


@router.get("/{case_id}", response_model=CaseOut)
def get_case(
    case_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> CaseOut:
    case = (
        db.query(models.Case)
        .filter(models.Case.id == case_id, models.Case.tenant_id == user.tenant_id)
        .first()
    )
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    return case
