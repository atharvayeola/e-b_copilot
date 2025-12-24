from datetime import date, datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PatientInfoIn(BaseModel):
    patient_name: str
    date_of_birth: date
    phone: Optional[str] = None
    patient_identifier: Optional[str] = None


class InsuranceInfoIn(BaseModel):
    subscriber_name: Optional[str] = None
    relationship_to_patient: str
    member_id: str
    group_number: Optional[str] = None


class VerificationCreateRequest(BaseModel):
    payer_name: str
    plan_name: Optional[str] = None
    service_category: str
    scheduled_at: Optional[datetime] = None
    patient_info: PatientInfoIn
    insurance_info: InsuranceInfoIn


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


class VerificationUpdateRequest(BaseModel):
    payer_name: Optional[str] = None
    plan_name: Optional[str] = None
    service_category: Optional[str] = None
    scheduled_at: Optional[datetime] = None
