from __future__ import annotations

import math
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Mapping, Sequence
from urllib.parse import urlparse

from sqlalchemy.orm import Session

from backend.db import models


class AssetRepositoryError(RuntimeError):
    """Base error for asset repository failures."""


class AssetNotFoundError(AssetRepositoryError):
    """Raised when an asset cannot be found."""


class AssetOwnershipError(AssetRepositoryError):
    """Raised when asset ownership does not match the caller."""


class AssetStoragePolicyError(AssetRepositoryError):
    """Raised when the storage key violates security policy."""


class AssetMetadataRetrievalError(AssetRepositoryError):
    """Raised when object metadata could not be retrieved."""


class AssetMetadataValidationError(AssetRepositoryError):
    """Raised when storage metadata is missing required fields."""


class AssetContentTypeError(AssetRepositoryError):
    """Raised when the stored object content-type mismatches expectations."""


class AssetTooLargeError(AssetRepositoryError):
    """Raised when the stored object exceeds the allowed size."""


@dataclass(frozen=True)
class AssetRecord:
    """Canonical view of an asset row and its storage location."""

    id: str
    owner_id: int
    bucket: str
    object_key: str
    content_type: str
    created_at: datetime
    storage_uri: str

    def as_s3_uri(self) -> str:
        """Return the fully-qualified S3 URI for the asset."""

        return self.storage_uri


@dataclass(frozen=True)
class StorageObjectMetadata:
    """Metadata describing an individual stored object."""

    content_length: int
    content_type: str
    etag: str | None
    metadata: Mapping[str, str]
    exif: Mapping[str, object] | None


@dataclass(frozen=True)
class AssetProcessingInfo:
    """Aggregate bundle returned to callers that need preprocessing inputs."""

    asset: AssetRecord
    storage_metadata: StorageObjectMetadata | None
    owner_claim: str | None
    origin: str | None


MetadataFetcher = Callable[[str, str], StorageObjectMetadata]


def _normalise_metadata(metadata: Mapping[str, str]) -> Mapping[str, str]:
    return {str(key).lower(): str(value) for key, value in metadata.items()}


