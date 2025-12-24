from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://postgres:postgres@db:5432/eb_copilot"
    redis_url: str = "redis://redis:6379/0"
    jwt_secret: str = "dev-secret"
    jwt_algorithm: str = "HS256"
    access_token_exp_minutes: int = 60
    refresh_token_exp_days: int = 7

    object_storage_endpoint: str = "http://minio:9000"
    object_storage_access_key: str = "minioadmin"
    object_storage_secret_key: str = "minioadmin"
    object_storage_bucket: str = "eb-copilot"
    object_storage_region: str = "us-east-1"
    object_storage_secure: bool = False

    llm_api_key: Optional[str] = None
    llm_model_name: str = "gpt-4o-mini"
    llm_provider: str = "mock"

    enable_ocr: bool = False

    app_name: str = "E&B Copilot"
    cors_origins: str = "http://localhost:3000"


settings = Settings()
