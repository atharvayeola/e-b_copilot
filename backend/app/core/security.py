from datetime import datetime, timedelta
from typing import Any

import bcrypt
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Prefer passlib verification, but fall back to direct bcrypt check if the backend
    raises (e.g., platform-specific bcrypt wrap bug / length guard).
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except ValueError:
        # Last-resort check; still returns False on mismatch.
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_token(payload: dict[str, Any], expires_delta: timedelta) -> str:
    to_encode = payload.copy()
    expire = datetime.utcnow() + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        return payload
    except JWTError as exc:
        raise ValueError("Invalid token") from exc
