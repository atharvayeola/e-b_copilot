from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_roles, get_current_user
from app.db.session import get_db
from app.db import models
from app.schemas.report import ReportResponse
from app.services import audit
from app.services.storage import generate_presigned_url
from app.workers.tasks import generate_report

router = APIRouter()


@router.post("/{verification_id}/finalize")
def finalize_verification(
    verification_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer")),
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
    if verification.status == "finalized":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already finalized")

    eligibility = (
        db.query(models.SummaryField)
        .filter(
            models.SummaryField.verification_id == verification_id,
            models.SummaryField.field_name == "eligibility_status",
        )
        .first()
    )
    if not eligibility or eligibility.value_json in [None, "unknown"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Eligibility status required before finalizing",
        )

    verification.status = "finalized"
    db.commit()

    audit.log_event(
        db,
        tenant_id=user.tenant_id,
        actor_type="user",
        actor_id=user.id,
        event_type="verification_finalized",
        entity_type="verification",
        entity_id=verification.id,
        diff_json={"status": "finalized"},
    )

    job = generate_report.delay(str(verification.id))
    return {"job_id": job.id}


@router.get("/{verification_id}/report", response_model=ReportResponse)
def get_report(
    verification_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> ReportResponse:
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

    report = (
        db.query(models.GeneratedReport)
        .filter(models.GeneratedReport.verification_id == verification_id)
        .order_by(models.GeneratedReport.created_at.desc())
        .first()
    )
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Report not ready")

    url = generate_presigned_url(report.storage_key)
    return ReportResponse(download_url=url)