class AssetRepository:
    """Repository encapsulating access to asset metadata and storage policy validation."""

    def __init__(
        self,
        session: Session,
        *,
        bucket_name: str | None = None,
        allowed_content_types: Sequence[str] | None = None,
        metadata_fetcher: MetadataFetcher | None = None,
        max_content_length: int = 8_388_608,
        retry_attempts: int = 3,
        retry_backoff_seconds: float = 0.1,
        retry_exceptions: tuple[type[BaseException], ...] = (TimeoutError, ConnectionError),
    ) -> None:
        self._session = session
        self._bucket_name = bucket_name
        self._allowed_content_types = tuple(allowed_content_types or ("image/jpeg", "image/png"))
        self._metadata_fetcher = metadata_fetcher
        self._max_content_length = int(max_content_length)
        self._retry_attempts = max(int(retry_attempts), 1)
        self._retry_backoff_seconds = max(float(retry_backoff_seconds), 0.0)
        self._retry_exceptions = retry_exceptions

    def get_by_id(self, asset_id: str, *, expected_owner_id: int | None = None) -> AssetRecord:
        """Retrieve an asset by ID and validate storage constraints."""

        if not asset_id:
            raise AssetNotFoundError("asset_id must be provided")

        record = self._session.get(models.Asset, asset_id)
        if record is None:
            raise AssetNotFoundError(f"asset {asset_id!r} was not found")

        if expected_owner_id is not None and int(record.owner_id) != int(expected_owner_id):
            raise AssetOwnershipError(
                f"asset {asset_id!r} is owned by {record.owner_id}, expected {expected_owner_id}"
            )

        bucket, object_key = self._parse_storage_key(record.storage_key)
        self._validate_storage_key(bucket, object_key, owner_id=int(record.owner_id))
        self._validate_content_type(record.content_type)

        return AssetRecord(
            id=record.id,
            owner_id=int(record.owner_id),
            bucket=bucket,
            object_key=object_key,
            content_type=record.content_type,
            created_at=record.created_at,
            storage_uri=f"s3://{bucket}/{object_key}",
        )

    def resolve_for_processing(
        self,
        asset_id: str,
        *,
        expected_owner_id: int | None = None,
        fetch_object_metadata: bool = True,
    ) -> AssetProcessingInfo:
        """Return asset information alongside optional object metadata for preprocessing."""

        asset = self.get_by_id(asset_id, expected_owner_id=expected_owner_id)
        metadata: StorageObjectMetadata | None = None
        owner_claim: str | None = None
        origin_claim: str | None = None
        if fetch_object_metadata:
            metadata = self._fetch_object_metadata(asset)
            owner_claim, origin_claim = self._validate_object_metadata(asset, metadata)
        return AssetProcessingInfo(
            asset=asset,
            storage_metadata=metadata,
            owner_claim=owner_claim,
            origin=origin_claim,
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _parse_storage_key(self, storage_key: str) -> tuple[str, str]:
        parsed = urlparse(storage_key)
        if parsed.scheme:
            if parsed.scheme != "s3":
                raise AssetStoragePolicyError(f"unsupported storage scheme {parsed.scheme!r}")
            bucket = parsed.netloc
            object_key = parsed.path.lstrip("/")
        else:
            bucket = ""
            object_key = storage_key.lstrip("/")

        if not object_key:
            raise AssetStoragePolicyError("storage key must reference an object path")

        if not bucket:
            if not self._bucket_name:
                raise AssetStoragePolicyError("storage key is missing bucket name and no default is configured")
            bucket = self._bucket_name

        if self._bucket_name and bucket != self._bucket_name:
            raise AssetStoragePolicyError(
                f"asset stored in bucket {bucket!r} which is not allowed (expected {self._bucket_name!r})"
            )

        return bucket, object_key

    def _validate_storage_key(self, bucket: str, object_key: str, *, owner_id: int) -> None:
        if "/" not in object_key:
            raise AssetStoragePolicyError("storage key must include a prefix namespace")

        if object_key.startswith("/") or object_key.endswith("/"):
            raise AssetStoragePolicyError("storage key may not start or end with a slash")

        if any(part in {"", ".", ".."} for part in object_key.split("/")):
            raise AssetStoragePolicyError("storage key contains invalid path segments")

        expected_prefix = f"journal/{owner_id}/"
        if not object_key.startswith(expected_prefix):
            raise AssetStoragePolicyError("storage key must reside within the authorised journal namespace")

        parts = object_key.split("/")
        if len(parts) < 5:
            raise AssetStoragePolicyError("storage key must include journal/<owner>/<yyyy>/<mm>/ hierarchy")

        year, month = parts[2], parts[3]
        if not (len(year) == 4 and year.isdigit()):
            raise AssetStoragePolicyError("storage key must include a four-digit year component")

        if not (len(month) == 2 and month.isdigit() and 1 <= int(month) <= 12):
            raise AssetStoragePolicyError("storage key must include a valid month component (01-12)")

    def _validate_content_type(self, content_type: str) -> None:
        if self._allowed_content_types and content_type not in self._allowed_content_types:
            raise AssetContentTypeError(f"content-type {content_type!r} is not permitted")

    def _fetch_object_metadata(self, asset: AssetRecord) -> StorageObjectMetadata:
        if self._metadata_fetcher is None:
            raise AssetMetadataRetrievalError("no metadata fetcher configured for repository")

        last_exception: BaseException | None = None
        for attempt in range(1, self._retry_attempts + 1):
            try:
                raw = self._metadata_fetcher(asset.bucket, asset.object_key)
                metadata_map = {str(k): str(v) for k, v in raw.metadata.items()}
                exif_map = None if raw.exif is None else {str(k): v for k, v in raw.exif.items()}
                return StorageObjectMetadata(
                    content_length=int(raw.content_length),
                    content_type=str(raw.content_type),
                    etag=None if raw.etag is None else str(raw.etag),
                    metadata=metadata_map,
                    exif=exif_map,
                )
            except self._retry_exceptions as exc:
                last_exception = exc
                if attempt == self._retry_attempts:
                    break
                if self._retry_backoff_seconds:
                    time.sleep(self._retry_backoff_seconds * math.pow(2, attempt - 1))
            except BaseException as exc:  # pragma: no cover - escalate unexpected issues
                raise AssetMetadataRetrievalError(str(exc)) from exc

        assert last_exception is not None  # for mypy
        raise AssetMetadataRetrievalError(str(last_exception)) from last_exception

    def _validate_object_metadata(self, asset: AssetRecord, metadata: StorageObjectMetadata) -> tuple[str, str]:
        if metadata.content_type != asset.content_type:
            raise AssetContentTypeError(
                f"storage content-type {metadata.content_type!r} does not match asset metadata {asset.content_type!r}"
            )

        if metadata.content_length <= 0:
            raise AssetMetadataValidationError("storage object reports zero or negative content length")

        if metadata.content_length > self._max_content_length:
            raise AssetTooLargeError(
                f"storage object size {metadata.content_length} exceeds limit {self._max_content_length}"
            )

        normalised = _normalise_metadata(metadata.metadata)
        owner_claim = normalised.get("owner") or normalised.get("x-amz-meta-owner")
        if owner_claim is None:
            raise AssetMetadataValidationError("owner metadata is missing from storage object")

        if owner_claim != str(asset.owner_id):
            raise AssetMetadataValidationError(
                f"storage object owner metadata {owner_claim!r} does not match asset owner {asset.owner_id}"
            )

        origin_claim = normalised.get("origin") or normalised.get("x-amz-meta-origin")
        if origin_claim is None:
            raise AssetMetadataValidationError("origin metadata is missing from storage object")

        # Ensure canonical metadata keys exist for downstream consumers.
        metadata.metadata["owner"] = owner_claim
        metadata.metadata["origin"] = origin_claim

        return owner_claim, origin_claim
