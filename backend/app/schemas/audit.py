from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class AuditEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    actor_type: str
    actor_id: Optional[UUID]
    event_type: str
    entity_type: str
    entity_id: UUID
    diff_json: Optional[Any]
    created_at: datetime
