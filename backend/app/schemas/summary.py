from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SummaryFieldOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    verification_id: UUID
    field_name: str
    value_json: Any
    confidence: float
    evidence_ref_json: Optional[Any]
    status: str
    reviewer_id: Optional[UUID]
    reviewer_note: Optional[str]
    updated_at: datetime


class SummaryFieldUpdateRequest(BaseModel):
    status: str
    value_json: Any
    reviewer_note: str


class SummaryResponse(BaseModel):
    verification_id: UUID
    fields: list[SummaryFieldOut]
