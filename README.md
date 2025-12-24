# Eligibility & Benefits Verification Copilot (E&B Copilot)

## Why this exists

Outpatient teams spend hours verifying insurance eligibility and benefits before visits. The work is repetitive, error-prone, and hard to audit, driving denials and rework. E&B Copilot automates the heavy lifting, produces evidence-backed summaries, routes low-confidence cases to humans, and keeps an immutable audit trail.

## What’s implemented

- **Eligibility worklist**: create, filter, and run verifications; mock connector to return deterministic eligibility data.
- **Evidence ingestion**: connector text, uploaded PDF/image, or manual transcript; artifacts stored with hashes and metadata.
- **Extraction & review**: LLM-backed extraction (schema-constrained), confidence routing, human review (approve/edit/unknown with reasons).
- **Reporting**: deterministic PDF Benefits Summary for finalized cases.
- **Audit trail**: every key action logged (creation, evidence upload, extraction, edits, finalization, report generation).
- **Multi-product primitives**: generic `cases` and `intake` flows (intake uploads/text, lightweight classification, assignment to cases) to support future workflows (prior auth, appeals, etc.).

## Demo flow (end-to-end)

1) Log in and open the worklist.  
2) Create a verification.  
3) Run verification (mock connector) or upload evidence.  
4) Review extracted fields; edit or mark unknown; finalize.  
5) Download the PDF report and inspect the audit log.  
6) (Optional) Create a case in “Cases & Intake,” upload/paste intake, watch it classify, and assign it to a case.

## Screenshots

### Login

![Login screen](public/screenshot_login.png)

### Worklist

![Worklist](public/screenshot_worklist.png)

### Cases & Intake (new multi-product tab)

*Use the in-app “Cases & Intake” tab to create cases and upload intake; add more screenshots in `public/` as you capture them.*

## Architecture (MVP)

- **Frontend**: Next.js (TypeScript)  
- **API**: FastAPI  
- **Background jobs**: Celery + Redis  
- **Database**: PostgreSQL  
- **Object storage**: S3-compatible (MinIO for local)  
- **Report rendering**: ReportLab (deterministic template)  
- **LLM boundary**: schema-constrained extraction with evidence pointers  
- **Primitives**: verifications, artifacts, draft/final summary fields, audit events, cases, intake items

## Local setup (always use a venv)

1) **Create venv & install deps**
```bash
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```
2) **Env**: `cp .env.example .env` and keep secrets local (never commit `.env`).

3) **Run infra (db/redis/minio)**
```bash
cd infra
docker compose -f docker-compose.yml up -d db redis minio
```

4) **Migrations**
```bash
cd backend
source ../.venv/bin/activate
PYTHONPATH=. DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5435/eb_copilot alembic upgrade head
```

5) **Start API**
```bash
cd backend
source ../.venv/bin/activate
PYTHONPATH=. DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5435/eb_copilot \
REDIS_URL=redis://localhost:6380/0 \
OBJECT_STORAGE_ENDPOINT=http://localhost:9002 \
OBJECT_STORAGE_ACCESS_KEY=minioadmin \
OBJECT_STORAGE_SECRET_KEY=minioadmin \
OBJECT_STORAGE_BUCKET=eb-copilot \
OBJECT_STORAGE_REGION=us-east-1 \
OBJECT_STORAGE_SECURE=false \
LLM_PROVIDER=mock \
LLM_MODEL_NAME=gpt-4o-mini \
JWT_SECRET=dev-secret \
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

6) **Start worker** (new terminal)
```bash
cd backend
source ../.venv/bin/activate
PYTHONPATH=. DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5435/eb_copilot \
REDIS_URL=redis://localhost:6380/0 \
OBJECT_STORAGE_ENDPOINT=http://localhost:9002 \
OBJECT_STORAGE_ACCESS_KEY=minioadmin \
OBJECT_STORAGE_SECRET_KEY=minioadmin \
OBJECT_STORAGE_BUCKET=eb-copilot \
OBJECT_STORAGE_REGION=us-east-1 \
OBJECT_STORAGE_SECURE=false \
LLM_PROVIDER=mock \
LLM_MODEL_NAME=gpt-4o-mini \
JWT_SECRET=dev-secret \
celery -A app.workers.celery_app.celery_app worker -l info
```

7) **Start frontend** (new terminal)
```bash
cd frontend
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 npm run dev
```
Visit http://localhost:3000.

> Tip: stop old containers before running host-mode API to avoid port collisions on 8000/3000.

## Seed demo data & creds

```bash
cd backend
source ../.venv/bin/activate
python ../scripts/seed.py
```

Demo users:
- `admin@demo.com` / `password123`
- `reviewer@demo.com` / `password123`
- `scheduler@demo.com` / `password123`

## Testing

- Backend unit/integration: `cd backend && source ../.venv/bin/activate && pytest -q`
- Frontend sanity: `cd frontend && npm run build` (Next.js compile + type check)
- Manual happy path: login → create verification → run (mock) → review → finalize → download report → check audit log.

## APIs and jobs (implemented)

- Auth: `POST /auth/login`, `POST /auth/refresh`
- Verifications: create/list/get, run (`/verifications/{id}/run`), artifacts upload/text, draft summary, field review, finalize, report download
- Cases (multi-workflow): `POST/GET /cases`
- Intake: `POST /intake` (file or text, optional case_id), `GET /intake?status=&case_id=`, `PATCH /intake/{id}` (assign case, status/doc_type/classification)
- Background jobs: `run_verification`, `extract_summary`, `generate_report`, `classify_intake_item`
- Audit: every key action recorded with actor, entity, diff

## What’s new (multi-product support)

- Generic `cases` table + API for additional workflows.
- Intake ingestion + lightweight classification (filename/text heuristics), assignable to cases.
- Worklist tab for “Cases & Intake” alongside verifications.
- Safer audit serialization for UUIDs; JSONB → JSON patching in tests.

## Security & secrets

- `.env` is gitignored; keep real secrets out of the repo.
- Uses signed URLs for object downloads; hashes stored for artifacts and reports.
- Role-based access (scheduler/reviewer/admin); token-based auth (JWT).

## Project structure

- `frontend/`: Next.js UI (worklist, case detail, review, report)
- `backend/`: FastAPI service, models, migrations, and APIs
- `backend/app/workers/`: Celery background jobs
- `infra/`: Docker Compose stack
- `public/`: Screenshots for docs
- `scripts/`: Seed data and demo helpers
