from typing import Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.db import models


def log_event(
    db: Session,
    *,
    tenant_id: UUID,
    actor_type: str,
    actor_id: Optional[UUID],
    event_type: str,
    entity_type: str,
    entity_id: UUID,
    diff_json: Optional[Any] = None,
) -> models.AuditEvent:
    event = models.AuditEvent(
        tenant_id=tenant_id,
        actor_type=actor_type,
        actor_id=actor_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        diff_json=diff_json,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
