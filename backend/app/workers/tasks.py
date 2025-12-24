import tempfile
import uuid

from app.db.session import SessionLocal
from app.db import models
from app.services import audit
from app.services.connectors import get_connector
from app.services.extraction import extract_with_llm
from app.core.config import settings
from app.services.reporting import render_summary_pdf
from app.services.storage import download_bytes, ensure_bucket_exists, upload_bytes, upload_text
from app.utils.hashing import sha256_text
from app.utils.text_extraction import extract_text_from_image, extract_text_from_pdf
from app.workers.celery_app import celery_app


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def run_verification(self, verification_id: str) -> str:
    db = SessionLocal()
    try:
        verification = db.query(models.Verification).filter_by(id=verification_id).first()
        if not verification:
            return "verification_not_found"

        verification.status = "running"
        db.commit()
        audit.log_event(
            db,
            tenant_id=verification.tenant_id,
            actor_type="system",
            actor_id=None,
            event_type="verification_run_started",
            entity_type="verification",
            entity_id=verification.id,
            diff_json=None,
        )

        patient = verification.patient_info
        insurance = verification.insurance_info
        payload = {
            "payer_name": verification.payer_name,
            "member_id": insurance.member_id if insurance else None,
            "patient_name": patient.patient_name if patient else None,
            "date_of_birth": patient.date_of_birth.isoformat() if patient else None,
        }
        connector = get_connector(verification.payer_name)
        result = connector.get_eligibility(payload)

        if result.success and result.raw_text:
            ensure_bucket_exists()
            artifact_id = uuid.uuid4()
            storage_key = f"artifacts/{verification.tenant_id}/{artifact_id}.txt"
            upload_text(storage_key, result.raw_text)
            artifact = models.Artifact(
                id=artifact_id,
                tenant_id=verification.tenant_id,
                verification_id=verification.id,
                type="text",
                source="connector",
                filename=None,
                storage_key=storage_key,
                text_content=result.raw_text,
                sha256=sha256_text(result.raw_text),
                created_by=None,
            )
            db.add(artifact)
            db.commit()
            audit.log_event(
                db,
                tenant_id=verification.tenant_id,
                actor_type="system",
                actor_id=None,
                event_type="evidence_uploaded",
                entity_type="artifact",
                entity_id=artifact.id,
                diff_json={"source": "connector", "verification_id": str(verification.id)},
            )
            extract_summary.delay(str(verification.id))
            return "queued_extraction"

        verification.status = "blocked_needs_evidence"
        db.commit()
        audit.log_event(
            db,
            tenant_id=verification.tenant_id,
            actor_type="system",
            actor_id=None,
            event_type="verification_failed",
            entity_type="verification",
            entity_id=verification.id,
            diff_json={"reason": result.failure_reason},
        )
        return "blocked_needs_evidence"
    finally:
        db.close()


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def extract_summary(self, verification_id: str) -> str:
    db = SessionLocal()
    try:
        verification = db.query(models.Verification).filter_by(id=verification_id).first()
        if not verification:
            return "verification_not_found"

        artifacts = db.query(models.Artifact).filter_by(verification_id=verification_id).all()
        artifact_payloads: list[dict] = []

        for artifact in artifacts:
            text = ""
            if artifact.type == "text" and artifact.text_content:
                text = artifact.text_content
            elif artifact.storage_key:
                data = download_bytes(artifact.storage_key)
                with tempfile.NamedTemporaryFile(delete=False) as tmp:
                    tmp.write(data)
                    tmp.flush()
                    if artifact.type == "pdf":
                        text = extract_text_from_pdf(tmp.name)
                    elif artifact.type == "image":
                        text = extract_text_from_image(tmp.name)
            artifact_payloads.append({"id": str(artifact.id), "text": text})

        extraction = extract_with_llm(artifact_payloads)

        db.query(models.SummaryField).filter_by(verification_id=verification_id).delete()
        db.query(models.DraftSummary).filter_by(verification_id=verification_id).delete()

        draft = models.DraftSummary(
            verification_id=verification.id,
            llm_model_name=settings.llm_model_name,
            raw_llm_output_json=extraction.raw_output,
        )
        db.add(draft)
        db.commit()

        for field in extraction.fields:
            summary = models.SummaryField(
                verification_id=verification.id,
                field_name=field.field_name,
                value_json=field.value,
                confidence=field.confidence,
                evidence_ref_json=None
                if not field.evidence
                else {
                    "artifact_id": field.evidence.artifact_id,
                    "text_span": field.evidence.text_span,
                    "page": field.evidence.page,
                },
                status="draft",
            )
            db.add(summary)

        verification.status = "needs_human_review" if extraction.needs_review else "draft_ready"
        db.commit()
        audit.log_event(
            db,
            tenant_id=verification.tenant_id,
            actor_type="system",
            actor_id=None,
            event_type="extraction_completed",
            entity_type="verification",
            entity_id=verification.id,
            diff_json={"status": verification.status},
        )
        return verification.status
    finally:
        db.close()


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def generate_report(self, verification_id: str) -> str:
    db = SessionLocal()
    try:
        verification = db.query(models.Verification).filter_by(id=verification_id).first()
        if not verification:
            return "verification_not_found"

        fields = (
            db.query(models.SummaryField)
            .filter_by(verification_id=verification_id)
            .order_by(models.SummaryField.field_name)
            .all()
        )
        if not fields:
            return "missing_fields"

        report_fields = [
            {
                "field_name": field.field_name,
                "value": field.value_json,
                "status": field.status,
            }
            for field in fields
        ]

        pdf_bytes, sha256 = render_summary_pdf(str(verification.id), report_fields)
        ensure_bucket_exists()
        report_key = f"reports/{verification.tenant_id}/{verification.id}.pdf"
        upload_bytes(report_key, pdf_bytes, content_type="application/pdf")

        report = models.GeneratedReport(
            verification_id=verification.id,
            storage_key=report_key,
            sha256=sha256,
        )
        db.add(report)
        db.commit()

        audit.log_event(
            db,
            tenant_id=verification.tenant_id,
            actor_type="system",
            actor_id=None,
            event_type="report_generated",
            entity_type="verification",
            entity_id=verification.id,
            diff_json={"storage_key": report_key},
        )
        return "report_generated"
    finally:
        db.close()
