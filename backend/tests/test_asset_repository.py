from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timezone

import pytest
from sqlalchemy.orm import Session

from backend.database import Base, get_session_factory, init_engine
from backend.db import models
from backend.repositories import (
    AssetContentTypeError,
    AssetMetadataRetrievalError,
    AssetMetadataValidationError,
    AssetNotFoundError,
    AssetOwnershipError,
    AssetProcessingInfo,
    AssetRepository,
    AssetStoragePolicyError,
    AssetTooLargeError,
    StorageObjectMetadata,
)

from sqlalchemy.ext.compiler import compiles

try:
    from sqlalchemy.dialects.postgresql import JSONB as PGJSONB
except Exception:  # pragma: no cover
    PGJSONB = None  # type: ignore[assignment]

from pgvector.sqlalchemy import Vector
from sqlalchemy.types import BigInteger

if PGJSONB is not None:

    @compiles(PGJSONB, "sqlite")
    def _sqlite_jsonb(type_, compiler, **kw):  # type: ignore[override]
        return "JSON"


@compiles(Vector, "sqlite")
def _sqlite_vector(type_, compiler, **kw):  # type: ignore[override]
    return "BLOB"


@compiles(BigInteger, "sqlite")
def _sqlite_bigint(type_, compiler, **kw):  # type: ignore[override]
    return "INTEGER"


@pytest.fixture()
def session() -> Iterable[Session]:
    """Provide an in-memory SQLite session for repository tests."""

    engine = init_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    session_factory = get_session_factory()
    session = session_factory()
    try:
        yield session
    finally:
        session.close()


def _make_asset(
    asset_id: str,
    *,
    owner_id: int,
    storage_key: str,
    content_type: str = "image/jpeg",
) -> models.Asset:
    return models.Asset(
        id=asset_id,
        owner_id=owner_id,
        content_type=content_type,
        storage_key=storage_key,
        created_at=datetime.now(timezone.utc),
    )


def test_get_by_id_returns_record_with_validated_path(session: Session):
    asset = _make_asset(
        "asset-1",
        owner_id=42,
        storage_key="s3://journal-bucket/journal/42/2025/01/photo.jpg",
    )
    session.add(asset)
    session.commit()

    repo = AssetRepository(session, bucket_name="journal-bucket")

    record = repo.get_by_id("asset-1", expected_owner_id=42)

    assert record.bucket == "journal-bucket"
    assert record.object_key == "journal/42/2025/01/photo.jpg"
    assert record.as_s3_uri() == "s3://journal-bucket/journal/42/2025/01/photo.jpg"


def test_get_by_id_enforces_owner(session: Session):
    session.add(
        _make_asset(
            "asset-2",
            owner_id=7,
            storage_key="s3://journal-bucket/journal/7/2025/02/photo.jpg",
        )
    )
    session.commit()

    repo = AssetRepository(session, bucket_name="journal-bucket")

    with pytest.raises(AssetOwnershipError):
        repo.get_by_id("asset-2", expected_owner_id=99)


def test_get_by_id_rejects_storage_policy_violations(session: Session):
    session.add(
        _make_asset(
            "asset-3",
            owner_id=17,
            storage_key="s3://journal-bucket/other-prefix/photo.jpg",
        )
    )
    session.commit()

    repo = AssetRepository(session, bucket_name="journal-bucket")

    with pytest.raises(AssetStoragePolicyError):
        repo.get_by_id("asset-3")


def test_get_by_id_requires_bucket_or_default(session: Session):
    session.add(
        _make_asset(
            "asset-4",
            owner_id=9,
            storage_key="journal/9/2025/03/photo.jpg",
        )
    )
    session.commit()

    with pytest.raises(AssetStoragePolicyError):
        AssetRepository(session).get_by_id("asset-4")

    repo = AssetRepository(session, bucket_name="journal-bucket")
    record = repo.get_by_id("asset-4", expected_owner_id=9)
    assert record.bucket == "journal-bucket"


def test_resolve_for_processing_fetches_metadata_with_retry(session: Session):
    session.add(
        _make_asset(
            "asset-5",
            owner_id=1,
            storage_key="s3://journal-bucket/journal/1/2025/01/photo.jpg",
        )
    )
    session.commit()

    attempts: list[int] = []

    def _fetcher(bucket: str, key: str) -> StorageObjectMetadata:
        attempts.append(1)
        if len(attempts) == 1:
            raise TimeoutError("transient")
        assert bucket == "journal-bucket"
        assert key == "journal/1/2025/01/photo.jpg"
        return StorageObjectMetadata(
            content_length=1024,
            content_type="image/jpeg",
            etag="etag-123",
            metadata={"owner": "1", "origin": "mobile"},
            exif={"Orientation": 1},
        )

    repo = AssetRepository(
        session,
        bucket_name="journal-bucket",
        metadata_fetcher=_fetcher,
        retry_attempts=2,
        retry_backoff_seconds=0.0,
    )

    info = repo.resolve_for_processing("asset-5", expected_owner_id=1)
    assert isinstance(info, AssetProcessingInfo)
    assert info.owner_claim == "1"
    assert info.origin == "mobile"
    assert info.storage_metadata is not None
    assert info.storage_metadata.content_length == 1024
    assert info.storage_metadata.metadata["owner"] == "1"
    assert info.storage_metadata.metadata["origin"] == "mobile"
    assert attempts == [1, 1]


