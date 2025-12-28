from datetime import datetime
from uuid import UUID
from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator


class PriorAuthBase(BaseModel):
    medication_name: Optional[str] = Field(None, min_length=2, max_length=255, description="Medication or drug name")
    procedure_code: Optional[str] = Field(None, max_length=64, pattern=r"^[A-Za-z0-9\-]*$", description="CPT or J-Code")
    diagnosis_codes: Optional[List[str]] = Field(None, description="List of ICD-10 codes")
    clinical_notes: Optional[str] = Field(None, max_length=5000)

    @field_validator('medication_name')
    @classmethod
    def validate_medication_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not v.strip():
            return None
        return v.strip() if v else v


class PriorAuthCreate(PriorAuthBase):
    medication_name: str = Field(..., min_length=2, max_length=255, description="Medication or drug name is required")
    verification_id: Optional[UUID] = None

    @field_validator('medication_name')
    @classmethod
    def validate_medication_required(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Medication name is required')
        return v.strip()


class PriorAuthUpdate(PriorAuthBase):
    status: Optional[str] = Field(None, pattern=r"^(pending|submitted|approved|denied|appeal_needed)$")


class PriorAuthOut(PriorAuthBase):
    id: UUID
    tenant_id: UUID
    verification_id: Optional[UUID]
    status: str
    submitted_at: Optional[datetime]
    response_json: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True
