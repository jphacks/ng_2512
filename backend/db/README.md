# Backend DB Schema

This directory stores the idempotent SQL definition for the auxiliary PostgreSQL database that powers the Flask AI service. The schema focuses on asset metadata and vector embeddings used by the image/face matching pipelines.

## Sections

- **FL.1.1 Assets / Embeddings** — `assets`, `image_embeddings`, `face_embeddings` tables plus pgvector indexes.

Each statement is written with `CREATE ... IF NOT EXISTS` so the file can be re-applied safely. When new tables or indexes are introduced, extend `schema.sql` while keeping idempotency.

## Applying the Schema

1. Ensure the `vector` extension is installed on the target PostgreSQL instance.
2. Run `psql "$DATABASE_URL" -f backend/db/schema.sql`.
3. Future tasks (theme vocabulary, journal entries, VLM observations, etc.) will append to this file following the same format.

The Flask application initialises SQLAlchemy via `backend/database.py`. ORM models for these tables live in `backend/db/models.py`.
