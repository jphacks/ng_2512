from __future__ import annotations

from pathlib import Path

import pytest
from pgvector.sqlalchemy import Vector

from backend import config
from backend.database import get_engine, init_engine
from backend.db import models


@pytest.fixture(autouse=True)
def reset_settings(monkeypatch):
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.delenv("DB_POOL_PRE_PING", raising=False)
    monkeypatch.delenv("SQLALCHEMY_ECHO", raising=False)
    config.reset_settings_cache()
    yield
    config.reset_settings_cache()


def test_get_settings_defaults_to_sqlite():
    settings = config.get_settings()
    assert settings.database_url.startswith("sqlite+pysqlite://")
    assert settings.pool_pre_ping is True
    assert settings.echo_sql is False


def test_get_settings_uses_environment(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@localhost:5432/recall")
    monkeypatch.setenv("DB_POOL_PRE_PING", "0")
    monkeypatch.setenv("SQLALCHEMY_ECHO", "1")

    config.reset_settings_cache()
    settings = config.get_settings()

    assert settings.database_url.startswith("postgresql+psycopg://")
    assert settings.pool_pre_ping is False
    assert settings.echo_sql is True


def test_init_engine_returns_engine():
    engine = init_engine("sqlite+pysqlite:///:memory:")
    assert engine is get_engine()
    assert engine.url.get_backend_name() == "sqlite"


def test_models_define_expected_columns():
    asset = models.Asset.__table__
    assert asset.c.id.primary_key
    assert not asset.c.owner_id.nullable
    assert not asset.c.storage_key.nullable
    assert asset.c.created_at.server_default is not None

    image_embedding = models.ImageEmbedding.__table__
    asset_fk = next(iter(image_embedding.c.asset_id.foreign_keys))
    assert asset_fk.column.table.name == "assets"
    assert isinstance(image_embedding.c.embedding.type, Vector)
    assert image_embedding.c.embedding.type.dim == 768

    face_embedding = models.FaceEmbedding.__table__
    assert isinstance(face_embedding.c.embedding.type, Vector)
    assert face_embedding.c.embedding.type.dim == 512
    face_asset_fk = next(iter(face_embedding.c.asset_id.foreign_keys))
    assert face_asset_fk.column.table.name == "assets"

    journal_entry = models.JournalEntry.__table__
    assert journal_entry.c.user_id.nullable is False
    assert journal_entry.c.photo_path.nullable is False
    assert journal_entry.c.entry_date.nullable is False
    assert journal_entry.c.created_at.server_default is not None
    entry_user_fk = next(iter(journal_entry.c.user_id.foreign_keys))
    assert entry_user_fk.column.table.name == "users"

    journal_entry_tag = models.JournalEntryTag.__table__
    assert journal_entry_tag.c.entry_id.nullable is False
    assert journal_entry_tag.c.tagged_user_id.nullable is False
    assert set(journal_entry_tag.primary_key.columns.keys()) == {"entry_id", "tagged_user_id"}
    tag_entry_fk = next(iter(journal_entry_tag.c.entry_id.foreign_keys))
    assert tag_entry_fk.column.table.name == "journal_entries"
    tag_user_fk = next(iter(journal_entry_tag.c.tagged_user_id.foreign_keys))
    assert tag_user_fk.column.table.name == "users"


def test_theme_vocab_models_structure():
    vocab_set = models.ThemeVocabSet.__table__
    assert vocab_set.c.code.unique
    assert not vocab_set.c.lang.nullable
    assert vocab_set.c.is_active.default is not None

    vocab = models.ThemeVocab.__table__
    fk = next(iter(vocab.c.set_id.foreign_keys))
    assert fk.column.table.name == "theme_vocab_sets"
    assert vocab.c.name.nullable is False

    embedding = models.ThemeEmbedding.__table__
    assert isinstance(embedding.c.embedding.type, Vector)
    assert embedding.c.embedding.type.dim == 768
    assert list(embedding.primary_key.columns.keys()) == ["theme_id", "model"]

    suggestion = models.ThemeSuggestion.__table__
    assert suggestion.c.topk.nullable is False
    assert suggestion.c.model.nullable is False


def test_schema_sql_contains_theme_vocab_section():
    sql_path = Path("backend/db/schema.sql")
    sql = sql_path.read_text(encoding="utf-8")

    assert "CREATE EXTENSION IF NOT EXISTS vector" in sql
    assert "CREATE TABLE IF NOT EXISTS assets" in sql
    assert "CREATE TABLE IF NOT EXISTS image_embeddings" in sql
    assert "CREATE TABLE IF NOT EXISTS face_embeddings" in sql
    assert "CREATE TABLE IF NOT EXISTS theme_vocab_sets" in sql
    assert "CREATE TABLE IF NOT EXISTS theme_vocab" in sql
    assert "CREATE TABLE IF NOT EXISTS theme_embeddings" in sql
    assert "CREATE TABLE IF NOT EXISTS theme_suggestions" in sql
    assert "CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_vocab_set_per_lang" in sql
    assert "CREATE TABLE IF NOT EXISTS journal_entries" in sql
    assert "CREATE TABLE IF NOT EXISTS journal_entry_tags" in sql
    assert "CREATE INDEX IF NOT EXISTS journal_entries_user_entry_date_idx" in sql
    assert "CREATE INDEX IF NOT EXISTS journal_entry_tags_tagged_user_idx" in sql
