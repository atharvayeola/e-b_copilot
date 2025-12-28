from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.db import models
from app.schemas.summary import SummaryFieldOut, SummaryFieldUpdateRequest, SummaryResponse
from app.services import audit

router = APIRouter()


@router.get("/{verification_id}/summary", response_model=SummaryResponse)
def get_summary(
    verification_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> SummaryResponse:
    verification = (
        db.query(models.Verification)
        .filter(
            models.Verification.id == verification_id,
            models.Verification.tenant_id == user.tenant_id,
        )
        .first()
    )
    if not verification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    fields = (
        db.query(models.SummaryField)
        .filter(models.SummaryField.verification_id == verification_id)
        .order_by(models.SummaryField.field_name)
        .all()
    )
    return SummaryResponse(verification_id=verification.id, fields=fields)


@router.patch("/{verification_id}/summary/fields/{field_name}", response_model=SummaryFieldOut)
def update_summary_field(
    verification_id: str,
    field_name: str,
    payload: SummaryFieldUpdateRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer")),
) -> SummaryFieldOut:
    verification = (
        db.query(models.Verification)
        .filter(
            models.Verification.id == verification_id,
            models.Verification.tenant_id == user.tenant_id,
        )
        .first()
    )
    if not verification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    field = (
        db.query(models.SummaryField)
        .filter(
            models.SummaryField.verification_id == verification_id,
            models.SummaryField.field_name == field_name,
        )
        .first()
    )
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Field not found")

    if payload.status in ["edited", "unknown"] and not payload.reviewer_note:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Reviewer note required"
        )

    before = {
        "status": field.status,
        "value_json": field.value_json,
        "reviewer_note": field.reviewer_note,
    }

    field.status = payload.status
    field.value_json = payload.value_json
    field.reviewer_note = payload.reviewer_note
    field.reviewer_id = user.id

    db.commit()
    db.refresh(field)

    audit.log_event(
        db,
        tenant_id=user.tenant_id,
        actor_type="user",
        actor_id=user.id,
        event_type="summary_field_updated",
        entity_type="summary_field",
        entity_id=field.id,
        diff_json={
            "before": before,
            "after": payload.model_dump(),
            "verification_id": str(verification.id),
        },
    )

    return field
