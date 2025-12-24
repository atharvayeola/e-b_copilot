from pydantic import BaseModel
from typing import Optional


class MetricsOverview(BaseModel):
    median_time_to_draft_minutes: Optional[float]
    median_time_to_finalize_minutes: Optional[float]
    percent_auto_draft_success: float
    percent_needs_human_review: float
    top_failure_reasons: list[dict]
