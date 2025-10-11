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

-- =============================================================
-- FL.1.2 — Theme Vocab / Embeddings / Suggestions
-- =============================================================

-- Vocabulary sets act as logical bundles for each locale/version.
CREATE TABLE IF NOT EXISTS theme_vocab_sets (
  id           BIGSERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  lang         TEXT NOT NULL DEFAULT 'ja',
  description  TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  activated_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Only one active set per locale to support rollout toggles.
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_vocab_set_per_lang
    ON theme_vocab_sets (lang)
    WHERE (is_active = true);
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Individual vocab entries scoped to a set.
CREATE TABLE IF NOT EXISTS theme_vocab (
  id         BIGSERIAL PRIMARY KEY,
  set_id     BIGINT NOT NULL REFERENCES theme_vocab_sets(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  normalized TEXT,
  tags       JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (set_id, name)
);

-- Embeddings per vocab item and model version.
CREATE TABLE IF NOT EXISTS theme_embeddings (
  theme_id   BIGINT NOT NULL REFERENCES theme_vocab(id) ON DELETE CASCADE,
  model      TEXT NOT NULL,
  embedding  VECTOR(768) NOT NULL,
  current    BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (theme_id, model)
);

-- Ensure only one embedding is marked current for a vocab entry.
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_current_theme_embed
    ON theme_embeddings (theme_id)
    WHERE (current = true);
EXCEPTION WHEN others THEN
  NULL;
END $$;

-- Optional IVF index for ANN search, skipped if vector ops unavailable.
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS theme_embeddings_ivf
    ON theme_embeddings USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
EXCEPTION WHEN undefined_object THEN
  NULL;
END $$;

-- Suggestion log for auditability and AB testing.
CREATE TABLE IF NOT EXISTS theme_suggestions (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT REFERENCES users(id),
  asset_id     TEXT REFERENCES assets(id) ON DELETE SET NULL,
  set_id       BIGINT REFERENCES theme_vocab_sets(id) ON DELETE SET NULL,
  model        TEXT NOT NULL,
  topk         JSONB NOT NULL,
  selected_id  BIGINT REFERENCES theme_vocab(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- FL.1.3 — Journal Entries / Tags
-- =============================================================

CREATE TABLE IF NOT EXISTS journal_entries (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_path TEXT NOT NULL,
  note       TEXT,
  entry_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS journal_entry_tags (
  entry_id       BIGINT NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  tagged_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tagged_user_id)
);

CREATE INDEX IF NOT EXISTS journal_entries_user_entry_date_idx
  ON journal_entries (user_id, entry_date DESC);

CREATE INDEX IF NOT EXISTS journal_entry_tags_tagged_user_idx
  ON journal_entry_tags (tagged_user_id);
