from datetime import datetime
from uuid import UUID
from typing import Optional
from pydantic import BaseModel

class IntakeItemBase(BaseModel):
    source: str
    filename: Optional[str] = None

class IntakeItemCreate(IntakeItemBase):
    pass

class IntakeItemOut(IntakeItemBase):
    id: UUID
    tenant_id: UUID
    case_id: Optional[UUID]
    verification_id: Optional[str] = None
    status: str
    doc_type: Optional[str]
    storage_key: Optional[str]
    classification_json: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True
