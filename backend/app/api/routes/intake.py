import tempfile
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_roles
from app.db import models
from app.db.session import get_db
from app.schemas.intake import IntakeCreate, IntakeOut, IntakeUpdate
from app.services import audit
from app.services.storage import ensure_bucket_exists, upload_bytes
from app.utils.hashing import sha256_bytes, sha256_text
from app.utils.text_extraction import detect_file_type, extract_text_from_pdf, extract_text_from_image
from app.workers.tasks import classify_intake_item

router = APIRouter()


@router.post("", response_model=IntakeOut)
async def create_intake_item(
    request: Request,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer", "scheduler")),
) -> IntakeOut:
    content_type = request.headers.get("content-type", "")
    intake_id = uuid.uuid4()
    text_content = None
    filename = None
    storage_key = None
    sha256 = None
    source = "upload"
    case_id = None

    if content_type.startswith("application/json"):
        payload = IntakeCreate(**(await request.json()))
        text_content = payload.text_content
        source = payload.source
        case_id = payload.case_id
        filename = payload.filename
        if not text_content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing text_content")
        sha256 = sha256_text(text_content)
        if case_id:
            case = (
                db.query(models.Case)
                .filter(models.Case.id == case_id, models.Case.tenant_id == user.tenant_id)
                .first()
            )
            if not case:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
    else:
        form = await request.form()
        upload_file = form.get("file")
        case_id_value = form.get("case_id")
        source = form.get("source") or "upload"
        if case_id_value:
            try:
                case_id = uuid.UUID(case_id_value)
            except ValueError:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid case_id")
            case = (
                db.query(models.Case)
                .filter(models.Case.id == case_id, models.Case.tenant_id == user.tenant_id)
                .first()
            )
            if not case:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
        if upload_file is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing file")
        filename = upload_file.filename
        file_type = detect_file_type(filename)
        data = await upload_file.read()
        ensure_bucket_exists()
        storage_key = f"intake/{user.tenant_id}/{intake_id}-{filename}"
        upload_bytes(storage_key, data, content_type=upload_file.content_type)
        sha256 = sha256_bytes(data)
        with tempfile.NamedTemporaryFile(delete=True) as tmp:
            tmp.write(data)
            tmp.flush()
            if file_type == "pdf":
                text_content = extract_text_from_pdf(tmp.name)
            elif file_type == "image":
                text_content = extract_text_from_image(tmp.name)
            else:
                text_content = None

    intake = models.IntakeItem(
        id=intake_id,
        tenant_id=user.tenant_id,
        case_id=case_id,
        status="received",
        source=source,
        doc_type=None,
        filename=filename,
        storage_key=storage_key,
        text_content=text_content,
        sha256=sha256,
        classification_json=None,
        created_by=user.id,
    )
    db.add(intake)
    db.commit()
    db.refresh(intake)

    audit.log_event(
        db,
        tenant_id=user.tenant_id,
        actor_type="user",
        actor_id=user.id,
        event_type="intake_created",
        entity_type="intake_item",
        entity_id=intake.id,
        diff_json={"case_id": case_id, "source": source},
    )

    classify_intake_item.delay(str(intake.id))

    return intake


@router.get("", response_model=list[IntakeOut])
def list_intake_items(
    status_filter: str | None = None,
    case_id: str | None = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
) -> list[IntakeOut]:
    query = db.query(models.IntakeItem).filter(models.IntakeItem.tenant_id == user.tenant_id)
    if status_filter:
        query = query.filter(models.IntakeItem.status == status_filter)
    if case_id:
        try:
            case_uuid = uuid.UUID(case_id)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid case_id")
        query = query.filter(models.IntakeItem.case_id == case_uuid)
    items = query.order_by(models.IntakeItem.created_at.desc()).all()
    return items


@router.patch("/{intake_id}", response_model=IntakeOut)
def update_intake_item(
    intake_id: str,
    payload: IntakeUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin", "reviewer", "scheduler")),
) -> IntakeOut:
    try:
        intake_uuid = uuid.UUID(intake_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid intake_id")
    intake = (
        db.query(models.IntakeItem)
        .filter(models.IntakeItem.id == intake_uuid, models.IntakeItem.tenant_id == user.tenant_id)
        .first()
    )
    if not intake:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intake not found")

    if payload.case_id:
        case = (
            db.query(models.Case)
            .filter(models.Case.id == payload.case_id, models.Case.tenant_id == user.tenant_id)
            .first()
        )
        if not case:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found")
        intake.case_id = payload.case_id

    update_fields = payload.model_dump(exclude_unset=True, exclude={"case_id"})
    for field, value in update_fields.items():
        setattr(intake, field, value)

    db.commit()
    db.refresh(intake)

    audit.log_event(
        db,
        tenant_id=user.tenant_id,
        actor_type="user",
        actor_id=user.id,
        event_type="intake_updated",
        entity_type="intake_item",
        entity_id=intake.id,
        diff_json=payload.model_dump(exclude_unset=True),
    )
    return intake
