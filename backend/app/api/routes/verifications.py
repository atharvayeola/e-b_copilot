from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.db import models
from app.schemas.verification import (
    VerificationCreateRequest,
    VerificationListItem,
    VerificationOut,
    VerificationUpdateRequest,
)
from app.services import audit
from app.workers.tasks import run_verification

router = APIRouter()


@router.post("", response_model=VerificationOut)
def create_verification(
    payload: VerificationCreateRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer", "scheduler")),
) -> VerificationOut:
    verification = models.Verification(
        tenant_id=user.tenant_id,
        status="pending",
        payer_name=payload.payer_name,
        plan_name=payload.plan_name,
        service_category=payload.service_category,
        scheduled_at=payload.scheduled_at,
        created_by=user.id,
    )
    db.add(verification)
    db.commit()
    db.refresh(verification)

    patient = models.PatientInfo(
        verification_id=verification.id,
        patient_name=payload.patient_info.patient_name,
        date_of_birth=payload.patient_info.date_of_birth,
        phone=payload.patient_info.phone,
        patient_identifier=payload.patient_info.patient_identifier,
    )
    insurance = models.InsuranceInfo(
        verification_id=verification.id,
        subscriber_name=payload.insurance_info.subscriber_name,
        relationship_to_patient=payload.insurance_info.relationship_to_patient,
        member_id=payload.insurance_info.member_id,
        group_number=payload.insurance_info.group_number,
    )
    db.add(patient)
    db.add(insurance)
    db.commit()

    audit.log_event(
        db,
        tenant_id=user.tenant_id,
        actor_type="user",
        actor_id=user.id,
        event_type="verification_created",
        entity_type="verification",
        entity_id=verification.id,
        diff_json={"status": "pending"},
    )

    verification.patient_info = patient
    verification.insurance_info = insurance
    return verification


@router.get("", response_model=list[VerificationListItem])
def list_verifications(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    payer_name: Optional[str] = None,
    date_from: Optional[datetime] = Query(default=None, alias="from"),
    date_to: Optional[datetime] = Query(default=None, alias="to"),
    page: int = 1,
    page_size: int = 25,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> list[VerificationListItem]:
    query = (
        db.query(models.Verification, models.PatientInfo)
        .outerjoin(models.PatientInfo, models.PatientInfo.verification_id == models.Verification.id)
        .filter(models.Verification.tenant_id == user.tenant_id)
    )
    if status_filter:
        query = query.filter(models.Verification.status == status_filter)
    if payer_name:
        query = query.filter(models.Verification.payer_name.ilike(f"%{payer_name}%"))
    if date_from:
        query = query.filter(models.Verification.created_at >= date_from)
    if date_to:
        query = query.filter(models.Verification.created_at <= date_to)

    query = query.order_by(models.Verification.created_at.desc())
    results = query.offset((page - 1) * page_size).limit(page_size).all()

    response: list[VerificationListItem] = []
    for verification, patient in results:
        response.append(
            VerificationListItem(
                id=verification.id,
                status=verification.status,
                payer_name=verification.payer_name,
                plan_name=verification.plan_name,
                service_category=verification.service_category,
                scheduled_at=verification.scheduled_at,
                created_at=verification.created_at,
                patient_name=patient.patient_name if patient else None,
            )
        )
    return response


@router.get("/{verification_id}", response_model=VerificationOut)
def get_verification(
    verification_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> VerificationOut:
    verification = (
        db.query(models.Verification)
        .filter(
            models.Verification.id == verification_id,
            models.Verification.tenant_id == user.tenant_id,
        )
        .first()
    )
    if not verification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    return verification


@router.patch("/{verification_id}", response_model=VerificationOut)
def update_verification(
    verification_id: str,
    payload: VerificationUpdateRequest,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer", "scheduler")),
) -> VerificationOut:
    verification = (
        db.query(models.Verification)
        .filter(
            models.Verification.id == verification_id,
            models.Verification.tenant_id == user.tenant_id,
        )
        .first()
    )
    if not verification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    if verification.status == "finalized":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already finalized")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(verification, field, value)
    db.commit()
    db.refresh(verification)

    audit.log_event(
        db,
        tenant_id=user.tenant_id,
        actor_type="user",
        actor_id=user.id,
        event_type="verification_updated",
        entity_type="verification",
        entity_id=verification.id,
        diff_json=payload.model_dump(exclude_unset=True),
    )

    return verification


@router.post("/{verification_id}/run")
def run_verification_job(
    verification_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer", "scheduler")),
) -> dict:
    verification = (
        db.query(models.Verification)
        .filter(
            models.Verification.id == verification_id,
            models.Verification.tenant_id == user.tenant_id,
        )
        .first()
    )
    if not verification:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    job = run_verification.delay(str(verification.id))
    audit.log_event(
        db,
        tenant_id=user.tenant_id,
        actor_type="user",
        actor_id=user.id,
        event_type="verification_run_requested",
        entity_type="verification",
        entity_id=verification.id,
        diff_json={"job_id": job.id},
    )
    return {"job_id": job.id}
