from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pgvector.sqlalchemy import Vector
from sqlalchemy import BigInteger, Boolean, Date, DateTime, ForeignKey, String, Text, func
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


class ThemeVocabSet(Base):
    """Vocab set grouping per locale/version."""

    __tablename__ = "theme_vocab_sets"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    lang: Mapped[str] = mapped_column(String, nullable=False, default="ja")
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    activated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    vocab_items: Mapped[list["ThemeVocab"]] = relationship(
        back_populates="vocab_set",
        cascade="all, delete-orphan",
    )


class ThemeVocab(Base):
    """Individual vocab entries within a set."""

    __tablename__ = "theme_vocab"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    set_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("theme_vocab_sets.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String, nullable=False)
    normalized: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    vocab_set: Mapped[ThemeVocabSet] = relationship(back_populates="vocab_items")
    embeddings: Mapped[list["ThemeEmbedding"]] = relationship(
        back_populates="vocab",
        cascade="all, delete-orphan",
    )
    suggestions: Mapped[list["ThemeSuggestion"]] = relationship(
        back_populates="selected_vocab",
        cascade="all, delete-orphan",
        foreign_keys="ThemeSuggestion.selected_id",
    )


class ThemeEmbedding(Base):
    """Embedding vectors per vocab entry and model version."""

    __tablename__ = "theme_embeddings"

    theme_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("theme_vocab.id", ondelete="CASCADE"),
        primary_key=True,
    )
    model: Mapped[str] = mapped_column(String, primary_key=True)
    embedding: Mapped[list[float]] = mapped_column(Vector(768), nullable=False)
    current: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    vocab: Mapped[ThemeVocab] = relationship(back_populates="embeddings")


class ThemeSuggestion(Base):
    """Audit log for theme suggestions served to users."""

    __tablename__ = "theme_suggestions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    asset_id: Mapped[str | None] = mapped_column(
        String,
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
    )
    set_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("theme_vocab_sets.id", ondelete="SET NULL"),
        nullable=True,
    )
    model: Mapped[str] = mapped_column(String, nullable=False)
    topk: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    selected_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("theme_vocab.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    asset: Mapped[Asset | None] = relationship()
    vocab_set: Mapped[ThemeVocabSet | None] = relationship()
    selected_vocab: Mapped[ThemeVocab | None] = relationship(back_populates="suggestions", foreign_keys=[selected_id])


class JournalEntry(Base):
    """User-authored journal entries capturing memorable moments."""

    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    photo_path: Mapped[str] = mapped_column(Text, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    tags: Mapped[list["JournalEntryTag"]] = relationship(
        back_populates="entry",
        cascade="all, delete-orphan",
    )


class JournalEntryTag(Base):
    """Mapping of tagged friends associated with a journal entry."""

    __tablename__ = "journal_entry_tags"

    entry_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("journal_entries.id", ondelete="CASCADE"),
        primary_key=True,
    )
    tagged_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )

    entry: Mapped[JournalEntry] = relationship(back_populates="tags")


__all__ = [
    "Asset",
    "ImageEmbedding",
    "FaceEmbedding",
    "ThemeVocabSet",
    "ThemeVocab",
    "ThemeEmbedding",
    "ThemeSuggestion",
    "JournalEntry",
    "JournalEntryTag",
]
