from __future__ import annotations

from datetime import datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.database import Base

try:  # pragma: no cover - SQLAlchemy always ships with this dialect, but guard anyway
    from sqlalchemy.dialects.postgresql import JSONB
except Exception:  # pragma: no cover
    from sqlalchemy.types import JSON as JSONB  # type: ignore


class Asset(Base):
    """Object storage asset metadata."""

    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[int] = mapped_column(BigInteger, nullable=False)
    content_type: Mapped[str] = mapped_column(String, nullable=False)
    storage_key: Mapped[str] = mapped_column(String, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    image_embedding: Mapped["ImageEmbedding | None"] = relationship(
        back_populates="asset",
        cascade="all, delete-orphan",
        uselist=False,
    )
    face_embeddings: Mapped[list["FaceEmbedding"]] = relationship(
        back_populates="asset",
        cascade="all, delete-orphan",
    )


class ImageEmbedding(Base):
    """Global image embedding (e.g. CLIP vector) keyed by asset."""

    __tablename__ = "image_embeddings"

    asset_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("assets.id", ondelete="CASCADE"),
        primary_key=True,
    )
    model: Mapped[str] = mapped_column(String, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(768), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    asset: Mapped[Asset] = relationship(back_populates="image_embedding")


class FaceEmbedding(Base):
    """Per-face embedding for an asset, typically produced by ArcFace."""

    __tablename__ = "face_embeddings"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    asset_id: Mapped[str] = mapped_column(
        String,
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
    )
    bbox: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    embedding: Mapped[list[float]] = mapped_column(Vector(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    asset: Mapped[Asset] = relationship(back_populates="face_embeddings")


__all__ = ["Asset", "ImageEmbedding", "FaceEmbedding"]
