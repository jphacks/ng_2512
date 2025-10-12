"""Utilities for storing album assets in an S3-compatible object storage."""

from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Sequence
from uuid import uuid4

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
from fastapi import UploadFile


class StorageError(RuntimeError):
    """Base error for storage related failures."""


class StorageConfigurationError(StorageError):
    """Raised when storage is not configured properly."""


class StorageUploadError(StorageError):
    """Raised when uploading to storage fails."""


_MIME_EXTENSION_MAP: dict[str, str] = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/heic": ".heic",
    "image/heif": ".heif",
}


def _clean_env(value: str | None) -> str | None:
    if value is None:
        return None
    stripped = value.strip().strip("'").strip('"')
    return stripped or None


@dataclass(frozen=True)
class S3Settings:
    bucket: str
    endpoint_url: str | None
    region: str | None
    access_key: str | None
    secret_key: str | None
    public_base_url: str | None
    addressing_style: str | None

    def object_url(self, key: str) -> str:
        """Return the public URL (or presigned-style URL) for an object."""
        normalized_key = key.lstrip("/")
        if self.public_base_url:
            base = self.public_base_url.rstrip("/")
            return f"{base}/{normalized_key}"
        if self.endpoint_url:
            base = self.endpoint_url.rstrip("/")
            return f"{base}/{self.bucket}/{normalized_key}"
        region = self.region or "us-east-1"
        if region == "us-east-1":
            return f"https://{self.bucket}.s3.amazonaws.com/{normalized_key}"
        return f"https://{self.bucket}.s3.{region}.amazonaws.com/{normalized_key}"


@lru_cache
def get_s3_settings() -> S3Settings:
    bucket = _clean_env(os.getenv("S3_BUCKET"))
    if not bucket:
        raise StorageConfigurationError("S3_BUCKET is not configured.")

    return S3Settings(
        bucket=bucket,
        endpoint_url=_clean_env(os.getenv("S3_ENDPOINT")),
        region=_clean_env(os.getenv("S3_REGION")),
        access_key=_clean_env(os.getenv("S3_ACCESS_KEY")),
        secret_key=_clean_env(os.getenv("S3_SECRET_KEY")),
        public_base_url=_clean_env(os.getenv("S3_PUBLIC_BASE_URL")),
        addressing_style=_clean_env(os.getenv("S3_ADDRESSING_STYLE")),
    )


@lru_cache
def get_s3_client():
    """Return a cached boto3 S3 client configured from environment variables."""
    settings = get_s3_settings()
    session = boto3.session.Session(
        aws_access_key_id=settings.access_key,
        aws_secret_access_key=settings.secret_key,
        region_name=settings.region,
    )
    config_kwargs: dict[str, object] = {"signature_version": "s3v4"}
    if settings.addressing_style:
        config_kwargs["s3"] = {"addressing_style": settings.addressing_style}
    config = Config(**config_kwargs)
    return session.client("s3", endpoint_url=settings.endpoint_url, config=config)


class AlbumPhotoStorage:
    """Upload album photos to S3 and expose their public URLs."""

    def __init__(self):
        self._client = get_s3_client()
        self._settings = get_s3_settings()

    async def upload(self, album_id: int, files: Sequence[UploadFile]) -> list[str]:
        if not files:
            raise StorageUploadError("photo must contain at least one file.")

        uploaded_urls: list[str] = []
        for file in files:
            if file is None:
                continue
            key = self._build_key(album_id, file)
            await file.seek(0)

            def _upload() -> None:
                extra_args = self._extra_args(file)
                self._client.upload_fileobj(
                    file.file,
                    self._settings.bucket,
                    key,
                    ExtraArgs=extra_args or None,
                )

            try:
                await asyncio.to_thread(_upload)
            except (BotoCoreError, ClientError) as exc:  # pragma: no cover - defensive
                raise StorageUploadError("Failed to upload image to storage.") from exc

            uploaded_urls.append(self._settings.object_url(key))

        if not uploaded_urls:
            raise StorageUploadError("No valid album photos were provided.")

        return uploaded_urls

    def _build_key(self, album_id: int, file: UploadFile) -> str:
        suffix = self._guess_extension(file)
        return f"albums/{album_id}/{uuid4().hex}{suffix}"

    @staticmethod
    def _guess_extension(file: UploadFile) -> str:
        filename = file.filename or ""
        suffix = Path(filename).suffix.lower()
        if suffix:
            return suffix
        content_type = (file.content_type or "").lower()
        return _MIME_EXTENSION_MAP.get(content_type, ".bin")

    @staticmethod
    def _extra_args(file: UploadFile) -> dict[str, str]:
        extra: dict[str, str] = {}
        if file.content_type:
            extra["ContentType"] = file.content_type
        return extra


def get_album_storage() -> AlbumPhotoStorage:
    """Return a storage helper for album photo uploads."""
    return AlbumPhotoStorage()