def test_resolve_for_processing_can_skip_metadata_fetch(session: Session):
    session.add(
        _make_asset(
            "asset-6",
            owner_id=25,
            storage_key="s3://journal-bucket/journal/25/2025/06/photo.jpg",
        )
    )
    session.commit()

    repo = AssetRepository(session, bucket_name="journal-bucket")

    info = repo.resolve_for_processing("asset-6", expected_owner_id=25, fetch_object_metadata=False)
    assert info.storage_metadata is None
    assert info.owner_claim is None
    assert info.origin is None


def test_resolve_for_processing_raises_on_metadata_errors(session: Session):
    session.add(
        _make_asset(
            "asset-7",
            owner_id=55,
            storage_key="s3://journal-bucket/journal/55/2025/07/photo.jpg",
        )
    )
    session.commit()

    def _fetcher(bucket: str, key: str) -> StorageObjectMetadata:
        return StorageObjectMetadata(
            content_length=1024,
            content_type="image/png",
            etag=None,
            metadata={"owner": "55", "origin": "mobile"},
            exif={},
        )

    repo = AssetRepository(
        session,
        bucket_name="journal-bucket",
        metadata_fetcher=_fetcher,
    )

    with pytest.raises(AssetContentTypeError):
        repo.resolve_for_processing("asset-7", expected_owner_id=55)


def test_resolve_for_processing_rejects_oversized_assets(session: Session):
    session.add(
        _make_asset(
            "asset-8",
            owner_id=61,
            storage_key="s3://journal-bucket/journal/61/2025/08/photo.jpg",
        )
    )
    session.commit()

    def _fetcher(bucket: str, key: str) -> StorageObjectMetadata:
        return StorageObjectMetadata(
            content_length=10_000_000,
            content_type="image/jpeg",
            etag=None,
            metadata={"owner": "61", "origin": "mobile"},
            exif=None,
        )

    repo = AssetRepository(
        session,
        bucket_name="journal-bucket",
        metadata_fetcher=_fetcher,
        max_content_length=8_388_608,
    )

    with pytest.raises(AssetTooLargeError):
        repo.resolve_for_processing("asset-8", expected_owner_id=61)


def test_resolve_for_processing_requires_metadata_fetcher_when_requested(session: Session):
    session.add(
        _make_asset(
            "asset-9",
            owner_id=72,
            storage_key="s3://journal-bucket/journal/72/2025/09/photo.jpg",
        )
    )
    session.commit()

    repo = AssetRepository(session, bucket_name="journal-bucket")

    with pytest.raises(AssetMetadataRetrievalError):
        repo.resolve_for_processing("asset-9", expected_owner_id=72)


def test_resolve_for_processing_validates_owner_metadata(session: Session):
    session.add(
        _make_asset(
            "asset-10",
            owner_id=88,
            storage_key="s3://journal-bucket/journal/88/2025/10/photo.jpg",
        )
    )
    session.commit()

    def _fetcher(bucket: str, key: str) -> StorageObjectMetadata:
        return StorageObjectMetadata(
            content_length=1024,
            content_type="image/jpeg",
            etag=None,
            metadata={"owner": "999", "origin": "mobile"},
            exif=None,
        )

    repo = AssetRepository(
        session,
        bucket_name="journal-bucket",
        metadata_fetcher=_fetcher,
    )

    with pytest.raises(AssetMetadataValidationError):
        repo.resolve_for_processing("asset-10", expected_owner_id=88)


def test_resolve_for_processing_validates_origin_metadata(session: Session):
    session.add(
        _make_asset(
            "asset-11",
            owner_id=93,
            storage_key="s3://journal-bucket/journal/93/2025/11/photo.jpg",
        )
    )
    session.commit()

    def _fetcher(bucket: str, key: str) -> StorageObjectMetadata:
        return StorageObjectMetadata(
            content_length=1024,
            content_type="image/jpeg",
            etag=None,
            metadata={"owner": "93"},
            exif=None,
        )

    repo = AssetRepository(
        session,
        bucket_name="journal-bucket",
        metadata_fetcher=_fetcher,
    )

    with pytest.raises(AssetMetadataValidationError):
        repo.resolve_for_processing("asset-11", expected_owner_id=93)


def test_get_by_id_raises_when_missing(session: Session):
    repo = AssetRepository(session, bucket_name="journal-bucket")

    with pytest.raises(AssetNotFoundError):
        repo.get_by_id("missing")
