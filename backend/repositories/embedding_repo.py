from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from math import sqrt
from typing import Iterable, Mapping, Sequence

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.db import models


@dataclass(frozen=True)
class ImageNeighbor:
    """Result container for an image embedding nearest-neighbour search."""

    asset_id: str
    owner_id: int
    model: str
    score: float
    distance: float
    created_at: datetime


@dataclass(frozen=True)
class FaceNeighbor:
    """Result container for a face embedding nearest-neighbour search."""

    face_id: int
    asset_id: str
    owner_id: int
    score: float
    distance: float
    bbox: Mapping[str, object] | None
    created_at: datetime


@dataclass(frozen=True)
class FaceEmbeddingCreate:
    """Payload for creating or replacing face embeddings on an asset."""

    embedding: Sequence[float]
    bbox: Mapping[str, object] | None = None


class EmbeddingRepository:
    """Repository encapsulating CRUD and KNN search for embeddings."""

    def __init__(self, session: Session):
        self._session = session

    # ------------------------------------------------------------------
    # Image embeddings
    # ------------------------------------------------------------------
    def upsert_image_embedding(self, asset_id: str, *, model: str, embedding: Sequence[float]) -> models.ImageEmbedding:
        """Create or update the image embedding for an asset.

        The table is keyed by ``asset_id`` so we simply update the record in-place
        if it already exists. The caller is responsible for committing the session.
        """

        embedding_values = _normalise_vector(embedding)
        record = self._session.get(models.ImageEmbedding, asset_id)
        if record is None:
            record = models.ImageEmbedding(asset_id=asset_id, model=model, embedding=embedding_values)
            self._session.add(record)
        else:
            record.model = model
            record.embedding = embedding_values
        return record

    def delete_image_embedding(self, asset_id: str) -> int:
        """Delete the image embedding associated with *asset_id*."""

        stmt = delete(models.ImageEmbedding).where(models.ImageEmbedding.asset_id == asset_id)
        result = self._session.execute(stmt)
        return result.rowcount or 0

    def query_image_neighbors(
        self,
        query_embedding: Sequence[float],
        *,
        limit: int = 20,
        owner_ids: Iterable[int] | None = None,
        exclude_asset_ids: Iterable[str] | None = None,
        model: str | None = None,
    ) -> list[ImageNeighbor]:
        """Return nearest image embeddings subject to optional filters.

        - ``owner_ids`` restricts the search to assets owned by the given users
          (e.g. requester + friends).
        - ``exclude_asset_ids`` can be used to omit already-selected assets.
        - ``model`` filters rows by the embedding model identifier.
        """

        limit = max(int(limit), 0)
        if limit == 0:
            return []

        owner_filter = set(owner_ids or [])
        if owner_ids is not None and not owner_filter:
            return []

        excluded_assets = {asset_id for asset_id in (exclude_asset_ids or [])}

        base_stmt = select(models.ImageEmbedding, models.Asset.owner_id).join(
            models.Asset, models.Asset.id == models.ImageEmbedding.asset_id
        )
        if owner_filter:
            base_stmt = base_stmt.where(models.Asset.owner_id.in_(owner_filter))
        if excluded_assets:
            base_stmt = base_stmt.where(~models.ImageEmbedding.asset_id.in_(excluded_assets))
        if model:
            base_stmt = base_stmt.where(models.ImageEmbedding.model == model)

        query_vec = _normalise_vector(query_embedding)

        if _supports_pgvector(self._session):
            distance_expr = models.ImageEmbedding.embedding.l2_distance(query_vec).label("distance")
            stmt = (
                base_stmt.add_columns(distance_expr)
                .order_by(distance_expr, models.ImageEmbedding.created_at.desc(), models.ImageEmbedding.asset_id)
                .limit(limit)
            )
            rows = self._session.execute(stmt).all()
            results: list[ImageNeighbor] = []
            for embedding_row, owner_id, distance in rows:
                distance_value = float(distance)
                created_at = embedding_row.created_at or datetime.fromtimestamp(0, tz=timezone.utc)
                results.append(
                    ImageNeighbor(
                        asset_id=embedding_row.asset_id,
                        owner_id=owner_id,
                        model=embedding_row.model,
                        score=_l2_score(distance_value),
                        distance=distance_value,
                        created_at=created_at,
                    )
                )
            results.sort(key=_image_sort_key)
            return results

        rows = self._session.execute(base_stmt).all()
        if not rows:
            return []

        results: list[ImageNeighbor] = []
        for embedding_row, owner_id in rows:
            distance_value = _l2_distance(query_vec, embedding_row.embedding)
            created_at = embedding_row.created_at or datetime.fromtimestamp(0, tz=timezone.utc)
            results.append(
                ImageNeighbor(
                    asset_id=embedding_row.asset_id,
                    owner_id=owner_id,
                    model=embedding_row.model,
                    score=_l2_score(distance_value),
                    distance=distance_value,
                    created_at=created_at,
                )
            )

        results.sort(key=_image_sort_key)
        return results[:limit]

    # ------------------------------------------------------------------
    # Face embeddings
    # ------------------------------------------------------------------
    def add_face_embedding(
        self,
        asset_id: str,
        *,
        embedding: Sequence[float],
        bbox: Mapping[str, object] | None = None,
    ) -> models.FaceEmbedding:
        """Create a new face embedding row for *asset_id*."""

        record = models.FaceEmbedding(
            asset_id=asset_id,
            bbox=dict(bbox) if bbox is not None else None,
            embedding=_normalise_vector(embedding),
        )
        self._session.add(record)
        return record

    def replace_face_embeddings(self, asset_id: str, faces: Sequence[FaceEmbeddingCreate]) -> list[models.FaceEmbedding]:
        """Replace all face embeddings for *asset_id* with *faces*."""

        self.delete_face_embeddings_for_asset(asset_id)
        replacements: list[models.FaceEmbedding] = []
        for face in faces:
            replacements.append(
                models.FaceEmbedding(
                    asset_id=asset_id,
                    bbox=dict(face.bbox) if face.bbox is not None else None,
                    embedding=_normalise_vector(face.embedding),
                )
            )
        self._session.add_all(replacements)
        return replacements

    def delete_face_embeddings_for_asset(self, asset_id: str) -> int:
        """Delete all face embeddings associated with *asset_id*."""

        stmt = delete(models.FaceEmbedding).where(models.FaceEmbedding.asset_id == asset_id)
        result = self._session.execute(stmt)
        return result.rowcount or 0

    def delete_face_embeddings(self, face_ids: Iterable[int]) -> int:
        """Delete specific face embeddings by their primary keys."""

        ids = {int(face_id) for face_id in face_ids}
        if not ids:
            return 0
        stmt = delete(models.FaceEmbedding).where(models.FaceEmbedding.id.in_(ids))
        result = self._session.execute(stmt)
        return result.rowcount or 0

    def query_face_neighbors(
        self,
        query_embedding: Sequence[float],
        *,
        limit: int = 20,
        owner_ids: Iterable[int] | None = None,
        asset_ids: Iterable[str] | None = None,
        include_face_ids: Iterable[int] | None = None,
        exclude_face_ids: Iterable[int] | None = None,
    ) -> list[FaceNeighbor]:
        """Return nearest face embeddings with optional scoping filters."""

        limit = max(int(limit), 0)
        if limit == 0:
            return []

        owner_filter = set(owner_ids or [])
        if owner_ids is not None and not owner_filter:
            return []

        asset_filter = set(asset_ids or [])
        includes = {int(face_id) for face_id in (include_face_ids or [])}
        excludes = {int(face_id) for face_id in (exclude_face_ids or [])}
        if includes and excludes:
            includes -= excludes
        if includes == set():
            includes = set()

        stmt = select(models.FaceEmbedding, models.Asset.owner_id).join(
            models.Asset, models.Asset.id == models.FaceEmbedding.asset_id
        )
        if owner_filter:
            stmt = stmt.where(models.Asset.owner_id.in_(owner_filter))
        if asset_filter:
            stmt = stmt.where(models.FaceEmbedding.asset_id.in_(asset_filter))
        if includes:
            stmt = stmt.where(models.FaceEmbedding.id.in_(includes))
        if excludes:
            stmt = stmt.where(~models.FaceEmbedding.id.in_(excludes))

        query_vec = _normalise_vector(query_embedding)

        if _supports_pgvector(self._session):
            distance_expr = models.FaceEmbedding.embedding.max_inner_product_distance(query_vec).label("distance")
            stmt = (
                stmt.add_columns(distance_expr)
                .order_by(distance_expr, models.FaceEmbedding.created_at.desc(), models.FaceEmbedding.id)
                .limit(limit)
            )
            rows = self._session.execute(stmt).all()
            results: list[FaceNeighbor] = []
            for face_row, owner_id, distance in rows:
                distance_value = float(distance)
                created_at = face_row.created_at or datetime.fromtimestamp(0, tz=timezone.utc)
                results.append(
                    FaceNeighbor(
                        face_id=face_row.id,
                        asset_id=face_row.asset_id,
                        owner_id=owner_id,
                        score=_inner_product_score(distance_value),
                        distance=distance_value,
                        bbox=face_row.bbox,
                        created_at=created_at,
                    )
                )
            results.sort(key=_face_sort_key)
            return results

        rows = self._session.execute(stmt).all()
        if not rows:
            return []

        results: list[FaceNeighbor] = []
        for face_row, owner_id in rows:
            distance_value = _inner_product_distance(query_vec, face_row.embedding)
            created_at = face_row.created_at or datetime.fromtimestamp(0, tz=timezone.utc)
            results.append(
                FaceNeighbor(
                    face_id=face_row.id,
                    asset_id=face_row.asset_id,
                    owner_id=owner_id,
                    score=_inner_product_score(distance_value),
                    distance=distance_value,
                    bbox=face_row.bbox,
                    created_at=created_at,
                )
            )

        results.sort(key=_face_sort_key)
        return results[:limit]


