from fastapi import APIRouter

from app.api.routes import (
    auth,
    verifications,
    artifacts,
    summary,
    reports,
    metrics,
    audit,
    cases,
    intake,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(verifications.router, prefix="/verifications", tags=["verifications"])
api_router.include_router(artifacts.router, tags=["artifacts"])
api_router.include_router(summary.router, prefix="/verifications", tags=["summary"])
api_router.include_router(reports.router, prefix="/verifications", tags=["reports"])
api_router.include_router(metrics.router, prefix="/metrics", tags=["metrics"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(cases.router, prefix="/cases", tags=["cases"])
api_router.include_router(intake.router, prefix="/intake", tags=["intake"])
