import uuid
import sys
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, JSON, inspect
from sqlalchemy.orm import sessionmaker
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.pool import StaticPool

os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.main import app  # noqa: E402
from app.db import models  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import get_db  # noqa: E402
from app.api import deps  # noqa: E402


@pytest.fixture
def test_app(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    # Patch unsupported PostgreSQL JSONB types to SQLite JSON for tests
    for table in Base.metadata.tables.values():
        for column in table.columns:
            if isinstance(column.type, JSONB):
                column.type = JSON()

    # Create only the tables we need for these tests
    for tbl in [
        models.Tenant.__table__,
        models.User.__table__,
        models.Case.__table__,
        models.IntakeItem.__table__,
        models.AuditEvent.__table__,
    ]:
        tbl.create(bind=engine, checkfirst=True)

    inspector = inspect(engine)
    assert "cases" in inspector.get_table_names()
    assert "intake_items" in inspector.get_table_names()

    # Seed tenant and user
    db = TestingSessionLocal()
    tenant = models.Tenant(name="Test Tenant")
    db.add(tenant)
    db.commit()
    db.refresh(tenant)

    user = models.User(
        tenant_id=tenant.id,
        email="user@test.com",
        password_hash="hashed",
        role="admin",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    db.close()

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    def override_get_current_user():
        return user

    # Override dependencies
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[deps.get_current_user] = override_get_current_user

    # Patch intake classification to avoid Celery/Redis
    monkeypatch.setattr(
        "app.workers.tasks.classify_intake_item",
        type(
            "DummyTask",
            (),
            {"delay": staticmethod(lambda *args, **kwargs: None)},
        )(),
    )

    client = TestClient(app)
    yield client

    app.dependency_overrides = {}


def test_create_and_list_cases(test_app):
    client = test_app
    resp = client.post(
        "/cases",
        json={"type": "intake", "status": "pending", "title": "Test Case"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "intake"
    assert data["title"] == "Test Case"

    list_resp = client.get("/cases")
    assert list_resp.status_code == 200
    items = list_resp.json()
    assert len(items) == 1
    assert items[0]["id"] == data["id"]


def test_intake_text_creation(test_app):
    client = test_app
    resp = client.post(
        "/intake",
        json={"text_content": "Sample note", "source": "upload"},
    )
    assert resp.status_code == 200
    item = resp.json()
    assert item["status"] == "received"
    assert item["source"] == "upload"
    assert item["text_content"] == "Sample note"
