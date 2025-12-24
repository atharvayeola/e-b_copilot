import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db.session import get_db
from app.db import models
from app.schemas.artifact import ArtifactOut
from app.services import audit
from app.services.storage import ensure_bucket_exists, generate_presigned_url, upload_bytes, upload_text
from app.utils.hashing import sha256_bytes, sha256_text
from app.utils.text_extraction import detect_file_type
from app.workers.tasks import extract_summary

router = APIRouter()


@router.post("/verifications/{verification_id}/artifacts", response_model=ArtifactOut)
async def create_artifact(
    verification_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer", "scheduler")),
) -> ArtifactOut:
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

    content_type = request.headers.get("content-type", "")
    if content_type.startswith("application/json"):
        payload = await request.json()
        text_content = payload.get("text_content")
        if not text_content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing text")
        artifact = models.Artifact(
            tenant_id=user.tenant_id,
            verification_id=verification.id,
            type="text",
            source="manual_entry",
            filename=None,
            storage_key=None,
            text_content=text_content,
            sha256=sha256_text(text_content),
            created_by=user.id,
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)
    else:
        form = await request.form()
        upload_file = form.get("file")
        if upload_file is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing file")
        filename = upload_file.filename
        file_type = detect_file_type(filename)
        if file_type not in ["pdf", "image"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file")
        data = await upload_file.read()
        ensure_bucket_exists()
        artifact_id = uuid.uuid4()
        storage_key = f"artifacts/{user.tenant_id}/{verification.id}/{artifact_id}-{filename}"
        upload_bytes(storage_key, data, content_type=upload_file.content_type)
        artifact = models.Artifact(
            id=artifact_id,
            tenant_id=user.tenant_id,
            verification_id=verification.id,
            type=file_type,
            source="upload",
            filename=filename,
            storage_key=storage_key,
            text_content=None,
            sha256=sha256_bytes(data),
            created_by=user.id,
        )
        db.add(artifact)
        db.commit()
        db.refresh(artifact)

    audit.log_event(
        db,
        tenant_id=user.tenant_id,
        actor_type="user",
        actor_id=user.id,
        event_type="evidence_uploaded",
        entity_type="artifact",
        entity_id=artifact.id,
        diff_json={"source": artifact.source, "verification_id": str(verification.id)},
    )

    if verification.status in ["blocked_needs_evidence", "pending", "running"]:
        extract_summary.delay(str(verification.id))

    return artifact


@router.get("/verifications/{verification_id}/artifacts", response_model=list[ArtifactOut])
def list_artifacts(
    verification_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> list[ArtifactOut]:
    artifacts = (
        db.query(models.Artifact)
        .filter(
            models.Artifact.verification_id == verification_id,
            models.Artifact.tenant_id == user.tenant_id,
        )
        .order_by(models.Artifact.created_at.desc())
        .all()
    )
    return artifacts


@router.get("/artifacts/{artifact_id}/download")
def download_artifact(
    artifact_id: str,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> dict:
    artifact = (
        db.query(models.Artifact)
        .filter(
            models.Artifact.id == artifact_id,
            models.Artifact.tenant_id == user.tenant_id,
        )
        .first()
    )
    if not artifact or not artifact.storage_key:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    url = generate_presigned_url(artifact.storage_key)
    return {"download_url": url}
