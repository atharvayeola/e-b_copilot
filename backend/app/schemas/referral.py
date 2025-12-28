from datetime import datetime
from uuid import UUID
from typing import Optional, Literal
from pydantic import BaseModel, Field, field_validator


class ReferralBase(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=255, description="Patient full name")
    referring_provider: Optional[str] = Field(None, max_length=255)
    target_specialty: Optional[str] = Field(None, max_length=255)
    clinical_urgency: Optional[Literal["routine", "urgent", "stat"]] = Field("routine", description="Triage urgency level")

    @field_validator('patient_name')
    @classmethod
    def validate_patient_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Patient name is required')
        return v.strip()


class ReferralCreate(ReferralBase):
    pass


class ReferralUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern=r"^(new|processing|qualified|rejected|converted|scheduled)$")
    content_json: Optional[dict] = None


class ReferralOut(ReferralBase):
    id: UUID
    tenant_id: UUID
    status: str
    content_json: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True
