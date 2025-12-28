from datetime import datetime
from uuid import UUID
from typing import Optional, List
from pydantic import BaseModel

class CaseBase(BaseModel):
    type: str
    title: Optional[str] = None
    summary: Optional[str] = None
    payload: Optional[dict] = None
    sla_due_at: Optional[datetime] = None

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    status: Optional[str] = None
    summary: Optional[str] = None
    payload: Optional[dict] = None

class CaseOut(CaseBase):
    id: UUID
    tenant_id: UUID
    status: str
    created_by: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
