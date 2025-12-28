from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID
import re

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PatientInfoIn(BaseModel):
    patient_name: str = Field(..., min_length=2, max_length=255, description="Patient full name")
    date_of_birth: date = Field(..., description="Patient date of birth")
    phone: Optional[str] = Field(None, max_length=64, pattern=r"^[\d\s\-\+\(\)]*$", description="Phone number")
    patient_identifier: Optional[str] = Field(None, max_length=128)

    @field_validator('date_of_birth')
    @classmethod
    def validate_dob_not_future(cls, v: date) -> date:
        if v > date.today():
            raise ValueError('Date of birth cannot be in the future')
        return v

    @field_validator('patient_name')
    @classmethod
    def validate_patient_name(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Patient name cannot be empty')
        return v.strip()


class InsuranceInfoIn(BaseModel):
    subscriber_name: Optional[str] = Field(None, max_length=255)
    relationship_to_patient: str = Field(..., min_length=1, max_length=32)
    member_id: str = Field(..., min_length=1, max_length=128, description="Insurance member ID")
    group_number: Optional[str] = Field(None, max_length=128)

    @field_validator('member_id')
    @classmethod
    def validate_member_id(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Member ID cannot be empty')
        return v.strip()


class VerificationCreateRequest(BaseModel):
    payer_name: str = Field(..., min_length=2, max_length=255, description="Insurance payer/carrier name")
    plan_name: Optional[str] = Field(None, max_length=255)
    service_category: str = Field(..., min_length=2, max_length=255, description="Type of service")
    scheduled_at: Optional[datetime] = None
    patient_info: PatientInfoIn
    insurance_info: InsuranceInfoIn

    @field_validator('payer_name', 'service_category')
    @classmethod
    def validate_required_strings(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('This field cannot be empty')
        return v.strip()


class PatientInfoOut(PatientInfoIn):
    model_config = ConfigDict(from_attributes=True)


class InsuranceInfoOut(InsuranceInfoIn):
    model_config = ConfigDict(from_attributes=True)


class VerificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    status: str
    payer_name: str
    plan_name: Optional[str]
    service_category: str
    scheduled_at: Optional[datetime]
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    patient_info: Optional[PatientInfoOut]
    insurance_info: Optional[InsuranceInfoOut]


class VerificationListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    payer_name: str
    plan_name: Optional[str]
    service_category: str
    scheduled_at: Optional[datetime]
    created_at: datetime
    patient_name: Optional[str] = None
    member_id: Optional[str] = None
    patient_identifier: Optional[str] = None


class VerificationUpdateRequest(BaseModel):
    payer_name: Optional[str] = Field(None, min_length=2, max_length=255)
    plan_name: Optional[str] = Field(None, max_length=255)
    service_category: Optional[str] = Field(None, min_length=2, max_length=255)
    scheduled_at: Optional[datetime] = None
