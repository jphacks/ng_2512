from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime, timezone

from sqlalchemy import select

import pytest
from sqlalchemy.orm import Session

from backend.database import Base, get_session_factory, init_engine
from backend.db import models
from backend.repositories import EmbeddingRepository, FaceEmbeddingCreate

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
    """Initialise an in-memory SQLite database for repository tests."""

    engine = init_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    session = get_session_factory()()
    try:
        yield session
    finally:
        session.close()


def _make_asset(asset_id: str, owner_id: int) -> models.Asset:
    return models.Asset(
        id=asset_id,
        owner_id=owner_id,
        content_type="image/jpeg",
        storage_key=f"s3://bucket/{asset_id}.jpg",
        created_at=datetime.now(tz=timezone.utc),
    )


def _image_vector(seed: float) -> list[float]:
    base = seed / 100.0
    return [base + (i * 0.0001) for i in range(768)]


def _face_vector(seed: float) -> list[float]:
    base = seed / 100.0
    return [base + (i * 0.0002) for i in range(512)]


def test_upsert_image_embedding_creates_and_updates(session: Session):
    session.add(_make_asset("asset-1", owner_id=101))
    session.commit()

    repo = EmbeddingRepository(session)

    created = repo.upsert_image_embedding("asset-1", model="clip@v1", embedding=_image_vector(1))
    session.commit()
    assert created.model == "clip@v1"

    updated = repo.upsert_image_embedding("asset-1", model="clip@v2", embedding=_image_vector(2))
    session.commit()
    assert updated.model == "clip@v2"
    session.refresh(updated)
    assert updated.embedding[0] == pytest.approx(_image_vector(2)[0])


def test_query_image_neighbors_filters_by_owner_and_model(session: Session):
    assets = [
        _make_asset("asset-a", owner_id=1),
        _make_asset("asset-b", owner_id=2),
        _make_asset("asset-c", owner_id=3),
    ]
    session.add_all(assets)
    session.flush()

    repo = EmbeddingRepository(session)
    repo.upsert_image_embedding("asset-a", model="clip@v1", embedding=_image_vector(5))
    repo.upsert_image_embedding("asset-b", model="clip@v1", embedding=_image_vector(6))
    repo.upsert_image_embedding("asset-c", model="clip@v2", embedding=_image_vector(7))
    session.commit()

    results = repo.query_image_neighbors(
        _image_vector(5),
        limit=10,
        owner_ids=[1, 2],
        model="clip@v1",
    )

    assert [result.asset_id for result in results] == ["asset-a", "asset-b"]
    assert all(result.model == "clip@v1" for result in results)
    assert all(result.owner_id in {1, 2} for result in results)
    assert results[0].score >= results[1].score


def test_replace_face_embeddings_clears_existing_rows(session: Session):
    session.add(_make_asset("asset-face", owner_id=9))
    session.commit()

    repo = EmbeddingRepository(session)
    repo.add_face_embedding("asset-face", embedding=_face_vector(10), bbox={"id": "old-1"})
    repo.add_face_embedding("asset-face", embedding=_face_vector(11), bbox={"id": "old-2"})
    session.commit()

    replacements = [
        FaceEmbeddingCreate(embedding=_face_vector(21), bbox={"id": "new-1"}),
        FaceEmbeddingCreate(embedding=_face_vector(22), bbox={"id": "new-2"}),
    ]
    repo.replace_face_embeddings("asset-face", replacements)
    session.commit()

    face_rows = session.execute(
        select(models.FaceEmbedding).where(models.FaceEmbedding.asset_id == "asset-face")
    ).scalars().all()
    assert len(face_rows) == 2
    assert {row.bbox["id"] for row in face_rows} == {"new-1", "new-2"}


def test_query_face_neighbors_scopes_results(session: Session):
    session.add_all(
        [
            _make_asset("asset-1", owner_id=1),
            _make_asset("asset-2", owner_id=2),
        ]
    )
    session.commit()

    repo = EmbeddingRepository(session)
    face_a = repo.add_face_embedding("asset-1", embedding=_face_vector(1), bbox={"box_id": "A"})
    face_b = repo.add_face_embedding("asset-1", embedding=_face_vector(2), bbox={"box_id": "B"})
    _ = repo.add_face_embedding("asset-2", embedding=_face_vector(50), bbox={"box_id": "C"})
    session.commit()

    results = repo.query_face_neighbors(
        _face_vector(1),
        owner_ids=[1],
        exclude_face_ids=[face_b.id],
    )

    assert len(results) == 1
    assert results[0].face_id == face_a.id
    assert results[0].bbox["box_id"] == "A"
    assert results[0].owner_id == 1


def test_delete_face_embeddings_by_ids(session: Session):
    session.add(_make_asset("asset-99", owner_id=99))
    session.commit()

    repo = EmbeddingRepository(session)
    face_1 = repo.add_face_embedding("asset-99", embedding=_face_vector(5))
    face_2 = repo.add_face_embedding("asset-99", embedding=_face_vector(6))
    session.commit()

    deleted = repo.delete_face_embeddings([face_1.id, face_2.id])
    session.commit()

    assert deleted == 2
    remaining = session.execute(
        select(models.FaceEmbedding).where(models.FaceEmbedding.asset_id == "asset-99")
    ).scalars().all()
    assert remaining == []
