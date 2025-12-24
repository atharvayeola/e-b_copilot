from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CaseCreate(BaseModel):
    type: str
    status: str = "pending"
    title: Optional[str] = None
    summary: Optional[str] = None
    payload: Optional[Any] = None
    sla_due_at: Optional[datetime] = None


class CaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    type: str
    status: str
    title: Optional[str]
    summary: Optional[str]
    payload: Optional[Any]
    sla_due_at: Optional[datetime]
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class CaseListItem(CaseOut):
    pass
