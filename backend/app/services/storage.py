import io
from typing import Optional

import boto3
from botocore.client import Config

from app.core.config import settings


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.object_storage_endpoint,
        aws_access_key_id=settings.object_storage_access_key,
        aws_secret_access_key=settings.object_storage_secret_key,
        region_name=settings.object_storage_region,
        use_ssl=settings.object_storage_secure,
        config=Config(signature_version="s3v4"),
    )


def ensure_bucket_exists():
    client = get_s3_client()
    buckets = client.list_buckets().get("Buckets", [])
    if not any(bucket["Name"] == settings.object_storage_bucket for bucket in buckets):
        client.create_bucket(Bucket=settings.object_storage_bucket)


def upload_bytes(key: str, data: bytes, content_type: Optional[str] = None) -> None:
    client = get_s3_client()
    extra = {}
    if content_type:
        extra["ContentType"] = content_type
    client.upload_fileobj(io.BytesIO(data), settings.object_storage_bucket, key, ExtraArgs=extra)


def upload_text(key: str, text: str) -> None:
    upload_bytes(key, text.encode("utf-8"), content_type="text/plain")


def generate_presigned_url(key: str, expires_in: int = 900) -> str:
    client = get_s3_client()
    return client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.object_storage_bucket, "Key": key},
        ExpiresIn=expires_in,
    )


def download_bytes(key: str) -> bytes:
    client = get_s3_client()
    response = client.get_object(Bucket=settings.object_storage_bucket, Key=key)
    return response["Body"].read()
