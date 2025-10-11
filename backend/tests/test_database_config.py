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


def test_schema_sql_contains_assets_section():
    sql_path = Path("backend/db/schema.sql")
    sql = sql_path.read_text(encoding="utf-8")

    assert "CREATE EXTENSION IF NOT EXISTS vector" in sql
    assert "CREATE TABLE IF NOT EXISTS assets" in sql
    assert "CREATE TABLE IF NOT EXISTS image_embeddings" in sql
    assert "CREATE TABLE IF NOT EXISTS face_embeddings" in sql