def _normalise_vector(values: Sequence[float]) -> list[float]:
    """Convert a numeric sequence to a list of floats."""

    return [float(value) for value in values]


def _l2_distance(a: Sequence[float], b: Sequence[float]) -> float:
    return sqrt(sum((x - y) ** 2 for x, y in zip(a, b)))


def _inner_product_distance(a: Sequence[float], b: Sequence[float]) -> float:
    return -sum(x * y for x, y in zip(a, b))


def _l2_score(distance: float) -> float:
    return 1.0 / (1.0 + max(distance, 0.0))


def _inner_product_score(distance: float) -> float:
    return -distance


def _image_sort_key(item: ImageNeighbor) -> tuple[float, float, str]:
    return (-item.score, -_datetime_to_epoch(item.created_at), item.asset_id)


def _face_sort_key(item: FaceNeighbor) -> tuple[float, float, int]:
    return (-item.score, -_datetime_to_epoch(item.created_at), item.face_id)


def _datetime_to_epoch(value: datetime | None) -> float:
    if value is None:
        return 0.0
    if value.tzinfo is None:
        return value.timestamp()
    return value.astimezone(timezone.utc).timestamp()


def _supports_pgvector(session: Session) -> bool:
    bind = session.get_bind()
    if bind is None:
        return False
    return bind.dialect.name == "postgresql"
