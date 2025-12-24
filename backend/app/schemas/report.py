from pydantic import BaseModel


class ReportResponse(BaseModel):
    download_url: str
