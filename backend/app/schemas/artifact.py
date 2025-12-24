from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ArtifactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    verification_id: UUID
    type: str
    source: str
    filename: Optional[str]
    storage_key: Optional[str]
    text_content: Optional[str]
    sha256: str
    created_by: Optional[UUID]
    created_at: datetime


class ManualArtifactIn(BaseModel):
    text_content: str
