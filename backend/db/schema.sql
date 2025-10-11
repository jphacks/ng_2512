-- FL.1.1 — Embeddings DB schema (assets / image_embeddings / face_embeddings)

-- Enable pgvector extension for vector operations.
CREATE EXTENSION IF NOT EXISTS vector;

-- Core asset metadata (ULID stored as text).
CREATE TABLE IF NOT EXISTS assets (
  id           TEXT PRIMARY KEY,
  owner_id     BIGINT NOT NULL,
  content_type TEXT NOT NULL,
  storage_key  TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Global image embedding keyed by asset.
CREATE TABLE IF NOT EXISTS image_embeddings (
  asset_id   TEXT PRIMARY KEY REFERENCES assets(id) ON DELETE CASCADE,
  model      TEXT NOT NULL,
  embedding  VECTOR(768) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per-face embeddings for an asset (ArcFace etc.).
CREATE TABLE IF NOT EXISTS face_embeddings (
  id         BIGSERIAL PRIMARY KEY,
  asset_id   TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
  bbox       JSONB,
  embedding  VECTOR(512) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- IVF indexes for approximate nearest neighbour search.
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS image_embeddings_ivf
    ON image_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
EXCEPTION WHEN undefined_object THEN
  -- The vector operators are unavailable (extension missing); skip index creation.
  NULL;
END $$;

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS face_embeddings_ivf
    ON face_embeddings USING ivfflat (embedding vector_ip_ops) WITH (lists = 100);
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;
