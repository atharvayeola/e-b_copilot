from fastapi import APIRouter, Depends
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.db import models
from app.schemas.audit import AuditEventOut

router = APIRouter()


@router.get("/verifications/{verification_id}", response_model=list[AuditEventOut])
def list_audit_events(
    verification_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> list[AuditEventOut]:
    events = (
        db.query(models.AuditEvent)
        .filter(models.AuditEvent.tenant_id == user.tenant_id)
        .filter(
            or_(
                models.AuditEvent.entity_id == verification_id,
                models.AuditEvent.diff_json["verification_id"].astext == verification_id,
            )
        )
        .order_by(models.AuditEvent.created_at.desc())
        .all()
    )
    return events
