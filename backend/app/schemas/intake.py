from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class IntakeCreate(BaseModel):
    source: str
    filename: Optional[str] = None
    text_content: Optional[str] = None
    case_id: Optional[UUID] = None


class IntakeUpdate(BaseModel):
    case_id: Optional[UUID] = None
    status: Optional[str] = None
    doc_type: Optional[str] = None
    classification_json: Optional[Any] = None


class IntakeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    case_id: Optional[UUID]
    status: str
    source: str
    doc_type: Optional[str]
    filename: Optional[str]
    storage_key: Optional[str]
    text_content: Optional[str]
    sha256: Optional[str]
    classification_json: Optional[Any]
    created_by: Optional[UUID]
    created_at: datetime
