from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_token, verify_password
from app.db.session import get_db
from app.db import models
from app.schemas.auth import LoginRequest, RefreshRequest, TokenResponse

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    user = db.query(models.User).filter(models.User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    access = create_token(
        {
            "sub": str(user.id),
            "tenant_id": str(user.tenant_id),
            "role": user.role,
            "type": "access",
        },
        timedelta(minutes=settings.access_token_exp_minutes),
    )
    refresh = create_token(
        {
            "sub": str(user.id),
            "tenant_id": str(user.tenant_id),
            "role": user.role,
            "type": "refresh",
        },
        timedelta(days=settings.refresh_token_exp_days),
    )
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/refresh", response_model=TokenResponse)
def refresh(payload: RefreshRequest) -> TokenResponse:
    from app.core.security import decode_token

    try:
        token_payload = decode_token(payload.refresh_token)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    if token_payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    access = create_token(
        {
            "sub": token_payload.get("sub"),
            "tenant_id": token_payload.get("tenant_id"),
            "role": token_payload.get("role"),
            "type": "access",
        },
        timedelta(minutes=settings.access_token_exp_minutes),
    )
    refresh = create_token(
        {
            "sub": token_payload.get("sub"),
            "tenant_id": token_payload.get("tenant_id"),
            "role": token_payload.get("role"),
            "type": "refresh",
        },
        timedelta(days=settings.refresh_token_exp_days),
    )
    return TokenResponse(access_token=access, refresh_token=refresh)


@router.post("/logout")
def logout(user: models.User = Depends(get_current_user)) -> dict:
    return {"status": "ok"}
