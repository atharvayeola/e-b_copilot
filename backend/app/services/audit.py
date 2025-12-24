from typing import Any, Optional
from uuid import UUID
import json

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
    def _serialize(value: Any) -> Any:
        if isinstance(value, UUID):
            return str(value)
        if isinstance(value, dict):
            return {k: _serialize(v) for k, v in value.items()}
        if isinstance(value, list):
            return [_serialize(v) for v in value]
        return value

    event = models.AuditEvent(
        tenant_id=tenant_id,
        actor_type=actor_type,
        actor_id=actor_id,
        event_type=event_type,
        entity_type=entity_type,
        entity_id=entity_id,
        diff_json=_serialize(diff_json) if diff_json is not None else None,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event
