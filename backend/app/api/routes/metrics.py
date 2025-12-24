from statistics import median

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.db import models
from app.schemas.metrics import MetricsOverview

router = APIRouter()


@router.get("/overview", response_model=MetricsOverview)
def metrics_overview(
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin")),
) -> MetricsOverview:
    verifications = (
        db.query(models.Verification)
        .filter(models.Verification.tenant_id == user.tenant_id)
        .all()
    )
    total = len(verifications)

    draft_events = (
        db.query(models.AuditEvent)
        .filter(
            models.AuditEvent.tenant_id == user.tenant_id,
            models.AuditEvent.event_type == "extraction_completed",
        )
        .all()
    )
    finalize_events = (
        db.query(models.AuditEvent)
        .filter(
            models.AuditEvent.tenant_id == user.tenant_id,
            models.AuditEvent.event_type == "verification_finalized",
        )
        .all()
    )

    draft_times = []
    for event in draft_events:
        verification = next((v for v in verifications if v.id == event.entity_id), None)
        if verification:
            delta = event.created_at - verification.created_at
            draft_times.append(delta.total_seconds() / 60)

    finalize_times = []
    for event in finalize_events:
        verification = next((v for v in verifications if v.id == event.entity_id), None)
        if verification:
            delta = event.created_at - verification.created_at
            finalize_times.append(delta.total_seconds() / 60)

    auto_draft = len([v for v in verifications if v.status in ["draft_ready", "finalized"]])
    needs_review = len([v for v in verifications if v.status == "needs_human_review"])

    failure_events = (
        db.query(models.AuditEvent)
        .filter(
            models.AuditEvent.tenant_id == user.tenant_id,
            models.AuditEvent.event_type == "verification_failed",
        )
        .all()
    )
    failure_counts: dict[str, int] = {}
    for event in failure_events:
        reason = "unknown"
        if isinstance(event.diff_json, dict):
            reason = event.diff_json.get("reason") or reason
        failure_counts[reason] = failure_counts.get(reason, 0) + 1

    top_failure_reasons = [
        {"reason": reason, "count": count}
        for reason, count in sorted(failure_counts.items(), key=lambda item: item[1], reverse=True)
    ]

    return MetricsOverview(
        median_time_to_draft_minutes=median(draft_times) if draft_times else None,
        median_time_to_finalize_minutes=median(finalize_times) if finalize_times else None,
        percent_auto_draft_success=(auto_draft / total * 100) if total else 0,
        percent_needs_human_review=(needs_review / total * 100) if total else 0,
        top_failure_reasons=top_failure_reasons,
    )
